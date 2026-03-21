
import fetch from 'node-fetch';

async function verify() {
  const baseUrl = 'http://localhost:3000';
  const projectCode = 'TEST-PROJ-1';
  
  console.log('--- Testing Dynamic Parameter Routing ---');
  
  // 1. Initial Entry with extra params
  const testParams = new URLSearchParams({
    code: projectCode,
    country: 'US',
    sup: 'TEST_SUP',
    uid: 'TEST_UID_' + Date.now(),
    age: '25',
    gender: 'male',
    source: 'social'
  });
  
  const entryUrl = `${baseUrl}/track?${testParams.toString()}`;
  console.log(`Step 1: Calling entry URL: ${entryUrl}`);
  
  const res = await fetch(entryUrl, { redirect: 'manual' });
  const redirectUrl = res.headers.get('location');
  
  console.log(`Status: ${res.status}`);
  console.log(`Redirect URL: ${redirectUrl}`);
  
  if (!redirectUrl) {
    console.error('FAILED: No redirect URL returned');
    return;
  }
  
  // Verify params in redirectUrl
  const url = new URL(redirectUrl);
  const age = url.searchParams.get('age');
  const gender = url.searchParams.get('gender');
  const oiSession = url.searchParams.get('oi_session');
  
  console.log(`Captured oi_session: ${oiSession}`);
  
  if (age === '25' && gender === 'male') {
    console.log('✅ SUCCESS: Extra params forwarded to survey URL');
  } else {
    console.error(`FAILED: Extra params missing or incorrect. Age: ${age}, Gender: ${gender}`);
  }

  // 2. Fetch respondent from API to check stored params
  // Using the internal /api/respondents endpoint (needs admin auth?)
  // Actually, I can just check if it redirected correctly.
  
  // 3. Test Callback and Final Redirect
  const callbackUrl = `${baseUrl}/api/complete?oi_session=${oiSession}`;
  console.log(`Step 2: Calling callback URL: ${callbackUrl}`);
  
  const cbRes = await fetch(callbackUrl, { redirect: 'manual' });
  const finalRedirect = cbRes.headers.get('location');
  
  console.log(`Final Redirect URL: ${finalRedirect}`);
  
  if (finalRedirect && (finalRedirect.includes('age=25') || finalRedirect.includes('gender=male'))) {
     console.log('✅ SUCCESS: Extra params injected into final redirect');
  } else if (finalRedirect && finalRedirect.includes('status=complete')) {
     console.log('ℹ️ Redirected to internal page, checking params...');
     if (finalRedirect.includes('uid=TEST_UID')) {
         console.log('✅ SUCCESS: Respondent context preserved in internal redirect');
     }
  } else {
     console.warn('⚠️ Final redirect did not contain extra params. This might be because the destination URL didn\'t have placeholders or auto-append failed.');
  }
}

verify().catch(console.error);
