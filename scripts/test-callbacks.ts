import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_PROJECT_CODE = 'PATHTEST'; // Using an active test project
const TEST_UID = 'user123_' + Math.floor(Math.random() * 10000);

async function runTest() {
  console.log(`[Test] Starting callback flow test for project: ${TEST_PROJECT_CODE}`);
  console.log(`[Test] Base URL: ${BASE_URL}`);

  try {
    // Test each callback type
    const statuses = ['complete', 'terminate', 'quotafull'];
    
    for (const statusType of statuses) {
      console.log(`\n--- Testing status: ${statusType} ---`);
      
      const testUid = 'user123_' + Math.floor(Math.random() * 10000);
      const trackingUrl = `${BASE_URL}/track?code=${TEST_PROJECT_CODE}&country=IN&uid=${testUid}`;
      console.log(`[Step 1] Tracking URL: ${trackingUrl}`);

      const trackRes = await axios.get(trackingUrl, { maxRedirects: 0, validateStatus: (s) => s >= 300 && s < 400 });
      const surveyUrl = trackRes.headers.location;
      
      const urlObj = new URL(surveyUrl);
      const clientRid = urlObj.searchParams.get('uid');
      
      console.log(`[Step 1] Extracted CLIENT_RID: ${clientRid}`);

      if (!clientRid) throw new Error('Failed to find client RID in survey URL');

      console.log(`[Step 2] Testing callback status: ${statusType}`);
      const callbackUrl = `${BASE_URL}/${statusType}?pid=${TEST_PROJECT_CODE}&uid=${clientRid}`;
      console.log(`[Step 2] Callback URL: ${callbackUrl}`);

      const callbackRes = await axios.get(callbackUrl, { 
        maxRedirects: 0,
        validateStatus: (s) => s >= 300 && s < 400 
      });

      const redirectUrlStr = callbackRes.headers.location;
      console.log(`[Step 2] Full Redirect URL: ${redirectUrlStr}`);

      const redirectUrlObj = new URL(redirectUrlStr.includes('://') ? redirectUrlStr : `${BASE_URL}${redirectUrlStr}`);
      const finalUid = redirectUrlObj.searchParams.get('uid');
      console.log(`[Step 2] Final UID on landing page: ${finalUid}`);

      const expectedStatus = statusType === 'complete' ? 'complete' : statusType === 'terminate' ? 'terminate' : 'quota';
      if (redirectUrlStr.includes(`status=${expectedStatus}`) && finalUid === testUid) {
        console.log(`[Test SUCCESS] Correctly redirected to ${statusType} landing page with preserved UID: ${finalUid}`);
      } else {
        console.log(`[Test FAILED] Final redirect URL mismatch. Expected UID: ${testUid}, Got: ${finalUid}. Expected Status: ${expectedStatus}. URL: ${redirectUrlStr}`);
        process.exit(1);
      }
    }

  } catch (error: any) {
    console.error(`[Test FAILED] ${error.message}`);
    if (error.response) {
      console.error(`[Test FAILED] Response data:`, error.response.data);
      console.error(`[Test FAILED] Response status:`, error.response.status);
    }
  }
}

runTest();
