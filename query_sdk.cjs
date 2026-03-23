require('dotenv').config();
const { createClient } = require('@insforge/sdk');
const insforge = createClient({ baseUrl: process.env.INSFORGE_URL, anonKey: process.env.INSFORGE_ANON_KEY });
async function run() {
  const { data: p } = await insforge.database.from('projects').select('project_code, survey_url, client_uid_param, uid_injection_type').eq('project_code', 'WEDQW');
  console.log('PROJ:', p);
  const { data: r } = await insforge.database.from('respondents').select('sent_uid, survey_url, redirect_url').eq('project_code', 'WEDQW').order('started_at', { ascending: false }).limit(1);
  console.log('RESP:', r);
  process.exit(0);
}
run();
