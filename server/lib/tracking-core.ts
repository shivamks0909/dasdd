
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
  const { projectCode, countryCode, extraParams = {} } = params;
  const supplierCode = params.supplierCode || "DIRECT";
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
    const countrySurvey = await storage.getCountrySurveyByCode(projectCode, countryCode);
    if (!countrySurvey || countrySurvey.status !== 'active') {
      return { error: { status: 404, message: "Survey not found for this country" } };
    }

    // 4. Check for Duplicates
    const isDuplicate = await storage.checkDuplicateRespondent(projectCode, supplierCode, supplierRid);
    if (isDuplicate) {
      const oiSessionForLog = randomUUID();
      await storage.createActivityLog({
        oiSession: oiSessionForLog,
        projectCode,
        eventType: 'duplicate_entry',
        meta: { details: `Duplicate RID detected: ${supplierRid} for ${supplierCode} on ${projectCode}` } as any
      } as any);

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
    let clientRid: string;
    try {
      clientRid = await storage.generateClientRID(projectCode);
    } catch (ridErr: any) {
      console.error("RID generation error:", ridErr);
      const prefix = project.ridPrefix || "OPI";
      const cc = project.ridCountryCode || "XX";
      clientRid = `${prefix}${cc}${Date.now().toString().slice(-6)}`;
    }

    if (!clientRid || clientRid.trim() === '') {
      return { 
        error: { 
          status: 302, 
          message: "RID generation failed", 
          internalRedirect: `${routerService.internalPathMap['terminate']}?reason=rid_failed` 
        } 
      };
    }

    // 6. Create Respondent Session
    const oiSession = randomUUID();
    
    // S2S Generation
    let s2sToken: string | null = null;
    const s2sConfig = await storage.getS2sConfig(projectCode);
    
    if (s2sConfig && s2sConfig.requireS2S) {
      s2sToken = generateS2SToken(oiSession, s2sConfig.s2sSecret);
    }

    // 7. Build survey URL
    let redirectUrl = countrySurvey.surveyUrl
      .replaceAll("{RID}", clientRid)
      .replaceAll("[RID]", clientRid)
      .replaceAll("{rid}", clientRid)
      .replaceAll("{uid}", clientRid)
      .replaceAll("[UID]", clientRid)
      .replaceAll("{oi_session}", oiSession);

    const usedParams = new Set<string>();
    Object.entries(extraParams).forEach(([key, value]) => {
      if (typeof value === 'string') {
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
      }
    });

    const finalUrlObj = new URL(redirectUrl);
    Object.entries(extraParams).forEach(([key, value]) => {
      if (!usedParams.has(key) && typeof value === 'string') {
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

    // 8. Save respondent
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
      startedAt: new Date()
    } as any);

    return { redirectUrl };

  } catch (err) {
    console.error("Tracking Error:", err);
    return { error: { status: 500, message: "Internal Server Error" } };
  }
}
