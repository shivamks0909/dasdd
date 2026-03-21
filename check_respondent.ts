
import { storage } from './server/storage.js';

async function check() {
  const { data: respondents, error } = await (storage as any).insforge.database.from('respondents').select('*').order('started_at', { ascending: false }).limit(1);
  if (error) {
    console.error('Error fetching respondent:', error);
    return;
  }
  if (!respondents || respondents.length === 0) {
    console.log('No respondents found');
    return;
  }
  
  const last = respondents[0];
  const fs = await import('fs');
  fs.writeFileSync('respondent_data.json', JSON.stringify({
    id: last.id,
    extraParams: last.extra_params,
    oiSession: last.oi_session
  }, null, 2));
}

check().catch(console.error);
