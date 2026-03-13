const BASE_URL = 'http://localhost:3000';

async function test() {
  console.log('--- Testing E2E Flow ---');
  
  // 1. Login
  console.log('1. Attempting login...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  console.log('   Status:', loginRes.status);
  const loginData = await loginRes.json();
  if (!loginRes.ok) throw new Error('Login failed: ' + JSON.stringify(loginData));
  console.log('   Success! Token received.');
  const token = loginData.token;

  const suffix = Date.now().toString().slice(-6);
  const projectCode = `TEST_API_${suffix}`;
  const supplierCode = `TEST_SUP_${suffix}`;

  // 2. Create Project
  console.log(`2. Creating project ${projectCode}...`);
  const createProjRes = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      projectCode: projectCode,
      projectName: 'E2E Test Project',
      client: 'System Test',
      status: 'active'
    })
  });
  const project = await createProjRes.json();
  if (!createProjRes.ok) throw new Error('Project creation failed: ' + JSON.stringify(project));
  console.log('   Success! Project ID:', project.id);

  // 3. Create Supplier
  console.log(`3. Creating supplier ${supplierCode}...`);
  const createSupRes = await fetch(`${BASE_URL}/api/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      name: 'E2E Test Supplier',
      code: supplierCode,
      status: 'active'
    })
  });
  const supplier = await createSupRes.json();
  if (!createSupRes.ok) throw new Error('Supplier creation failed: ' + JSON.stringify(supplier));
  console.log('   Success! Supplier ID:', supplier.id);

  // 4. Create Country Survey
  console.log('4. Creating country survey for US...');
  const createSurveyRes = await fetch(`${BASE_URL}/api/projects/${project.id}/surveys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      countryCode: 'US',
      surveyUrl: 'http://localhost:3000/survey?oi_session={oi_session}&rid={RID}',
      status: 'active'
    })
  });
  const survey = await createSurveyRes.json();
  if (!createSurveyRes.ok) throw new Error('Survey creation failed: ' + JSON.stringify(survey));
  console.log('   Success!');

  // 5. Test Tracking Redirection
  console.log(`5. Testing tracking redirect (/r/${projectCode})...`);
  const trackRes = await fetch(`${BASE_URL}/r/${projectCode}?country=US&sup=${supplierCode}&uid=E2E_USER_01`, {
    redirect: 'manual'
  });
  
  console.log('   Status:', trackRes.status);
  const redirectLocation = trackRes.headers.get('location');
  console.log('   Redirect Location:', redirectLocation);

  if (![302, 307, 308].includes(trackRes.status) || !redirectLocation) {
    const body = await trackRes.text();
    console.error('   Error Body:', body);
    throw new Error(`Tracking failed: Expected redirect (302/307/308), got ${trackRes.status}`);
  }

  const redirectUrl = new URL(redirectLocation);
  const oiSession = redirectUrl.searchParams.get('oi_session');
  console.log('   Extracted oi_session:', oiSession);

  if (!oiSession) throw new Error('Tracking failed: Missing oi_session in redirect URL.');

  // 6. Test Callback
  console.log('6. Testing callback (/complete)...');
  const callbackRes = await fetch(`${BASE_URL}/complete?oi_session=${oiSession}`, {
    redirect: 'manual'
  });

  console.log('   Status:', callbackRes.status);
  const finalLocation = callbackRes.headers.get('location');
  console.log('   Final Landing Page:', finalLocation);

  if (![302, 307, 308].includes(callbackRes.status) || !finalLocation?.includes('/pages/complete')) {
    const body = await callbackRes.text();
    console.error('   Error Body:', body);
    throw new Error(`Callback failed: Expected redirect (302/307/308) to /pages/complete, got ${callbackRes.status} and location ${finalLocation}`);
  }

  console.log('--- E2E Flow SUCCESS ---');
}

test().catch(err => {
  console.error('--- E2E Flow FAILED ---');
  console.error(err);
  process.exit(1);
});
