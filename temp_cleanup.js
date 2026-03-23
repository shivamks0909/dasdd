import { insforge } from './server/insforge.js';
async function run() {
  const { error } = await insforge.database.from('respondents').delete().eq('project_code', 'PATHTEST');
  if (error) console.error(error);
  else console.log('Cleaned respondents for PATHTEST');
  process.exit(0);
}
run();
