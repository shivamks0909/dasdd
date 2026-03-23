import { routerService } from "./server/lib/router-service";
import { type Respondent, type Supplier, type Project } from "./shared/schema";

const respondent: any = {
  projectCode: "PATHTEST",
  supplierCode: "PATHSUP",
  supplierRid: "OFFICIAL_TEST_123",
  clientRid: "PTIN0001",
  oiSession: "session_abc_123",
  extraParams: { custom_param: "custom_val" }
};

const supplier: any = {
  code: "PATHSUP",
  completeUrl: "https://supplier-portal.com/callback?status=success&uid={uid}&pid={pid}&extra={custom_param}",
  terminateUrl: "https://supplier-portal.com/callback?status=term&uid={uid}",
  quotafullUrl: "https://supplier-portal.com/callback?status=quota&uid={uid}"
};

const project: any = {
  projectCode: "PATHTEST",
  projectName: "Path UID Test Project"
};

console.log("--- Testing Supplier Redirect (Complete) ---");
const completeUrl = routerService.getStatusRedirectUrl("complete", respondent, supplier, project);
console.log("Result:", completeUrl);

if (completeUrl.includes("uid=OFFICIAL_TEST_123") && completeUrl.includes("pid=PATHTEST") && completeUrl.includes("extra=custom_val")) {
  console.log("SUCCESS: Supplier placeholders replaced correctly");
} else {
  console.log("FAILURE: Supplier placeholders NOT replaced correctly");
}

console.log("\n--- Testing Internal Landing Page (Fallback) ---");
const fallbackUrl = routerService.getStatusRedirectUrl("complete", respondent, undefined, project);
console.log("Result:", fallbackUrl);
if (fallbackUrl.includes("/pages/complete") && fallbackUrl.includes("uid=OFFICIAL_TEST_123")) {
  console.log("SUCCESS: Internal landing page UID is correct");
} else {
  console.log("FAILURE: Internal landing page UID is INCORRECT");
}
