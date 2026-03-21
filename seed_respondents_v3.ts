import { storage } from './server/storage';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('--- Seeding Respondents with New Fields ---');
  try {
    const projectCode = 'TEST-PROJ-1';
    const supplierCode = 'TEST_SUP';
    const supplierName = 'Test Supplier';

    const devices = [
      { type: 'Desktop', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', browser: 'Chrome', os: 'Windows 10' },
      { type: 'Mobile', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1', browser: 'Safari', os: 'iOS 17.4' },
      { type: 'Tablet', ua: 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1', browser: 'Safari', os: 'iPadOS 17.4' },
      { type: 'Mobile', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36', browser: 'Chrome Mobile', os: 'Android 14' }
    ];

    const statuses = ['complete', 'terminate', 'quota_full', 'security', 'started'];

    for (let i = 1; i <= 20; i++) {
      const device = devices[i % devices.length];
      const status = statuses[i % statuses.length];
      const oiSession = uuidv4();
      const supplierRid = `EXT_ID_${1000 + i}`;
      const clientRid = `OI_CL_${5000 + i}`;
      
      const startedAt = new Date();
      startedAt.setMinutes(startedAt.getMinutes() - (i * 15));
      
      const completedAt = status !== 'started' ? new Date() : undefined;
      if (completedAt) completedAt.setMinutes(startedAt.getMinutes() + 10);

      const respondentData = {
        oiSession,
        projectCode,
        supplierCode,
        supplierName,
        supplierRid,
        clientRid,
        status,
        ipAddress: `192.168.1.${10 + i}`,
        userAgent: device.ua,
        deviceType: device.type,
        browser: device.browser,
        os: device.os,
        startedAt,
        completedAt,
        s2sVerified: status === 'complete' && i % 2 === 0,
        s2sVerifiedAt: status === 'complete' && i % 2 === 0 ? new Date() : undefined,
        isFakeSuspected: i % 10 === 0,
        fakeReason: i % 10 === 0 ? 'High fraud score detected' : undefined,
      };

      await (storage as any).createRespondent(respondentData);
      console.log(`Created respondent ${i}: ${status} (${device.type})`);
    }

    console.log('Seed COMPLETED');
  } catch (err: any) {
    console.error('Seed FAILED:', err.message);
    if (err.stack) console.error(err.stack);
  }
}

seed().catch(console.error);
