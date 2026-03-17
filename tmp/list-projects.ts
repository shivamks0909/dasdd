
import { createClient } from '@insforge/sdk';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient({
  baseUrl: process.env.INSFORGE_BASE_URL || '',
  anonKey: process.env.INSFORGE_ANON_KEY || ''
});

async function main() {
  const { data: projects } = await client.database.from('projects').select('project_code, status').limit(5);
  console.log('Recent projects:', projects);

  const { data: suppliers } = await client.database.from('suppliers').select('code').limit(5);
  console.log('Recent suppliers:', suppliers);
}

main().catch(console.error);
