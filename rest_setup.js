
const baseUrl = 'https://cpim43si.us-west.insforge.app';
const apiKey = '0537e7df-6a75-4081-9988-921d3e8e7855';

async function setup() {
  const ts = Date.now();
  const PCODE = 'P' + ts;
  const SCODE = 'S' + ts;
  
  console.log(`Setting up ${PCODE} / ${SCODE}...`);
  
  // 1. Create Project
  const pResp = await fetch(`${baseUrl}/rest/v1/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify([{
      project_code: PCODE,
      project_name: 'Path Test ' + ts,
      client: 'Internal',
      status: 'active',
      rid_prefix: 'PT',
      rid_country_code: 'IN',
      rid_padding: 4,
      rid_counter: 1,
      client_uid_param: 'uid',
      url_uid_position: 'path'
    }])
  });
  
  const proj = await pResp.json();
  if (!proj[0]) throw new Error('Project insert failed: ' + JSON.stringify(proj));
  const pid = proj[0].id;

  // 2. Create Country Survey
  await fetch(`${baseUrl}/rest/v1/country_surveys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify([{
      project_id: pid,
      project_code: PCODE,
      country_code: 'IN',
      survey_url: 'https://track.opinioninsights.in/r/sdaweq/VERCEL/[UID]',
      status: 'active'
    }])
  });

  // 3. Create Supplier
  await fetch(`${baseUrl}/rest/v1/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify([{
      code: SCODE,
      name: 'Supplier ' + ts,
      status: 'active'
    }])
  });

  console.log('\n--- SUCCESS ---');
  console.log(`NEW_URL: http://localhost:3000/track?code=${PCODE}&country=IN&sup=${SCODE}&uid=U${ts}`);
  console.log('--- SUCCESS ---\n');
}

setup().catch(console.error);
