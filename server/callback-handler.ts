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

  // ── BUG 2 FIX: Try to redirect to supplier URL first ──
  if (respondent.supplierCode) {
    try {
      const supplier = await storage.getSupplierByCode(respondent.supplierCode);
      if (supplier) {
        const urlMap: Record<string, string | null | undefined> = {
          'complete':           supplier.completeUrl ?? null,
          'terminate':          supplier.terminateUrl ?? null,
          'quotafull':          (supplier as any).quotafullUrl ?? null,
          'security-terminate': (supplier as any).security_url ?? null,
        };
        const rawUrl = urlMap[finalStatus];
        if (rawUrl) {
          const supplierRedirect = rawUrl
            .replace('{uid}', respondent.supplierRid || '')
            .replace('[UID]', respondent.supplierRid || '')
            .replace('{UID}', respondent.supplierRid || '')
            .replace('{pid}', respondent.projectCode || '')
            .replace('[PID]', respondent.projectCode || '')
            .replace('{PID}', respondent.projectCode || '');
          return NextResponse.redirect(new URL(supplierRedirect));
        }
      }
    } catch (err) {
      console.error("Supplier URL redirect error:", err);
      // Fall through to internal landing page
    }
  }

  // ── Fallback: Internal landing page with original supplier UID ──
  const pageMap: Record<string, string> = {
    'complete':           'complete',
    'terminate':          'terminate',
    'quotafull':          'quotafull',
    'security-terminate': 'security',
    'fraud':              'security',
  };

  const internalParams = new URLSearchParams({
    pid: respondent.projectCode || "",
    uid: respondent.supplierRid || "",   // ← Original supplier UID always
    ip: respondent.ipAddress || "unknown",
    start: startTime.toString(),
    end: endTime.toString(),
    loi: loi.toString(),
    status: finalStatus,
    country: respondent.countryCode || ""
  });

  const pagePath = pageMap[finalStatus] || 'terminate';
  return NextResponse.redirect(new URL(`/pages/${pagePath}?${internalParams.toString()}`, req.url));
}
