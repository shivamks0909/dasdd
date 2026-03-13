import { NextRequest, NextResponse } from "next/server";
import { storage } from "@server/storage";
import { randomUUID } from "crypto";
import { generateS2SToken } from "@server/s2s";

export async function handleTracking(req: NextRequest, projectCodeParam?: string) {
  const { searchParams } = new URL(req.url);
  const code = projectCodeParam || searchParams.get("code");
  const country = searchParams.get("country");
  const sup = searchParams.get("sup");
  const uid = searchParams.get("uid");

  if (!code || !country) {
    return NextResponse.json(
      { error: `Missing tracking parameters (code: ${code}, country: ${country})` },
      { status: 400 }
    );
  }

  const projectCode = code;
  const countryCode = country;
  const oiSession = randomUUID();

  const extraParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (!['code', 'country', 'sup', 'uid'].includes(key)) {
      extraParams[key] = value;
    }
  });

  const supplierCode = sup || "DIRECT";
  
  // UID Sanitization
  let rawUid = uid;
  const SANITY_PLACEHOLDERS = ['n/a', '[uid]', '{uid}', '[rid]', '{rid}', 'null', 'undefined', ''];
  if (rawUid && SANITY_PLACEHOLDERS.includes(rawUid.toLowerCase().trim())) {
    rawUid = ""; // treat as missing
  }
  const supplierRid = rawUid || `DIR-${oiSession.split('-')[0]}`;

  try {
    // 1. Validate Project and Supplier
    console.log(`[Tracking] Querying project by code: ${projectCode}`);
    const project = await storage.getProjectByCode(projectCode);
    if (!project || project.status !== "active") {
      console.log(`Tracking 404: Project not found or inactive. Code: ${projectCode}`);
      return NextResponse.json(
        { error: `Project not found or inactive (code: ${projectCode})` },
        { status: 404 }
      );
    }

    console.log(`[Tracking] Querying supplier by code: ${supplierCode}`);
    const supplier = await storage.getSupplierByCode(supplierCode);
    if (!supplier) {
      console.log(`Tracking 404: Supplier not found. Code: ${supplierCode}`);
      return NextResponse.json(
        { error: `Supplier not found (code: ${supplierCode})` },
        { status: 404 }
      );
    }

    // 3. Get Country Survey
    console.log(`[Tracking] Looking for survey: project=${projectCode}, country=${countryCode}`);
    const countrySurvey = await storage.getCountrySurveyByCode(projectCode, countryCode);
    
    if (!countrySurvey) {
      console.log(`[Tracking] Error: Survey not found for project=${projectCode}, country=${countryCode}`);
      return NextResponse.json(
        { error: `Survey not found for this country (code: ${projectCode}, country: ${countryCode})` },
        { status: 404 }
      );
    }
    console.log(`[Tracking] Found survey: ${countrySurvey.id}, URL: ${countrySurvey.surveyUrl}`);
    const isDuplicate = await storage.checkDuplicateRespondent(projectCode, supplierCode, supplierRid);
    const currentTimeUnix = Math.floor(Date.now() / 1000).toString();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    if (isDuplicate) {
      const oiSession = randomUUID();
      await storage.createActivityLog({
        oiSession,
        projectCode,
        eventType: "duplicate_entry",
        meta: { details: `Duplicate RID detected: ${supplierRid} for ${supplierCode} on ${projectCode}` }
      });

      const params = new URLSearchParams({
        pid: projectCode,
        uid: supplierRid,
        ip: ip,
        start: currentTimeUnix,
        end: currentTimeUnix,
        loi: "0",
        status: "Duplicate",
        country: countryCode
      });
      return NextResponse.redirect(new URL(`/pages/duplicate?${params.toString()}`, req.url));
    }

    // 4. Generate Client RID (Atomic)
    const clientRid = await storage.generateClientRID(projectCode);

    // 5. Create Respondent Session
    // oiSession is already declared above

    
    // S2S Generation
    let s2sToken = null;
    const s2sConfig = await storage.getS2sConfig(projectCode);
    
    if (s2sConfig && s2sConfig.requireS2S) {
      s2sToken = generateS2SToken(oiSession, s2sConfig.s2sSecret);
    }

    await storage.createRespondent({
      oiSession,
      projectCode,
      supplierCode,
      supplierRid,
      countryCode,
      clientRid,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent") || "unknown",
      status: "started",
      s2sToken: s2sToken || undefined,
      fraudScore: 0,
      s2sVerified: false
    });

    // 6. Log Entry
    await storage.createActivityLog({
      oiSession,
      projectCode,
      eventType: "entry",
      meta: { details: `Respondent started. Redirecting to client survey.` }
    });

    // 7. Redirect to Client Survey URL — inject clientRid and arbitrary params
    let redirectUrl = countrySurvey.surveyUrl
      .replaceAll("{RID}", clientRid)
      .replaceAll("[RID]", clientRid)
      .replaceAll("{rid}", clientRid)
      .replaceAll("{uid}", clientRid)
      .replaceAll("[UID]", clientRid)
      .replaceAll("{oi_session}", oiSession);

    // Support arbitrary parameters from query string
    const usedParams = new Set<string>(["country", "sup", "uid", "code"]);
    Object.entries(extraParams).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      const hasPlaceholder = 
        redirectUrl.includes(`{${key}}`) || 
        redirectUrl.includes(`[${key}]`) ||
        redirectUrl.includes(`{${keyLower}}`) ||
        redirectUrl.includes(`[${keyLower}]`);
      
      if (hasPlaceholder) {
        redirectUrl = redirectUrl
          .replaceAll(`{${key}}`, value)
          .replaceAll(`[${key}]`, value)
          .replaceAll(`{${keyLower}}`, value)
          .replaceAll(`[${keyLower}]`, value);
        usedParams.add(key);
      }
    });

    // Append unused extra params to query string
    try {
      const finalUrlObj = new URL(redirectUrl);
      Object.entries(extraParams).forEach(([key, value]) => {
        if (!usedParams.has(key)) {
          finalUrlObj.searchParams.set(key, value);
        }
      });
      redirectUrl = finalUrlObj.toString();
    } catch (urlErr) {
      console.error("Malformed survey URL during append:", redirectUrl);
    }

    if (s2sToken) {
      const separator = redirectUrl.includes("?") ? "&" : "?";
      redirectUrl += `${separator}s2s_token=${s2sToken}`;
    }

    // Append oi_session if not already in URL (match routes.ts)
    if (!redirectUrl.includes("oi_session=")) {
      const separator = redirectUrl.includes("?") ? "&" : "?";
      redirectUrl += `${separator}oi_session=${oiSession}`;
    }

    console.log(`Tracking: Redirecting to ${redirectUrl}`);
    return NextResponse.redirect(new URL(redirectUrl, req.url));

  } catch (err: any) {
    console.error("Tracking Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error during tracking" },
      { status: 500 }
    );
  }
}
