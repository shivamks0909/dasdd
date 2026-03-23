import { insforge } from "./server/insforge.js";

const BASE_URL = "http://localhost:3000";
const BYPASS_HEADER = { "x-test-bypass": "UID-TEST-SECRET" };

async function runAll() {
  console.log("🚀 STARTING COMPREHENSIVE E2E VERIFICATION...");

  try {
    const uid = "FINAL_VERIFY_" + Math.random().toString(36).substring(7).toUpperCase();
    console.log(`\n--- TEST 1: UID REDIRECTION (Placeholder Replacement) ---`);
    console.log(`Target UID: ${uid}`);
    
    // 1. Hit track route
    const trackUrl = `${BASE_URL}/track?code=UIDTEST&country=IN&uid=${uid}`;
    console.log(`Hitting track: ${trackUrl}`);
    const trackRes = await fetch(trackUrl, { redirect: 'manual' });
    const clientRedirect = trackRes.headers.get('location');
    console.log(`Client Redirection: ${clientRedirect}`);

    if (clientRedirect?.includes(`VERCEL/${uid}`)) {
        console.log("✅ UID Path Replacement: PASS");
    } else {
        console.error("❌ UID Path Replacement: FAIL");
        console.error(`   Expected path containing VERCEL/${uid}, got: ${clientRedirect}`);
    }

    // 2. Complete the survey
    console.log(`\n--- TEST 2: DASHBOARD SYNCHRONIZATION ---`);
    const { data: resp } = await insforge.database
      .from("respondents")
      .select("oi_session")
      .eq("supplier_rid", uid)
      .single();
    
    const oi_session = resp?.oi_session;
    if (!oi_session) throw new Error("Could not find oi_session for test UID");

    console.log(`Session found: ${oi_session}. Hitting complete...`);
    await fetch(`${BASE_URL}/track/complete?oi_session=${oi_session}`, { redirect: 'manual' });

    // 3. Verify Dashboard API
    console.log("Verifying dashboard API...");
    const res = await fetch(`${BASE_URL}/api/admin/respondents`, { headers: BYPASS_HEADER });
    const list = await res.json();
    
    const record = list.find((r: any) => r.supplierRid === uid || r.supplier_rid === uid);
    if (record) {
        console.log(`✅ Record Found in Dashboard: PASS`);
        console.log(`   Final Status: ${record.status}`);
        if (record.status === "complete") {
            console.log(`✅ Status Synchronization: PASS`);
        } else {
            console.error(`❌ Status Synchronization: FAIL (status is ${record.status})`);
        }
    } else {
        console.error(`❌ Record Found in Dashboard: FAIL`);
    }

    console.log("\n🚀 VERIFICATION FINISHED.");

  } catch (err: any) {
    console.error(`\n🔴 CRITICAL VERIFICATION ERROR: ${err.message}`);
  }
}

runAll();
