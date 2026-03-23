import { storage } from "@server/storage";
import { redirectToSupplierOrLanding } from "./redirect-helper";
import { type Respondent } from "@shared/schema";

export async function handleCallback(req: Request, status: string): Promise<Response> {
  const url = new URL(req.url);
  const oiSession = url.searchParams.get('oi_session');
  const pid = url.searchParams.get('pid')?.toUpperCase() || url.searchParams.get('project')?.toUpperCase();
  const uid = url.searchParams.get('uid') || url.searchParams.get('rid');
  const sessionToken = url.searchParams.get('session_token') || url.searchParams.get('cid');

  console.log(`[Callback] Handling ${status}: oi_session=${oiSession}, pid=${pid}, uid=${uid}, token=${sessionToken}`);

  let respondent: Respondent | undefined;

  // 1. Primary Lookup: oi_session
  if (oiSession) {
    respondent = await storage.getRespondentBySession(oiSession);
  }

  // 2. Fallback 1: pid + uid (Project Code + Client RID)
  if (!respondent && pid && uid) {
    console.log(`[Callback] Falling back to lookup by pid=${pid} and uid=${uid}`);
    respondent = await storage.getRespondentByClientRid(pid, uid);
  }

  // 3. Fallback 2: session_token or cid
  if (!respondent && sessionToken) {
    console.log(`[Callback] Falling back to lookup by session_token/cid`);
    respondent = await storage.getRespondentBySession(sessionToken);
  }

  if (!respondent) {
    console.warn(`[Callback] Respondent NOT FOUND for params provided. Status=${status}`);
    // Always show a landing page even if session is not found
    return Response.redirect(new URL(`/status/${status}?error=session_not_found`, req.url));
  }

  let finalStatus = status;

  // S2S Verification Check for completions
  if (status === 'complete') {
    const s2sConfig = await storage.getS2sConfig(respondent.projectCode || "");
    if (s2sConfig && s2sConfig.requireS2S && !respondent.s2sVerified) {
      console.warn(`[Callback] S2S Verification required but not done for ${respondent.oiSession}`);
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

  // Get Redirect Info
  const { response, url: redirectUrl } = await redirectToSupplierOrLanding(respondent, finalStatus, req as any);

  // Update Status and Redirect URL
  if (finalStatus !== 'security-terminate') {
     await storage.updateRespondentStatus(respondent.oiSession, finalStatus, redirectUrl);
  } else {
     await storage.updateRespondentStatus(respondent.oiSession, 'fraud', redirectUrl);
  }

  return response;
}
