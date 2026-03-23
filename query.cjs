require('dotenv').config(); 
const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: process.env.DATABASE_URL }); 
async function main() { 
  try {
    const { rows } = await pool.query("SELECT project_code, survey_url, client_uid_param, uid_injection_type FROM projects WHERE project_code='WEDQW'"); 
    console.log('PROJ:', rows); 
    const { rows: rrows } = await pool.query("SELECT sent_uid, survey_url, redirect_url FROM respondents WHERE project_code='WEDQW' ORDER BY started_at DESC LIMIT 1"); 
    console.log('RESP:', rrows); 
  } catch (err) { console.error(err) }
  finally { process.exit(0); } 
} 
main();
