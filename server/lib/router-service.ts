import { type Respondent, type Supplier, type Project } from "@shared/schema";

/**
 * Centralized Service for Unified Routing and Tracking logic.
 * Handles URL generation for tracking links and redirection logic for callbacks.
 */
export class RouterService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.ROUTER_BASE_URL || "https://track.opinioninsights.in";
  }

  /**
   * Status to Internal Page Mapping
   */
  public readonly internalPathMap: Record<string, string> = {
    'complete': '/pages/complete',
    'terminate': '/pages/terminate',
    'quotafull': '/pages/quotafull',
    'quota': '/pages/quotafull',
    'security-terminate': '/pages/security',
    'fraud': '/pages/security',
    'duplicate': '/pages/duplicate',
    'duplicate_ip': '/pages/security',
    'quality_terminate': '/pages/security'
  };

  /**
   * Determines the base URL for a project, preferring custom domain.
   */
  public getBaseUrl(project?: Project): string {
    const defaultUrl = process.env.NEXT_PUBLIC_APP_URL || this.baseUrl;
    if (project && project.customDomain) {
      let domain = project.customDomain.trim();
      if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
        domain = `https://${domain}`;
      }
      return domain;
    }
    return defaultUrl;
  }

  /**
   * Generates a unified tracking link
   */
  public getTrackingUrl(projectCode: string, countryCode: string, supplierCode?: string, supplierRid?: string): string {
    const params = new URLSearchParams({
      code: projectCode,
      country: countryCode,
    });

    if (supplierCode) params.append("sup", supplierCode);
    if (supplierRid) params.append("uid", supplierRid);
    
    // If no UID provided, return template for link generator
    let url = `${this.baseUrl}/track?${params.toString()}`;
    if (!supplierRid) {
       url += "&uid=[UID]";
    }
    
    return url;
  }

  /**
   * Sanitizes Respondent UID for placeholders
   */
  public sanitizeUid(uid: string | null, oiSession?: string): string {
    let sanitizedRid = uid || "";
    const SANITY_PLACEHOLDERS = ['n/a', '[uid]', '{uid}', '[rid]', '{rid}', 'null', 'undefined', ''];
    if (!sanitizedRid || SANITY_PLACEHOLDERS.includes(sanitizedRid.toLowerCase().trim())) {
      return oiSession ? `DIR-${oiSession.split('-')[0]}` : "DIRECT";
    }
    return sanitizedRid;
  }

  /**
   * Determines the final destination URL for a respondent
   */
  public getStatusRedirectUrl(status: string, respondent: Respondent, supplier?: Supplier, project?: Project): string {
    const finalStatus = status.toLowerCase();
    let finalRedirectUrl: string | null = null;
    
    // 1. Try Supplier Redirect first (unless direct)
    if (supplier && respondent.supplierCode && respondent.supplierCode.toLowerCase() !== 'direct') {
      switch (finalStatus) {
        case 'complete': finalRedirectUrl = supplier.completeUrl || null; break;
        case 'terminate': finalRedirectUrl = supplier.terminateUrl || null; break;
        case 'quotafull': finalRedirectUrl = supplier.quotafullUrl || null; break;
        case 'security-terminate':
        case 'fraud':
        case 'quality_terminate':
          finalRedirectUrl = supplier.securityUrl || null;
          break;
      }
    }

    // 2. Try Project Redirect second (fallback for direct or missing supplier URLs)
    if (!finalRedirectUrl && project) {
      switch (finalStatus) {
        case 'complete': finalRedirectUrl = project.completeUrl || null; break;
        case 'terminate': finalRedirectUrl = project.terminateUrl || null; break;
        case 'quotafull': finalRedirectUrl = project.quotafullUrl || null; break;
        case 'security-terminate':
        case 'fraud':
        case 'quality_terminate':
          finalRedirectUrl = project.securityUrl || null;
          break;
      }
    }

    // 3. Fallback to Internal Landing Page if no external URL determined
    if (!finalRedirectUrl || finalRedirectUrl.trim() === '') {
      const internalPath = this.internalPathMap[finalStatus] || '/pages/terminate';
      const loiSeconds = respondent.startedAt
        ? Math.round((Date.now() - new Date(respondent.startedAt).getTime()) / 1000)
        : 0;
      const params = new URLSearchParams({
        pid: respondent.projectCode || "",
        uid: respondent.supplierRid || "",
        session: respondent.oiSession,
        status: finalStatus,
        loi: String(loiSeconds),
      });
      return `${internalPath}?${params.toString()}`;
    }

    // 4. Placeholder Replacement
    const sanitizedRid = this.sanitizeUid(respondent.supplierRid, respondent.oiSession);
    const replacements: Record<string, string> = {
      'rid': sanitizedRid,
      'uid': sanitizedRid,
      'client_rid': respondent.clientRid || '',
      'id': sanitizedRid, // common alias
      'pid': respondent.projectCode || '',
      'oi_session': respondent.oiSession,
      ...(respondent.extraParams || {})
    };
    
    let url = finalRedirectUrl;
    const usedKeys = new Set<string>();

    for (const [key, val] of Object.entries(replacements)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}|\\{${key}\\}|\\[${key}\\]`, 'gi');
      if (regex.test(url)) {
        url = url.replace(regex, val);
        usedKeys.add(key);
      }
    }

    // Auto-append any extra parameters that weren't used as placeholders
    if (respondent.extraParams) {
      const urlObj = new URL(url.includes('://') ? url : `http://localhost${url}`);
      let modified = false;
      for (const [key, val] of Object.entries(respondent.extraParams)) {
        const isUsed = usedKeys.has(key);
        const isExcluded = ['code', 'country', 'sup'].includes(key);
        if (!isUsed && !isExcluded) {
          urlObj.searchParams.set(key, val);
          modified = true;
        }
      }
      if (modified) {
        url = url.includes('://') ? urlObj.toString() : urlObj.pathname + urlObj.search;
      }
    }

    return url;
  }
}

export const routerService = new RouterService();
