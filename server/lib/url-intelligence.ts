export interface UrlIntelligenceResult {
  finalUrl: string;
  uidPosition: 'path' | 'query' | 'none';
  uidSegmentValue: string | null;
}

/**
 * Intelligently injects client_rid and oi_session into a survey URL.
 * Handles:
 * 1. Query param substitution (e.g. ?uid=[UID])
 * 2. Query param appending (if no placeholder found)
 * 3. Path segment substitution (e.g. /VERCEL/[UID])
 */
export function injectUidAndSession(
  urlStr: string,
  clientRid: string,
  oiSession: string,
  clientUidParam: string = 'uid',
  uidInjectionType: string = 'auto'
): UrlIntelligenceResult {
  console.log(`[UrlIntelligence] Input URL: ${urlStr}`);
  console.log(`[UrlIntelligence] Injecting RID: ${clientRid}, Session: ${oiSession}, Param: ${clientUidParam}, Type: ${uidInjectionType}`);

  const placeholders = ["{RID}", "[RID]", "{rid}", "[rid]", "{UID}", "[UID]", "{uid}", "[uid]"];
  const encodedPlaceholders = placeholders.map(p => encodeURIComponent(p));

  let workingUrl = urlStr;
  let uidPosition: 'path' | 'query' | 'none' = 'none';
  let uidSegmentValue: string | null = null;
  let replacedAny = false;

  // 1. Heavy-duty replacement on the RAW string for ALL known placeholders
  // Specifically ensure [UID] and [RID] are replaced case-insensitively and regardless of brackets/braces
  const patternsForReplacement = [
    { pattern: /\[UID\]/gi, type: 'path' }, 
    { pattern: /\{UID\}/gi, type: 'path' },
    { pattern: /\[RID\]/gi, type: 'path' }, 
    { pattern: /\{RID\}/gi, type: 'path' },
    { pattern: /%5BUID%5D/gi, type: 'path' }, 
    { pattern: /%7BUID%7D/gi, type: 'path' },
    { pattern: /%5BRID%5D/gi, type: 'path' }, 
    { pattern: /%7BRID%7D/gi, type: 'path' }
  ];

  const originalUrlParts = urlStr.split('?');
  const pathPart = originalUrlParts[0];
  const queryPart = originalUrlParts[1] || '';

  patternsForReplacement.forEach(({ pattern }) => {
    // Check if we find a placeholder in the URL
    if (pattern.test(urlStr)) {
      console.log(`[UrlIntelligence] Found placeholder matching: ${pattern}`);
      
      // Reset regex index due to 'g' flag
      pattern.lastIndex = 0;
      
      workingUrl = workingUrl.replace(pattern, clientRid);
      replacedAny = true;
    }
  });

  // Precise position detection
  if (replacedAny) {
    // We categorize based on the ORIGINAL url structure to see WHERE it was replaced
    const isPlaceholderInPath = patternsForReplacement.some(({ pattern }) => {
      pattern.lastIndex = 0;
      return pattern.test(pathPart);
    });
    const isPlaceholderInQuery = patternsForReplacement.some(({ pattern }) => {
      pattern.lastIndex = 0;
      return pattern.test(queryPart);
    });

    if (isPlaceholderInPath) {
      uidPosition = 'path';
      uidSegmentValue = 'path_match';
    } else if (isPlaceholderInQuery) {
      uidPosition = 'query';
      uidSegmentValue = 'query_match';
    } else {
      uidPosition = 'path';
      uidSegmentValue = 'inferred_match';
    }
  }

  // 2. Parse into URL object for structured manipulation
  let urlObj: URL;
  try {
    urlObj = new URL(workingUrl.includes('://') ? workingUrl : `https://${workingUrl}`);
  } catch (err) {
    console.error(`[UrlIntelligence] URL Parse Error:`, err);
    return { finalUrl: workingUrl, uidPosition: 'none', uidSegmentValue: null };
  }

  // 3. Forced Injection Logic if no placeholder was replaced OR if type is 'query'/'path' explicitly
  if (!replacedAny) {
    if (uidInjectionType === 'path') {
        // Path injection usually needs a placeholder, but if forced, we try to append to path
        const path = urlObj.pathname;
        if (path.endsWith('/')) {
            urlObj.pathname = path + clientRid;
        } else {
            urlObj.pathname = path + '/' + clientRid;
        }
        uidPosition = 'path';
        uidSegmentValue = 'path_append';
    } else {
        // Default: Query injection
        console.log(`[UrlIntelligence] No placeholder found, injecting into query param: ${clientUidParam}`);
        urlObj.searchParams.set(clientUidParam, clientRid);
        uidPosition = 'query';
        uidSegmentValue = clientUidParam;
    }
  }

  // 4. Always Append oi_session
  urlObj.searchParams.set('oi_session', oiSession);

  const finalUrl = urlObj.toString();
  console.log(`[UrlIntelligence] Final URL: ${finalUrl}`);

  return {
    finalUrl,
    uidPosition,
    uidSegmentValue
  };
}
