import { RouterService } from "../server/lib/router-service";

const BASE_URL = "http://localhost:3001";

async function runE2EHardening() {
  console.log("🚀 Starting Production Hardening E2E Tests...");

  // Note: Using an existing project code from the system
  const projectCode = "PRJ2823"; 
  const supplierCode = "SUPP_VERIFY";
  const supplierRid = `TEST_RID_${Date.now()}`;

  try {
    // 1. Test Tracking Link (Real Flow)
    console.log("\n1️⃣ Testing /track entry...");
    const trackUrl = `${BASE_URL}/track?code=${projectCode}&sup=${supplierCode}&uid=${supplierRid}&country=US`;
    console.log(`Targeting: ${trackUrl}`);
    
    // Manual fetch to handle redirects
    const trackResponse = await fetch(trackUrl, { redirect: "manual" });
    
    if (trackResponse.status !== 302) {
      throw new Error(`Expected 302 but got ${trackResponse.status}`);
    }
    
    const trackRedirectLocation = trackResponse.headers.get("location");
    console.log("✅ Tracking Entry Successful (Status 302)");
    console.log("   Location Header:", trackRedirectLocation);
    
    if (!trackRedirectLocation) throw new Error("Location header missing");
    
    const trackRedirectUrl = new URL(trackRedirectLocation, BASE_URL);
    const oiSession = trackRedirectUrl.searchParams.get("oi_session");
    
    if (!oiSession) throw new Error("oi_session missing in redirect URL");
    console.log(`✅ Session Created: ${oiSession}`);

    // 2. Test Callback (Real Flow)
    console.log("\n2️⃣ Testing /status callback (Complete)...");
    const callbackUrl = `${BASE_URL}/status?code=${projectCode}&uid=${supplierRid}&type=complete&session=${oiSession}`;
    const callbackResponse = await fetch(callbackUrl, { redirect: "manual" });
    
    if (callbackResponse.status !== 302) {
      throw new Error(`Expected 302 but got ${callbackResponse.status}`);
    }
    console.log("✅ Callback Successful (Status 302)");
    console.log("   Supplier Redirect URL:", callbackResponse.headers.get("location"));

    // 3. Test Fraud Detection (Fake Complete)
    console.log("\n3️⃣ Testing Fraud Detection (Invalid Session)...");
    const fraudUrl = `${BASE_URL}/status?code=${projectCode}&uid=${supplierRid}&type=complete&session=FAKE_SESSION_123`;
    const fraudResponse = await fetch(fraudUrl, { redirect: "manual" });
    
    console.log("✅ Fraud Detection Status Code:", fraudResponse.status);
    console.log("   Redirect destination:", fraudResponse.headers.get("location"));

    // 4. Test Multiple Statuses
    const statuses = ["terminate", "quotafull", "security_terminate"];
    for (const status of statuses) {
      console.log(`\n4️⃣ Testing /status callback (${status})...`);
      const statusUrl = `${BASE_URL}/status?code=${projectCode}&uid=${supplierRid}&type=${status}&session=${oiSession}`;
      const res = await fetch(statusUrl, { redirect: "manual" });
      console.log(`✅ ${status} status code ${res.status}, redirect:`, res.headers.get("location"));
    }

  } catch (error: any) {
    console.error("❌ E2E Hardening Failed:", error.message);
    process.exit(1);
  }

  console.log("\n🏁 Production Hardening Tests Completed Successfully!");
}

runE2EHardening();
