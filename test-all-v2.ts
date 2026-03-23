import { insforge } from "./server/insforge.js";

const BASE_URL = "http://localhost:3000";
const BYPASS_HEADER = { "x-test-bypass": "UID-TEST-SECRET" };

async function runAll() {
  console.log("🚀 STARTING DEEP E2E VERIFICATION...");

  try {
    const uid = "DEEP_V_" + Math.random().toString(36).substring(7).toUpperCase();
    console.log(`\n--- TEST 1: UID REDIRECTION ---`);
    console.log(`Target UID: ${uid}`);
    
    // 1. Hit track route
    const trackUrl = `${BASE_URL}/track?code=UIDTEST&country=IN&uid=${uid}`;
    console.log(`Hitting track: ${trackUrl}`);
    const trackRes = await fetch(trackUrl, { redirect: 'manual' });
    const clientRedirect = trackRes.headers.get('location');
    
    console.log(`==> Client Redirection URL: ${clientRedirect}`);

    if (clientRedirect && clientRedirect.includes(`/VERCEL/${uid}`)) {
        console.log("✅ UID PATH REPLACEMENT: SUCCESS");
    } else {
        console.error("❌ UID PATH REPLACEMENT: FAILED");
        console.error(`   Url should contain /VERCEL/${uid}`);
    }

    // 2. Complete the survey
    console.log(`\n--- TEST 2: DASHBOARD SYNC ---`);
    // Give it a moment to write to DB
    await new Promise(r => setTimeout(r, 1000));
    
    const { data: resp, error: dbErr } = await insforge.database
      .from("respondents")
      .select("oi_session")
      .eq("supplier_rid", uid)
      .single();
    
    if (dbErr) {
        console.error("❌ DB LOOKUP ERROR:", dbErr.message);
        return;
    }

    const oi_session = resp?.oi_session;
    console.log(`Session found: ${oi_session}. Hitting complete callback...`);
    
    const completeUrl = `${BASE_URL}/track/complete?oi_session=${oi_session}`;
    const completeRes = await fetch(completeUrl, { redirect: 'manual' });
    console.log(`Complete hit. Redirect status: ${completeRes.status}`);

    // 3. Verify Dashboard API
    console.log("\n--- TEST 3: DASHBOARD API VALIDATION ---");
    const apiRes = await fetch(`${BASE_URL}/api/admin/respondents`, { headers: BYPASS_HEADER });
    const list = await apiRes.json();
    
    if (!Array.isArray(list)) {
        console.error("❌ API ERROR: Did not return an array. Full response:", JSON.stringify(list).substring(0, 100));
        return;
    }

    const record = list.find((r: any) => r.supplierRid === uid || r.supplier_rid === uid);
    if (record) {
        console.log(`✅ RECORD MATCH FOUND: ${record.supplierRid}`);
        console.log(`✅ STATUS IN DASHBOARD: ${record.status}`);
        if (record.status === "complete") {
            console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");
        } else {
            console.error(`❌ STATUS MISMATCH: Expected 'complete', got '${record.status}'`);
        }
    } else {
        console.error(`❌ RECORD NOT FOUND IN DASHBOARD LIST (Total items: ${list.length})`);
    }

  } catch (err: any) {
    console.error(`\n🔴 UNEXPECTED ERROR: ${err.message}`);
  }
}

runAll();
