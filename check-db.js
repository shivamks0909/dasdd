import { createClient } from '@insforge/sdk';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient({
  baseUrl: process.env.INSFORGE_BASE_URL || 'https://cpim43si.us-west.insforge.app',
  anonKey: process.env.INSFORGE_ANON_KEY
});

async function run() {
  console.log('Checking all projects...');
  const { data: pData, error: pErr } = await client.database.from('projects').select('id, project_code, status');
  if (pErr) {
    console.error('Project Error:', pErr);
  } else {
    console.log('Total Projects found:', pData?.length);
    console.log('Projects:', JSON.stringify(pData, null, 2));
  }

  console.log('Checking all suppliers...');
  const { data: sData, error: sErr } = await client.database.from('suppliers').select('id, name, code');
  if (sErr) {
    console.error('Supplier Error:', sErr);
  } else {
    console.log('Total Suppliers found:', sData?.length);
    console.log('Suppliers:', JSON.stringify(sData, null, 2));
  }
}

run();
