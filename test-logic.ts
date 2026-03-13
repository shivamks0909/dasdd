import { storage } from "./server/storage";
import { randomUUID } from "crypto";

async function testSanitization() {
  const projectCode = 'DAWEQWEDASD';
  const countryCode = 'IN';
  const supplierCode = 'SUP_001';
  
  // Test Case 1: N/A UID
  let uid = "N/A";
  const SANITY_PLACEHOLDERS = ['n/a', '[uid]', '{uid}', '[rid]', '{rid}', 'null', 'undefined', ''];
  if (uid && SANITY_PLACEHOLDERS.includes(uid.toLowerCase().trim())) {
    uid = ""; 
  }
  const supplierRid = uid || `DIR-${randomUUID().split('-')[0]}`;
  
  console.log(`Original: N/A -> Sanitized: ${supplierRid}`);
  
  // Test Case 2: Multi-parameter replacement
  let surveyUrl = "https://example.com?id=[RID]&attr=[myattr]";
  const clientRid = "OPI123";
  const extraParams = { myattr: "val123" };
  
  let redirectUrl = surveyUrl.replaceAll("[RID]", clientRid);
  Object.entries(extraParams).forEach(([key, value]) => {
    redirectUrl = redirectUrl.replaceAll(`[${key}]`, value);
  });
  
  console.log(`Survey URL: ${surveyUrl}`);
  console.log(`Extra Params: ${JSON.stringify(extraParams)}`);
  console.log(`Redirect URL: ${redirectUrl}`);
  
  process.exit(0);
}

testSanitization().catch(console.error);
