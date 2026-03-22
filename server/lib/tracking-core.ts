
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { routerService } from "./router-service";
import { generateS2SToken } from "../s2s";

export interface TrackingParams {
  projectCode: string;
  countryCode: string;
  supplierCode?: string;
  supplierRid?: string;
  extraParams?: Record<string, string>;
  ip?: string;
  userAgent?: string;
}

export interface TrackingResult {
  redirectUrl?: string;
  error?: {
    status: number;
    message: string;
    internalRedirect?: string;
  };
}

export async function processTrackingRequest(params: TrackingParams): Promise<TrackingResult> {
  const projectCode = params.projectCode?.toUpperCase();
  const countryCode = params.countryCode?.toUpperCase();
  const { extraParams = {} } = params;
  const supplierCode = (params.supplierCode || "DIRECT").toUpperCase();
  const supplierRid = params.supplierRid || `DIR-${randomUUID().split('-')[0]}`;

  console.log(`[TrackingCore] Processing: project=${projectCode}, country=${countryCode}, sup=${supplierCode}, rid=${supplierRid}`);

  try {
    // 1. Validate Project
    const project = await storage.getProjectByCode(projectCode);
    if (!project) {
      console.warn(`[TrackingCore] Project NOT FOUND: ${projectCode}`);
      return { error: { status: 404, message: "Project not found or inactive" } };
    }
    
    if (project.status !== 'active') {
      console.warn(`[TrackingCore] Project INACTIVE: ${projectCode}, status=${project.status}`);
      return { error: { status: 404, message: "Project not found or inactive" } };
    }

    console.log(`[TrackingCore] Project valid: ${project.projectName}`);

    // 2. Validate Supplier ONLY if sup param was provided
    if (params.supplierCode) {
      const supplier = await storage.getSupplierByCode(supplierCode);
      if (!supplier) {
        return { error: { status: 404, message: "Supplier not found" } };
      }
    }

    // 3. Validate Country Survey
    console.log(`[TrackingCore] Fetching country survey for ${projectCode}/${countryCode}...`);
    const countrySurvey = await storage.getCountrySurveyByCode(projectCode, countryCode);
    console.log(`[TrackingCore] Country survey: ${!!countrySurvey}`);
    if (!countrySurvey || countrySurvey.status !== 'active') {
      return { error: { status: 404, message: "Survey not found for this country" } };
    }

    // 4. Check for Duplicates
    console.log(`[TrackingCore] Checking duplicates for ${supplierRid}...`);
    const isDuplicate = await storage.checkDuplicateRespondent(projectCode, supplierCode, supplierRid);
    console.log(`[TrackingCore] isDuplicate: ${isDuplicate}`);
    if (isDuplicate) {
      const oiSessionForLog = randomUUID();
      await storage.createActivityLog({
        oiSession: oiSessionForLog,
        projectCode,
        eventType: 'duplicate_entry',
        meta: { details: `Duplicate RID detected: ${supplierRid} for ${supplierCode} on ${projectCode}` }
      });

      const redirectParams = new URLSearchParams({
        pid: projectCode,
        uid: supplierRid,
      });
      return { 
        error: { 
          status: 302, 
          message: "Duplicate entry", 
          internalRedirect: `${routerService.internalPathMap['duplicate']}?${redirectParams.toString()}` 
        } 
      };
    }

    // 5. Generate Client RID (Atomic)
    let clientRid: string = "";
    console.log(`[TrackingCore] Generating client RID...`);
    try {
      clientRid = await storage.generateClientRID(projectCode);
    } catch (ridErr: any) {
      console.error("RID generation error:", ridErr);
    }

    if (!clientRid || clientRid.trim() === '') {
      console.warn(`[TrackingCore] RID generation failed or returned blank, using fallback.`);
      const prefix = project.ridPrefix || "OPI";
      const cc = project.ridCountryCode || "XX";
      clientRid = `${prefix}${cc}${Date.now().toString().slice(-6)}`;
    }

    // 6. Create Respondent Session
    const oiSession = randomUUID();
    
    // S2S Generation
    let s2sToken: string | null = null;
    console.log(`[TrackingCore] Fetching S2S config...`);
    const s2sConfig = await storage.getS2sConfig(projectCode);
    console.log(`[TrackingCore] S2S config: ${!!s2sConfig}`);
    
    if (s2sConfig && s2sConfig.requireS2S) {
      s2sToken = generateS2SToken(oiSession, s2sConfig.s2sSecret);
    }

    // 7. Build survey URL
    let redirectUrl = countrySurvey.surveyUrl;
    const handledKeys = ['code', 'country', 'sup', 'uid', 'rid', 'toid', 'zid', 'pid', 'mid', 'sid'];
    const usedParams = new Set<string>();

    // Standard replacements
    const standardReplacements = [
      { tags: ["{RID}", "[RID]", "{rid}", "[rid]", "{UID}", "[UID]", "{uid}", "[uid]", "%7BRID%7D", "%5BRID%5D", "%7Brid%7D", "%5Brid%5D", "%7BUID%7D", "%5BUID%5D", "%7Buid%7D", "%5Buid%5D"], value: clientRid },
      { tags: ["{oi_session}", "{session}", "[session]"], value: oiSession }
    ];

    standardReplacements.forEach(group => {
      group.tags.forEach(tag => {
        if (redirectUrl.includes(tag)) {
          redirectUrl = redirectUrl.replaceAll(tag, group.value);
          // If we replaced a tag that matches a common key name, mark it as handled
          const baseKey = tag.replace(/[{}\[\]]/g, '').toLowerCase();
          if (handledKeys.includes(baseKey)) usedParams.add(baseKey);
        }
      });
    });

    // Handle extraParams placeholders
    Object.entries(extraParams).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const keyLower = key.toLowerCase();
        const tags = [`{${key}}`, `[${key}]`, `{${keyLower}}`, `[${keyLower}]` ];
        let found = false;
        tags.forEach(tag => {
          if (redirectUrl.includes(tag)) {
            redirectUrl = redirectUrl.replaceAll(tag, value);
            found = true;
          }
        });
        if (found) usedParams.add(keyLower);
      }
    });

    // 8. Final URL Assembly
    const finalUrlObj = new URL(redirectUrl);
    Object.entries(extraParams).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      // Only append if it wasn't used as a placeholder AND it's not a core tracking param we already handled
      if (!usedParams.has(keyLower) && !handledKeys.includes(keyLower) && typeof value === 'string') {
        finalUrlObj.searchParams.set(key, value);
      }
    });
    redirectUrl = finalUrlObj.toString();

    if (s2sToken) {
      const separator = redirectUrl.includes('?') ? '&' : '?';
      redirectUrl += `${separator}s2s_token=${s2sToken}`;
    }

    if (!redirectUrl.includes("oi_session=")) {
      const separator = redirectUrl.includes('?') ? '&' : '?';
      redirectUrl += `${separator}oi_session=${oiSession}`;
    }

    // 9. Cleanup unresolved placeholders (e.g., {sid}, [zip]) to avoid broken client links
    redirectUrl = redirectUrl.replace(/\{[a-zA-Z0-9_-]+\}/g, "");
    redirectUrl = redirectUrl.replace(/\[[a-zA-Z0-9_-]+\]/g, "");
    
    // Final URL sanitization for empty param values caused by cleanup (e.g., &sid=)
    redirectUrl = redirectUrl.replace(/[\?&][a-zA-Z0-9_-]+=($|&)/g, (match) => {
      return match.endsWith('&') ? match.charAt(0) : "";
    });

    // 8. Save respondent
    console.log(`[TrackingCore] Saving respondent ${oiSession}...`);
    await storage.createRespondent({
      oiSession,
      projectCode,
      supplierCode,
      supplierRid,
      clientRid,
      status: 'started',
      surveyUrl: redirectUrl,
      ipAddress: params.ip || null,
      userAgent: params.userAgent || null,
      s2sToken,
      s2sVerified: false,
      fraudScore: 0,
      extraParams,
    });
    console.log(`[TrackingCore] Respondent saved. Redirection pending.`);

    return { redirectUrl };

  } catch (err) {
    console.error("Tracking Error:", err);
    return { error: { status: 500, message: "Internal Server Error" } };
  }
}
