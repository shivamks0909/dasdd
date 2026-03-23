import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { projects, suppliers, respondents } from './shared/schema';
import { eq } from 'drizzle-orm';

import "dotenv/config";
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl?.startsWith("postgres://")) {
  databaseUrl = databaseUrl.replace("postgres://", "postgresql://");
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

const db = drizzle(pool);

const BASE_URL = 'https://track.opinioninsights.in';

async function runTests() {
  console.log('--- STARTING FINAL E2E REDIRECT TESTS ---');
  
  // Create Test Project
  const projectCode = `REDTEST_${Date.now()}`;
  console.log(`\n[Setup] Creating project: ${projectCode}`);
  
  const [project] = await db.insert(projects).values({
    projectCode,
    name: 'E2E Redirect Test Project',
    country: 'IN',
    status: 'active',
    clientSurveyUrl: 'https://track.opinioninsights.in/VERCEL/[UID]',
    completeUrl: 'https://test.supplier.com/complete?uid=[UID]',
    terminateUrl: 'https://test.supplier.com/terminate?uid=[UID]',
    quotafullUrl: 'https://test.supplier.com/quotafull?uid=[UID]',
    securityUrl: 'https://test.supplier.com/security?uid=[UID]'
  }).returning();

  // Create Test Suppliers
  const sup1 = `TSUP1_${Date.now()}`;
  const sup2 = `TSUP2_${Date.now()}`;
  console.log(`[Setup] Creating suppliers: ${sup1}, ${sup2}`);
  
  await db.insert(suppliers).values([
    {
      supplierCode: sup1,
      name: 'Test Supplier 1',
      completeUrl: 'https://tsup1.com/comp?id=[UID]',
      terminateUrl: 'https://tsup1.com/term?id=[UID]',
      quotafullUrl: 'https://tsup1.com/qf?id=[UID]',
      securityUrl: 'https://tsup1.com/sec?id=[UID]',
    },
    {
      supplierCode: sup2,
      name: 'Test Supplier 2',
      completeUrl: 'https://tsup2.com/comp?id=[UID]',
      terminateUrl: 'https://tsup2.com/term?id=[UID]',
      quotafullUrl: 'https://tsup2.com/qf?id=[UID]',
      securityUrl: 'https://tsup2.com/sec?id=[UID]',
    }
  ]);

  async function testRedirect(name: string, trackUrl: string, expectedClientRidFragment: string, callbackType: string, expectedFinalUrlFragment: string, missingSession: boolean = false) {
    console.log(`\n=== Running Test: ${name} ===`);
    console.log(`Hitting Tracker: ${trackUrl}`);
    
    try {
      // 1. Hit Tracker
      const trackRes = await fetch(trackUrl, { redirect: 'manual' });
      const trackRedirectUrl = trackRes.headers.get('location');
      
      console.log(`Redirected to: ${trackRedirectUrl}`);
      
      if (!trackRedirectUrl) {
         throw new Error('No redirect from tracker!');
      }

      if (!trackRedirectUrl.includes(expectedClientRidFragment)) {
        throw new Error(`Expected redirect to contain '${expectedClientRidFragment}', got: ${trackRedirectUrl}`);
      }

      // Extract oi_session from URL
      let oiSession = '';
      const sessionMatch = trackRedirectUrl.match(/oi_session=([^&]+)/);
      if (sessionMatch) {
         oiSession = sessionMatch[1];
      } else {
         throw new Error('oi_session not appended to client survey URL!');
      }

      // Get respondent from DB
      const resps = await db.select().from(respondents).where(eq(respondents.oiSession, oiSession));
      if (resps.length !== 1) {
         throw new Error('Respondent not found in DB!');
      }
      const resp = resps[0];
      
      console.log(`DB Client RID: ${resp.clientRid}, Supplier RID: ${resp.supplierRid}`);

      // 2. Simulate Callback
      let callbackUrl = `${BASE_URL}/api/${callbackType}?uid=${resp.clientRid}`;
      if (!missingSession) {
         callbackUrl += `&oi_session=${oiSession}`;
      } else {
         console.log('Testing missing oi_session mode (interceptor/fallback test)');
         // Simulate hitting the static route that redirects to API
         callbackUrl = `${BASE_URL}/${callbackType}?uid=${resp.clientRid}`;
      }

      console.log(`Simulating callback: ${callbackUrl}`);
      
      const cbRes = await fetch(callbackUrl, { redirect: 'manual' });
      let finalRedirectUrl = cbRes.headers.get('location');
      
      // If it's the interceptor (307), follow it once to the API
      if (cbRes.status === 307 || cbRes.status === 308) {
         console.log(`Interceptor caught! Redirecting to: ${finalRedirectUrl}`);
         
         // Ensure the intercept URL is absolute
         let interceptFetchUrl = finalRedirectUrl;
         if (interceptFetchUrl && interceptFetchUrl.startsWith('/')) {
             interceptFetchUrl = `${BASE_URL}${interceptFetchUrl}`;
         }
         
         const apiRes = await fetch(interceptFetchUrl!, { redirect: 'manual' });
         finalRedirectUrl = apiRes.headers.get('location');
      }

      console.log(`Final Redirect: ${finalRedirectUrl}`);
      
      if (!finalRedirectUrl) {
         throw new Error('No final redirect from callback!');
      }

      if (!finalRedirectUrl.includes(expectedFinalUrlFragment)) {
        throw new Error(`Expected final redirect to contain '${expectedFinalUrlFragment}', got: ${finalRedirectUrl}`);
      }
      
      console.log(`✅ [PASS] ${name}`);
      return true;

    } catch (e: any) {
      console.error(`❌ [FAIL] ${name} - Error: ${e.message}`);
      return false;
    }
  }

  // T1: Fixed UID (No Supplier) - Direct
  const t1Res = await testRedirect(
    'T1: Fixed UID (Direct)',
    `${BASE_URL}/track?code=${projectCode}&uid=FIXED_UID_001`,
    'VERCEL/FIXED_UID_001', // Since it's direct, supplier_rid == client_rid initially actually wait
    'complete',
    '/pages/complete?pid=' // No supplier, lands on generic complete
  );

  // T2: Test UID + Admin Tool change
  // We can't easily simulate the admin tool UI click here, but we can update the DB directly
  console.log('\n=== Running Test: T2 (Test UID + DB Change) ===');
  const t2TrackUrl = `${BASE_URL}/track?code=${projectCode}&uid=TEST_UID_002`;
  const t2TrackRes = await fetch(t2TrackUrl, { redirect: 'manual' });
  let t2Session = '';
  const sessionMatch = (t2TrackRes.headers.get('location') || '').match(/oi_session=([^&]+)/);
  if (sessionMatch) t2Session = sessionMatch[1];
  
  if (t2Session) {
    // Admin changes UID
    await db.update(respondents).set({ clientRid: 'CHANGED_VIA_ADMIN_002' }).where(eq(respondents.oiSession, t2Session));
    console.log('Admin updated UID in DB');
    
    // Test missing session callback
    const t2CbRes = await fetch(`${BASE_URL}/complete?uid=CHANGED_VIA_ADMIN_002`, { redirect: 'manual' });
    let finalUrl = t2CbRes.headers.get('location');
    if (t2CbRes.status === 307 && finalUrl) {
       let interceptFetchUrl = finalUrl.startsWith('/') ? `${BASE_URL}${finalUrl}` : finalUrl;
       const apiRes = await fetch(interceptFetchUrl, { redirect: 'manual' });
       finalUrl = apiRes.headers.get('location');
    }
    if (finalUrl && finalUrl.includes('/pages/complete')) {
       console.log('✅ [PASS] T2: Changed UID callback successful (intercepted & found)');
    } else {
       console.error(`❌ [FAIL] T2: Expected /pages/complete, got ${finalUrl}`);
    }
  }

  // T3: Direct landing page with uid param
  const t3Res = await testRedirect(
    'T3: Direct landing page with random uid',
    `${BASE_URL}/track?code=${projectCode}&uid=TEST_UID_003`,
    'VERCEL/TEST_UID_003',
    'terminate',
    '/pages/terminate?pid=', // Lands on internal terminate
    true // Test missing session
  );

  // T4: Supplier UID routing through supplier code
  const t4Res = await testRedirect(
    'T4: Supplier UID routing',
    `${BASE_URL}/track?code=${projectCode}&sup=${sup1}&uid=SUP1_UID_004`,
    'VERCEL/', // Will be a generated client_rid like PRJXXX_...
    'complete',
    'tsup1.com/comp?id=SUP1_UID_004' // Resolves back to supplier UID
  );

  // T5: Supplier UID + admin tool UID change
  console.log('\n=== Running Test: T5 (Supplier + Admin UID Change) ===');
  const t5TrackUrl = `${BASE_URL}/track?code=${projectCode}&sup=${sup2}&uid=SUP2_UID_005`;
  const t5TrackRes = await fetch(t5TrackUrl, { redirect: 'manual' });
  let t5Session = '';
  const t5SessionMatch = (t5TrackRes.headers.get('location') || '').match(/oi_session=([^&]+)/);
  if (t5SessionMatch) t5Session = t5SessionMatch[1];
  
  if (t5Session) {
    // Admin changes UID
    await db.update(respondents).set({ clientRid: 'CHANGED_SUP_005' }).where(eq(respondents.oiSession, t5Session));
    console.log('Admin updated UID in DB');
    
    // Simulate callback with new ID
    const t5CbUrl = `${BASE_URL}/api/quotafull?uid=CHANGED_SUP_005`;
    const t5CbRes = await fetch(t5CbUrl, { redirect: 'manual' });
    const finalUrl = t5CbRes.headers.get('location');
    
    if (finalUrl && finalUrl.includes('tsup2.com/qf?id=SUP2_UID_005')) {
       console.log('✅ [PASS] T5: Changed Supplier UID mapped back to true Supplier URI');
    } else {
       console.error(`❌ [FAIL] T5: Expected tsup2.com/qf?id=SUP2_UID_005, got ${finalUrl}`);
    }
  }

  console.log('\n--- TESTS COMPLETE ---');
  process.exit(0);
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
