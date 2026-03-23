import { createClient } from '@insforge/sdk';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient({
  baseUrl: process.env.INSFORGE_BASE_URL || 'https://cpim43si.us-west.insforge.app',
  anonKey: process.env.INSFORGE_ANON_KEY
});

async function run() {
  console.log('Seeding test data...');
  
  // 1. Project
  console.log('Upserting project...');
  const { data: pData, error: pErr } = await client.database.from('projects').upsert([{
    project_code: 'UIDTEST',
    project_name: 'UID Test Project',
    client: 'Test Client',
    status: 'active',
    rid_prefix: 'UID',
    rid_country_code: 'IN',
    rid_padding: 4,
    complete_url: 'https://track.opinioninsights.in/track/complete?oi_session={SESSION}',
    terminate_url: 'https://track.opinioninsights.in/track/terminate',
    quotafull_url: 'https://track.opinioninsights.in/track/quota',
    security_url: 'https://track.opinioninsights.in/track/security',
    client_uid_param: 'uid',
    force_pid_as_uid: false,
    uid_injection_type: 'auto'
  }], { onConflict: 'project_code' }).select();

  if (pErr) {
    console.error('Project Error:', pErr);
    return;
  }
  const project = pData[0];
  console.log('Project Ready:', project.id);

  // 2. Country Survey
  console.log('Upserting country survey...');
  const { data: csData, error: csErr } = await client.database.from('country_surveys').upsert([{
    project_id: project.id,
    project_code: 'UIDTEST',
    country_code: 'IN',
    survey_url: 'https://track.opinioninsights.in/r/sdaweq/VERCEL/[UID]',
    status: 'active'
  }], { onConflict: 'project_code,country_code' }).select();

  if (csErr) console.error('Country Survey Error:', csErr);
  else console.log('Country Survey Ready:', csData[0].id);

  // 3. Supplier
  console.log('Upserting supplier...');
  const { data: sData, error: sErr } = await client.database.from('suppliers').upsert([{
    name: 'UID Supplier',
    code: 'UIDSUP',
    complete_url: 'https://supplier.com/complete?uid={RID}',
    terminate_url: 'https://supplier.com/term?uid={RID}',
    quotafull_url: 'https://supplier.com/qf?uid={RID}',
    security_url: 'https://supplier.com/sec?uid={RID}',
    uid_macro: '[uid]'
  }], { onConflict: 'code' }).select();

  if (sErr) console.error('Supplier Error:', sErr);
  else console.log('Supplier Ready:', sData[0].id);
}

run();
