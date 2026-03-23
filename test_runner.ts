import { insforge } from "./server/insforge.js";

const BASE_URL = "http://localhost:3000";
const BYPASS_HEADER = { "x-test-bypass": "UID-TEST-SECRET" };

async function runTests() {
  console.log("🚀 Starting Automated Test Suite (Final Verification)...");

  async function fetchWithLog(url: string, options: any = {}) {
    // Wait a bit to ensure server is ready
    await new Promise(r => setTimeout(r, 500));
    console.log(`[Fetch] -> ${url}`);
    const res = await fetch(url, {
      ...options,
      headers: { ...BYPASS_HEADER, ...(options.headers || {}) }
    });
    const text = await res.text();
    console.log(`[Fetch] <- ${res.status} ${res.statusText}`);
    
    if (text.trim().startsWith("<!DOCTYPE html") || text.trim().startsWith("<html")) {
        console.error(`🔴 ERROR: URL ${url} returned HTML!`);
        console.error(`   Snippet: ${text.substring(0, 100)}`);
        return null;
    }
    try {
      return text ? JSON.parse(text) : null;
    } catch (e) {
      console.error(`❌ JSON Parse Error for ${url}`);
      return null;
    }
  }

  try {
    // Test UID Redirection
    const uid = "VERIFY_UID_FINAL_" + Date.now().toString().slice(-4);
    console.log(`\n--- TEST 1: UID REDIRECTION (${uid}) ---`);
    const trackRes = await fetch(`${BASE_URL}/track?code=UIDTEST&country=IN&uid=${uid}`, { redirect: 'manual' });
    const redirectUrl = trackRes.headers.get('location');
    console.log(`Track Redirect: ${redirectUrl}`);

    if (redirectUrl?.includes(`uid=${uid}`)) {
        console.log("✅ UID Redirection PASS");
    } else {
        console.error("❌ UID Redirection FAIL");
    }

    // Test Dashboard Synchronization
    console.log(`\n--- TEST 2: DASHBOARD SYNC ---`);
    const respondents = await fetchWithLog(`${BASE_URL}/api/admin/respondents`);
    if (respondents) {
        const found = respondents.find((r: any) => r.supplierRid === uid);
        if (found) {
            console.log(`✅ Dashboard Sync PASS (Found ${uid})`);
        } else {
            console.error(`❌ Dashboard Sync FAIL (${uid} not found in first 50)`);
        }
    } else {
        console.error("❌ API returned HTML, skipping sync check.");
    }

  } catch (err: any) {
    console.error("CRITICAL ERROR:", err.message);
  }
}

runTests();
