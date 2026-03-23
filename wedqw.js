const { Client } = require('pg');
require('dotenv').config();
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query('SELECT client_rid, sent_uid, survey_url, redirect_url FROM respondents WHERE project_code = \ ORDER BY started_at DESC LIMIT 5', ['WEDQW']);
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
run();
