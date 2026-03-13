import { NextResponse } from "next/server";
import { storage } from "@server/storage";

export async function handleCallback(req: Request, status: string) {
  const url = new URL(req.url);
  const oi_session = url.searchParams.get("oi_session");

  if (!oi_session) {
    return new Response("Missing oi_session", { status: 400 });
  }

  const respondent = await storage.getRespondentBySession(oi_session);
  if (!respondent) {
    return new Response("Session not found", { status: 404 });
  }

  let finalStatus = status;

  // S2S Verification Check for completions
  if (status === 'complete') {
    const s2sConfig = await storage.getS2sConfig(respondent.projectCode || "");
    if (s2sConfig && s2sConfig.requireS2S && !respondent.s2sVerified) {
      finalStatus = 'security-terminate';
      await storage.createActivityLog({
        oiSession: respondent.oiSession,
        projectCode: respondent.projectCode,
        eventType: 'security_alert',
        meta: { details: `Fraud attempt blocked: Manual client complete without S2S verification.` }
      });
      await storage.updateRespondentStatus(respondent.oiSession, 'fraud');
    }
  }

  // Update Status if not already fraud/security
  if (finalStatus !== 'security-terminate') {
     await storage.updateRespondentStatus(respondent.oiSession, finalStatus);
  }

  // Log Activity
  await storage.createActivityLog({
    oiSession: respondent.oiSession,
    projectCode: respondent.projectCode,
    eventType: 'callback',
    meta: { details: `Received ${status} callback from client.` }
  });

  // Calculate LOI
  const startTime = respondent.startedAt ? Math.floor(new Date(respondent.startedAt).getTime() / 1000) : Math.floor(Date.now() / 1000);
  const endTime = Math.floor(Date.now() / 1000);
  const loi = Math.round((endTime - startTime) / 60);

  // 5. Build Internal Parameters (Fallback)
  const pageMap: Record<string, string> = {
    'complete':           'complete',
    'terminate':          'terminate',
    'quotafull':          'quotafull',
    'security-terminate': 'security',
    'fraud':              'security',
  };

  const internalParams = new URLSearchParams({
    pid: respondent.projectCode || "",
    uid: respondent.supplierRid || "",
    ip: respondent.ipAddress || "unknown",
    start: startTime.toString(),
    end: endTime.toString(),
    loi: loi.toString(),
    status: finalStatus,
    country: respondent.countryCode || ""
  });

  // 6. UID Sanitization for Redirects (Safety check for legacy data)
  let rid = respondent.supplierRid || '';
  const SANITY_PLACEHOLDERS = ['n/a', '[uid]', '{uid}', '[rid]', '{rid}', 'null', 'undefined', ''];
  if (rid && SANITY_PLACEHOLDERS.includes(rid.toLowerCase().trim())) {
    rid = `DIR-${respondent.oiSession.split('-')[0]}`;
  }

  // 7. Determine Final Destination (Supplier Redirect vs Project Redirect vs Landing Page)
  let finalPath = `/pages/${pageMap[finalStatus] || 'terminate'}`;
  let finalRedirectUrl = new URL(`${finalPath}?${internalParams.toString()}`, req.url).toString();

  // A. Try Supplier Redirect first
  if (respondent.supplierCode && respondent.supplierCode !== 'direct') {
    try {
      const supplier = await storage.getSupplierByCode(respondent.supplierCode);
      if (supplier) {
        const urlMap: Record<string, string | null | undefined> = {
          'complete':           supplier.completeUrl ?? null,
          'terminate':          supplier.terminateUrl ?? null,
          'quotafull':          (supplier as any).quotafullUrl ?? null,
          'security-terminate': (supplier as any).securityUrl ?? null,
        };
        if (urlMap[finalStatus]) {
          finalRedirectUrl = urlMap[finalStatus]!;
        }
      }
    } catch (err) {
      console.error("Supplier URL lookup error:", err);
    }
  } 
  // B. Fallback to Project Redirect
  else {
    try {
      const project = await storage.getProjectByCode(respondent.projectCode);
      if (project) {
        const urlMap: Record<string, string | null | undefined> = {
          'complete':           project.completeUrl ?? null,
          'terminate':          project.terminateUrl ?? null,
          'quotafull':          project.quotafullUrl ?? null,
          'security-terminate': project.securityUrl ?? null,
        };
        if (urlMap[finalStatus]) {
          finalRedirectUrl = urlMap[finalStatus]!;
        }
      }
    } catch (err) {
      console.error("Project URL lookup error:", err);
    }
  }

  // 8. Replace Placeholders in Final URL
  if (finalRedirectUrl.includes('{') || finalRedirectUrl.includes('[')) {
    const pidValue = respondent.projectCode || '';
    finalRedirectUrl = finalRedirectUrl
      .replaceAll("{RID}", rid)
      .replaceAll("[RID]", rid)
      .replaceAll("{rid}", rid)
      .replaceAll("{uid}", rid)
      .replaceAll("[UID]", rid)
      .replaceAll("{PID}", pidValue)
      .replaceAll("[PID]", pidValue)
      .replaceAll("{pid}", pidValue)
      .replaceAll("{oi_session}", respondent.oiSession);
  }

  console.log(`Callback Redirect: ${finalRedirectUrl}`);
  return NextResponse.redirect(new URL(finalRedirectUrl));
}
