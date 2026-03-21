import fetch from 'node-fetch';
import { insforge } from './server/insforge.js';

async function verifyRefinedParams() {
  const projectCode = 'TEST-PROJ-1'; // From previous setup
  const countryCode = 'US';
  const supplierCode = 'TEST_SUP';
  
  // 1. Test with 'rid' instead of 'uid'
  console.log('\n--- Test 1: Using rid parameter ---');
  const testRid = `RID_${Math.random().toString(36).substring(7)}`;
  console.log('Using Random RID:', testRid);
  const trackUrl1 = `http://localhost:3000/t/${projectCode}?country=${countryCode}&sup=${supplierCode}&rid=${testRid}&toid=TOID_456&custom_ext=EXT_789&age=25&gender=male`;
  
  const response1 = await fetch(trackUrl1, { redirect: 'manual' });
  const surveyUrl = response1.headers.get('location');
  console.log('Status:', response1.status);
  if (!surveyUrl) {
    console.log('Body:', await response1.text());
  }
  console.log('Survey URL:', surveyUrl);
  
  if (surveyUrl?.includes('rid=RID_VALUE_123') && surveyUrl?.includes('toid=TOID_456')) {
    console.log('✅ Success: rid and toid preserved in survey URL');
  } else {
    console.log('❌ Failure: rid or toid missing in survey URL');
  }

  // 2. Obtain the session ID from the survey URL
  const oiSession = new URL(surveyUrl!).searchParams.get('oi_session');
  console.log('Extracted OI Session:', oiSession);

  if (!oiSession) {
    console.log('❌ Failure: Could not extract oi_session from survey URL');
    return;
  }

  // 3. Verify final redirect (Simulate callback)
  console.log('\n--- Test 2: Verifying final redirect injection ---');
  const callbackUrl = `http://localhost:3000/api/complete?oi_session=${oiSession}`;
  console.log('Calling Callback URL:', callbackUrl);
  
  const response2 = await fetch(callbackUrl, { redirect: 'manual' });
  console.log('Callback Status:', response2.status);
  
  const finalRedirect = response2.headers.get('location');
  console.log('Final Redirect URL Header:', finalRedirect);

  if (!finalRedirect) {
    const body = await response2.text();
    console.log('Callback Response Body (no location header):', body);
    console.log('❌ Failure: No redirect header found in callback response');
    return;
  }

  const hasRidOrUid = finalRedirect.includes(`rid=${testRid}`) || finalRedirect.includes(`uid=${testRid}`);
  const hasToid = finalRedirect.includes('toid=TOID_456');
  const hasCustom = finalRedirect.includes('custom_ext=EXT_789');

  console.log('Detection Results:', { hasRid: hasRidOrUid, hasToid, hasCustom });

  if (hasRidOrUid && hasToid && hasCustom) {
    console.log('✅ Success: All parameters (rid, toid, custom_ext) preserved in final redirect');
  } else {
    console.log('❌ Failure: Parameters missing in final redirect');
    console.log('Full URL for manual check:', finalRedirect);
  }
}

verifyRefinedParams().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
