import dotenv from 'dotenv';
import { createClient } from '@insforge/sdk';
dotenv.config();
async function run() {
  const insforge = createClient({ baseUrl: process.env.INSFORGE_BASE_URL, anonKey: process.env.INSFORGE_API_KEY });
  const { data } = await insforge.database.from('projects').select('*').eq('project_code', 'WEDQW').limit(1);
  if (data && data[0]) {
    const p = data[0];
    // Print all fields with 'url' or 'uid' or 'survey' in the key name
    for (const [k, v] of Object.entries(p)) {
      if (k.toLowerCase().includes('url') || k.toLowerCase().includes('uid') || k.toLowerCase().includes('survey') || k.toLowerCase().includes('pid') || k.toLowerCase().includes('track')) {
        console.log(k + ':', v);
      }
    }
  }
  process.exit(0);
}
run();
