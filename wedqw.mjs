import dotenv from 'dotenv';
import { createClient } from '@insforge/sdk';
import * as fs from 'fs';
dotenv.config();
async function run() {
  const insforge = createClient({ baseUrl: process.env.INSFORGE_BASE_URL, anonKey: process.env.INSFORGE_API_KEY });
  const { data, error } = await insforge.database.from('respondents').select('*').eq('project_code', 'WEDQW').order('started_at', {ascending: false}).limit(5);
  fs.writeFileSync('wedqw.json', JSON.stringify(data, null, 2));
  process.exit(0);
}
run();
