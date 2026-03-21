import { processTrackingRequest } from './server/lib/tracking-core.js';
import { storage } from './server/storage.js';

async function testIsolation() {
  const projectCode = 'TEST-PROJ-1';
  const countryCode = 'US';
  const supplierCode = 'TEST_SUP';
  const supplierRid = 'RID_123';
  const extraParams = {
    toid: 'TOID_456',
    custom_ext: 'EXT_789'
  };

  try {
    const result = await processTrackingRequest({
      projectCode,
      countryCode,
      supplierCode,
      supplierRid,
      extraParams,
      ip: '127.0.0.1',
      userAgent: 'TestAgent'
    });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Isolation Error:', error);
  }
}

testIsolation().catch(console.error);
