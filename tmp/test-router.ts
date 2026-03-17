import { RouterService } from "../server/lib/router-service";
import * as dotenv from "dotenv";
dotenv.config();

const routerService = new RouterService();

console.log("--- RouterService Verification ---");

const projectCode = "PRJTEST";
const countryCode = "US";
const supplierCode = "SUP123";
const supplierRid = "RID456";

console.log("\n1. Tracking Link Generation:");
console.log("   - Full Link:", routerService.getTrackingUrl(projectCode, countryCode, supplierCode, supplierRid));
console.log("   - Template Link:", routerService.getTrackingUrl(projectCode, countryCode, supplierCode));
console.log("   - Direct Link:", routerService.getTrackingUrl(projectCode, countryCode));

console.log("\n2. Status Redirect Mapping:");
const mockRespondent = {
  projectCode,
  supplierCode,
  supplierRid,
  oiSession: "session-abc-123"
} as any;

const mockSupplier = {
  completeUrl: "https://sup-complete.com?uid={RID}",
  terminateUrl: "https://sup-term.com?uid=[UID]",
  quotafullUrl: "https://sup-qf.com?rid={rid}",
  securityUrl: "https://sup-sec.com?rid={RID}"
} as any;

console.log("   - Complete (Supplier):", routerService.getStatusRedirectUrl("complete", mockRespondent, mockSupplier));
console.log("   - Terminate (Supplier):", routerService.getStatusRedirectUrl("terminate", mockRespondent, mockSupplier));
console.log("   - Quota (Internal Fallback - no URL provided):", routerService.getStatusRedirectUrl("quotafull", { ...mockRespondent, supplierCode: 'direct' }));
console.log("   - Security (Supplier):", routerService.getStatusRedirectUrl("security-terminate", mockRespondent, mockSupplier));

console.log("\n3. UID Sanitization:");
console.log("   - Valid UID:", routerService.sanitizeUid("USER123"));
console.log("   - Placeholder UID:", routerService.sanitizeUid("{uid}", "session-xyz"));
console.log("   - Null UID:", routerService.sanitizeUid(null, "session-xyz"));

console.log("\n--- Verification Complete ---");
