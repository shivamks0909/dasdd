export interface UrlIntelligenceResult {
  finalUrl: string;
  uidPosition: 'path' | 'query' | 'none';
  uidSegmentValue: string | null;
  sentUid?: string;
}

/**
 * Intelligently injects client_rid and oi_session into a survey URL.
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

  let workingUrl = urlStr;
  let replacedAny = false;
  let uidPosition: 'path' | 'query' | 'none' = 'none';
  let uidSegmentValue: string | null = null;
  let finalSentUid: string | null = null;

  const patternsForReplacement = [
    { pattern: /\[UID\]/gi }, 
    { pattern: /\{UID\}/gi },
    { pattern: /\[RID\]/gi }, 
    { pattern: /\{RID\}/gi },
    { pattern: /%5BUID%5D/gi }, 
    { pattern: /%7BUID%7D/gi },
    { pattern: /%5BRID%5D/gi }, 
    { pattern: /%7BRID%7D/gi }
  ];

  const originalUrlParts = urlStr.split('?');
  const pathPart = originalUrlParts[0];
  const queryPart = originalUrlParts[1] || '';

  // 1. Placeholder replacement
  patternsForReplacement.forEach(({ pattern }) => {
    if (pattern.test(urlStr)) {
      console.log(`[UrlIntelligence] Found placeholder matching: ${pattern}`);
      pattern.lastIndex = 0;
      workingUrl = workingUrl.replace(pattern, clientRid);
      replacedAny = true;
      finalSentUid = clientRid;
    }
  });

  if (replacedAny) {
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
    const fullUrl = workingUrl.includes('://') ? workingUrl : `https://${workingUrl}`;
    urlObj = new URL(fullUrl);
  } catch (err) {
    console.error(`[UrlIntelligence] URL Parse Error:`, err);
    return { finalUrl: workingUrl, uidPosition: 'none', uidSegmentValue: null, sentUid: clientRid };
  }

  // 3. Handle blank uid= param (Case: ?uid=)
  if (urlObj.searchParams.has(clientUidParam) && !urlObj.searchParams.get(clientUidParam)) {
    console.log(`[UrlIntelligence] Detected blank ${clientUidParam}= param. Filling with ${clientRid}`);
    urlObj.searchParams.set(clientUidParam, clientRid);
    replacedAny = true;
    finalSentUid = clientRid;
    uidPosition = 'query';
    uidSegmentValue = 'blank_param_fill';
  }

  // 4. Force Injection Logic if no placeholder was replaced
  if (!replacedAny) {
    if (uidInjectionType === 'path') {
        const path = urlObj.pathname;
        urlObj.pathname = path.endsWith('/') ? `${path}${clientRid}` : `${path}/${clientRid}`;
        uidPosition = 'path';
        uidSegmentValue = 'appended_to_path';
    } else {
        urlObj.searchParams.set(clientUidParam, clientRid);
        uidPosition = 'query';
        uidSegmentValue = 'appended_as_query';
    }
    finalSentUid = clientRid;
  }

  // 5. Always Append oi_session
  urlObj.searchParams.set('oi_session', oiSession);

  const finalUrl = urlObj.toString();
  console.log(`[UrlIntelligence] Final URL: ${finalUrl}`);

  return { 
    finalUrl, 
    uidPosition, 
    uidSegmentValue,
    sentUid: finalSentUid || clientRid
  };
}

