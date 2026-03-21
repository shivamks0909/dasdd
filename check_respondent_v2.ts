import { insforge } from './server/insforge.js';
import fs from 'fs';

async function check() {
  const log = (msg: string) => fs.appendFileSync('debug_check.log', msg + '\n');
  log('Starting check at ' + new Date().toISOString());
  
  try {
    const { data: respondents, error } = await insforge.database
      .from('respondents')
      .select('*')
      .order('id', { ascending: false }) // Sort by id if started_at is indexed differently
      .limit(5);
      
    if (error) {
      log('Error fetching: ' + JSON.stringify(error));
      return;
    }
    
    log(`Found ${respondents?.length || 0} respondents`);
    
    if (respondents && respondents.length > 0) {
      const last = respondents[0];
      log('ID: ' + last.id);
      log('Extra Params: ' + JSON.stringify(last.extra_params));
      log('OI Session: ' + last.oi_session);
      
      // Save for next step
      fs.writeFileSync('last_session.txt', last.oi_session);
    }
  } catch (err: any) {
    log('Exception: ' + err.message);
  }
}

check().catch(err => fs.appendFileSync('debug_check.log', 'Fatal: ' + err.message + '\n'));
