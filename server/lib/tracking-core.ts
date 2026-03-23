
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { routerService } from "./router-service";
import { generateS2SToken } from "../s2s";
import { injectUidAndSession } from "./url-intelligence";

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
    console.log(`[TrackingCore] Step 1: Fetching project ${projectCode}...`);
    console.log(`[TrackingCore] Storage Type: ${typeof storage}, Is DatabaseStorage: ${storage instanceof Object && storage.constructor.name === 'DatabaseStorage'}`);
    console.log(`[TrackingCore] Storage methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(storage)).join(', ')}`);
    
    const project = await storage.getProjectByCode(projectCode);
    console.log(`[TrackingCore] getProjectByCode result: ${project ? 'SUCCESS' : 'NULL'}`);
    
    if (!project) {
      console.warn(`[TrackingCore] Project NOT FOUND: ${projectCode}`);
      return { error: { status: 404, message: `Project ${projectCode} not found` } };
    }
    
    if (project.status !== 'active') {
      console.warn(`[TrackingCore] Project INACTIVE: ${projectCode}, status=${project.status}`);
      return { error: { status: 404, message: "Project not found or inactive" } };
    }

    console.log(`[TrackingCore] Project valid: ${project.projectName}`);

    // 2. Validate Supplier
    console.log(`[TrackingCore] Step 2: Validating supplier ${supplierCode}...`);
    if (params.supplierCode) {
      const supplier = await storage.getSupplierByCode(supplierCode);
      if (!supplier) {
        console.warn(`[TrackingCore] Supplier NOT FOUND: ${supplierCode}`);
        return { error: { status: 404, message: "Supplier not found" } };
      }
      console.log(`[TrackingCore] Supplier valid: ${supplier.id}`);
    }

    // 3. Validate Country Survey
    console.log(`[TrackingCore] Step 3: Fetching country survey for projectCode=${projectCode}, countryCode=${countryCode}...`);
    const countrySurvey = await storage.getCountrySurveyByCode(projectCode, countryCode);
    console.log(`[TrackingCore] getCountrySurveyByCode result: ${countrySurvey ? 'SUCCESS' : 'NULL'}`);
    if (!countrySurvey) {
        console.warn(`[TrackingCore] Survey NOT FOUND for ${projectCode}/${countryCode}`);
        return { error: { status: 404, message: "Survey not found for this country" } };
    }
    
    if (countrySurvey.status !== 'active') {
      console.warn(`[TrackingCore] Survey INACTIVE for ${projectCode}/${countryCode}`);
      return { error: { status: 404, message: "Survey not found for this country" } };
    }

    console.log(`[TrackingCore] Country survey valid: ${countrySurvey.id}`);

    // 4. Check for Duplicates
    console.log(`[TrackingCore] Step 4: Checking duplicates for ${supplierRid}...`);
    const isDuplicate = await storage.checkDuplicateRespondent(projectCode, supplierCode, supplierRid);
    if (isDuplicate) {
      console.log(`[TrackingCore] Duplicate detected!`);
      const oiSessionForLog = randomUUID();
      try {
          await storage.createActivityLog({
            oiSession: oiSessionForLog,
            projectCode,
            eventType: 'duplicate_entry',
            meta: { details: `Duplicate RID detected: ${supplierRid} for ${supplierCode} on ${projectCode}` }
          });
      } catch (e) {
          console.error(`[TrackingCore] Activity log for duplicate failed:`, e);
      }

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

    // 5. Generate Client RID
    console.log(`[TrackingCore] Step 5: Generating client RID...`);
    let clientRid: string = "";
    try {
      clientRid = await storage.generateClientRID(projectCode);
    } catch (ridErr: any) {
      console.error("[TrackingCore] Atomic RID generation error (swallowed):", ridErr);
    }

    if (!clientRid || clientRid.trim() === '' || /^\d+$/.test(clientRid)) {
      const prefix = projectCode === 'QWDQDQW' ? 'OPISH' : (project.ridPrefix || "OPI");
      const cc = projectCode === 'QWDQDQW' ? 'IN' : (project.ridCountryCode || "XX");
      const padding = project.ridPadding || 4;
      const counter = (clientRid && /^\d+$/.test(clientRid)) ? clientRid : Date.now().toString().slice(-padding);
      
      clientRid = `${prefix}${cc}${counter.padStart(padding, "0")}`;
      console.warn(`[TrackingCore] RID generation fallback used: ${clientRid}`);
    }

    // 6. Create Respondent Session Meta
    console.log(`[TrackingCore] Step 6: Preparing session meta...`);
    const oiSession = randomUUID();
    const clickid = `OI${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // S2S Check
    let s2sToken: string | null = null;
    const s2sConfig = await storage.getS2sConfig(projectCode);
    if (s2sConfig && s2sConfig.requireS2S) {
      s2sToken = generateS2SToken(oiSession, s2sConfig.s2sSecret);
      console.log(`[TrackingCore] S2S Token generated: ${!!s2sToken}`);
    }

    // 7. URL Intelligence Injection
    console.log(`[TrackingCore] Step 7: Injecting UID and Session...`);
    let surveyUrl = countrySurvey.surveyUrl;
    
    // Quick handle for extraParams placeholders
    Object.entries(extraParams).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const keyLower = key.toLowerCase();
        const tags = [`{${key}}`, `[${key}]`, `{${keyLower}}`, `[${keyLower}]` ];
        tags.forEach(tag => {
          if (surveyUrl.includes(tag)) {
             surveyUrl = surveyUrl.replaceAll(tag, value);
          }
        });
      }
    });

    const injectionType = project.uidInjectionType || 'auto';
    const injectionResult = injectUidAndSession(
        surveyUrl, 
        clientRid, 
        oiSession,
        project.clientUidParam || 'uid',
        injectionType as any
    );
    let redirectUrl = injectionResult.finalUrl;
    const sentUid = injectionResult.sentUid || clientRid;
    const sentPid = projectCode;
    
    console.log(`[TrackingCore] Injection Result: pos=${injectionResult.uidPosition}, url=${redirectUrl}, sentUid=${sentUid}`);

    // Append extra params AND ALWAYS PID
    try {
      const finalUrlObj = new URL(redirectUrl);
      
      // Always set PID for ExploreResearch and others
      finalUrlObj.searchParams.set('pid', sentPid);
      
      const handledKeys = ['code', 'country', 'sup', 'uid', 'rid', 'toid', 'zid', 'pid', 'mid', 'sid'];
      Object.entries(extraParams).forEach(([key, value]) => {
        const keyLower = key.toLowerCase();
        if (!handledKeys.includes(keyLower) && typeof value === 'string' && !finalUrlObj.searchParams.has(key)) {
           finalUrlObj.searchParams.set(key, value);
        }
      });
      redirectUrl = finalUrlObj.toString();
    } catch(e) {
      console.error(`[TrackingCore] URL parsing error in extraParams/PID append:`, e);
    }

    if (s2sToken) {
      const separator = redirectUrl.includes('?') ? '&' : '?';
      redirectUrl += `${separator}s2s_token=${s2sToken}`;
    }

    // 8. Save Respondent
    console.log(`[TrackingCore] Step 8: Saving respondent to database...`);
    try {
        await storage.createRespondent({
          oiSession,
          projectCode,
          supplierCode,
          supplierRid,
          clientRid,
          sentUid,
          sentPid,
          status: 'started',
          surveyUrl: redirectUrl,
          ipAddress: params.ip || null,
          userAgent: params.userAgent || null,
          s2sToken,
          s2sVerified: false,
          fraudScore: 0,
          extraParams,
          urlUidPosition: injectionResult.uidPosition,
          urlUidValue: injectionResult.uidSegmentValue || undefined,
          // clickid,
          clientUidParam: project.clientUidParam || 'uid',
          uidInjectionType: project.uidInjectionType || 'auto',
        });
        console.log(`[TrackingCore] Success! Redirecting to: ${redirectUrl}`);
    } catch (saveErr: any) {
        console.error(`[TrackingCore] createRespondent CRITICAL FAILURE:`, saveErr);
        throw new Error(`Database save failed: ${saveErr.message}`);
    }

    return { redirectUrl };

  } catch (err: any) {
    console.error("[TrackingCore] UNCAUGHT ERROR:", err);
    return { error: { status: 500, message: `Internal Server Error: ${err.message}` } };
  }
}
