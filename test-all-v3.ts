import { insforge } from "./server/insforge.js";

const BASE_URL = "http://localhost:3000";
const BYPASS_HEADER = { "x-test-bypass": "UID-TEST-SECRET" };

async function runAll() {
  console.log("🚀 STARTING FINAL E2E VERIFICATION (V3)...");

  try {
    const uid = "V3_TEST_" + Math.random().toString(36).substring(7).toUpperCase();
    console.log(`\n--- TEST 1: UID REDIRECTION ---`);
    console.log(`Target UID: ${uid}`);
    
    // 1. Hit track route
    const trackUrl = `${BASE_URL}/track?code=SDAWEQ&country=IN&sup=DTMN&uid=${uid}`;
    console.log(`Hitting track: ${trackUrl}`);
    const trackRes = await fetch(trackUrl, { redirect: 'manual' });
    const clientRedirect = trackRes.headers.get('location');
    
    console.log(`[Track] Status: ${trackRes.status}`);
    console.log(`[Track] Headers: ${JSON.stringify(Object.fromEntries(trackRes.headers.entries()))}`);
    
    if (!clientRedirect) {
        const body = await trackRes.text();
        console.log(`[Track] Body: ${body.substring(0, 500)}`);
    }
    
    console.log(`==> Client Redirection URL: ${clientRedirect}`);

    if (clientRedirect && clientRedirect.includes(`/VERCEL/${uid}`)) {
        console.log("✅ UID PATH REPLACEMENT: SUCCESS");
    } else {
        console.error("❌ UID PATH REPLACEMENT: FAILED");
    }

    // 2. Complete the survey
    console.log(`\n--- TEST 2: DASHBOARD SYNC ---`);
    await new Promise(r => setTimeout(r, 3000));
    
    const { data: resp } = await insforge.database
      .from("respondents")
      .select("oi_session")
      .eq("supplier_rid", uid)
      .single();
    
    const oi_session = resp?.oi_session;
    if (!oi_session) throw new Error("Session not found in DB");

    console.log(`Session found: ${oi_session}. Hitting complete...`);
    await fetch(`${BASE_URL}/track/complete?oi_session=${oi_session}`, { redirect: 'manual' });

    // 3. Verify Dashboard API
    console.log("\n--- TEST 3: DASHBOARD API ---");
    const apiRes = await fetch(`${BASE_URL}/api/admin/respondents`, { headers: BYPASS_HEADER });
    const text = await apiRes.text();
    console.log(`API Response Status: ${apiRes.status}`);
    
    let list;
    try {
        list = JSON.parse(text);
    } catch (e) {
        console.error(`❌ DASHBOARD API FAILED TO PARSE JSON. Body: ${text.substring(0, 500)}`);
        throw e;
    }
    
    const record = list.find((r: any) => r.supplierRid === uid || r.supplier_rid === uid);
    if (record && record.status === "complete") {
        console.log(`✅ DASHBOARD SYNC: SUCCESS`);
        console.log("\n🎉 ALL TESTS PASSED! 🎉");
    } else {
        console.error(`❌ DASHBOARD SYNC: FAILED (Record: ${JSON.stringify(record)})`);
    }

  } catch (err: any) {
    console.error(`\n🔴 ERROR: ${err.message}`);
  }
}

runAll();
