import { storage } from "../storage";
import { routerService } from "./router-service";
import { type Respondent } from "@shared/schema";
import { insforge } from "../insforge";

export interface CallbackResult {
  redirectUrl: string;
  oiSession?: string;
  status: string;
}

export async function processCallback(params: {
  oi_session?: string | null;
  clickid?: string | null;
  pid?: string | null;
  uid?: string | null;
  status: string;
  baseUrl: string;
}): Promise<CallbackResult> {
  const { oi_session, clickid, pid, uid, status, baseUrl } = params;

  let respondent: Respondent | undefined;

  // 1. Try finding by oi_session
  if (oi_session) {
    respondent = await storage.getRespondentBySession(oi_session);
    console.log(`[CallbackCore] Lookup by oi_session (${oi_session}): ${respondent ? 'Found' : 'Not Found'}`);
  }

  // 2. Try finding by clickid
  if (!respondent && clickid) {
    respondent = await storage.getRespondentByClickid(clickid);
    console.log(`[CallbackCore] Lookup by clickid (${clickid}): ${respondent ? 'Found' : 'Not Found'}`);
  }

  // 3. Try finding by Project Code + Sent UID (Recovery)
  if (!respondent && pid && uid) {
    respondent = await storage.getRespondentBySentUid(pid, uid);
    console.log(`[CallbackCore] Lookup by sent_pid+sent_uid (${pid}+${uid}): ${respondent ? 'Found' : 'Not Found'}`);
  }

  // 4. Fallback for blank UID (most recent for PID)
  if (!respondent && pid && (!uid || uid === '')) {
     console.log(`[CallbackCore] UID is blank. Trying to recover most recent respondent for PID: ${pid}`);
     const { data } = await insforge.database
        .from('respondents')
        .select('*')
        .eq('project_code', pid.toUpperCase())
        .order('started_at', { ascending: false })
        .limit(1);
     
     if (data && data[0]) {
         respondent = data[0] as any;
         console.log(`[CallbackCore] Recovered last session for ${pid}: ${respondent?.oiSession}`);
     }
  }

  if (!respondent) {
    console.warn(`[CallbackCore] Could not find session. Status: ${status}, pid=${pid}, uid=${uid}`);
    const statusToUse = status === 'quota' ? 'quotafull' : status;
    const landingPath = (routerService.internalPathMap as any)[statusToUse] || '/pages/terminate';
    return {
      redirectUrl: new URL(`${landingPath}?status=${statusToUse}&error=session_not_found`, baseUrl).toString(),
      status: statusToUse
    };
  }

  // If already processed, redirect to final destination
  if (respondent.status !== 'started' && respondent.status !== 'pending') {
    console.log(`[CallbackCore] Session ${respondent.oiSession} already has status ${respondent.status}. Redirecting.`);
    const supplier = respondent.supplierCode ? await storage.getSupplierByCode(respondent.supplierCode) : undefined;
    const project = await storage.getProjectByCode(respondent.projectCode);
    const finalRedirectUrl = routerService.getStatusRedirectUrl(respondent.status, respondent, supplier, project);
    return {
      redirectUrl: new URL(finalRedirectUrl, baseUrl).toString(),
      oiSession: respondent.oiSession,
      status: respondent.status
    };
  }

  let finalStatus = status;

  // S2S Check
  if (status === 'complete') {
    const s2sConfig = await storage.getS2sConfig(respondent.projectCode);
    if (s2sConfig && s2sConfig.requireS2S && !respondent.s2sVerified) {
      finalStatus = 'security-terminate';
      await storage.createActivityLog({
        oiSession: respondent.oiSession,
        eventType: 'security_alert',
        meta: { details: `Fraud attempt blocked: Manual client complete without S2S verification.` }
      });
      await insforge.database.from('respondents').update({ fraud_score: 1.0, status: 'fraud' }).eq('oi_session', respondent.oiSession);
    }
  }

  // Update Status
  if (finalStatus !== 'security-terminate' || status === 'security-terminate') {
    await storage.updateRespondentStatus(respondent.oiSession, finalStatus);
  }

  // Log Activity
  await storage.createActivityLog({
    oiSession: respondent.oiSession,
    eventType: 'callback',
    meta: { details: `Received ${status} callback from client.` }
  });

  const supplier = respondent.supplierCode ? await storage.getSupplierByCode(respondent.supplierCode) : undefined;
  const project = await storage.getProjectByCode(respondent.projectCode);
  const finalRedirectUrl = routerService.getStatusRedirectUrl(finalStatus, respondent, supplier, project);

  return {
    redirectUrl: new URL(finalRedirectUrl, baseUrl).toString(),
    oiSession: respondent.oiSession,
    status: finalStatus
  };
}
