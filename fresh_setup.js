import { insforge } from './server/insforge.ts';

async function run() {
  const ts = Date.now();
  const PCODE = 'P' + ts;
  const SCODE = 'S' + ts;
  
  console.log(`Creating project ${PCODE} and supplier ${SCODE}...`);
  
  try {
    const { data: projData, error: projError } = await insforge.database.from('projects').insert([{
      project_code: PCODE,
      project_name: 'Path Test ' + ts,
      client: 'Internal',
      status: 'active',
      rid_prefix: 'PT',
      rid_country_code: 'IN',
      rid_padding: 4,
      rid_counter: 1,
      client_uid_param: 'uid',
      url_uid_position: 'path'
    }]).select();

    if (projError || !projData || projData.length === 0) {
      console.error('Project Insert Error:', projError?.message || 'No data returned');
      process.exit(1);
    }
    const projInsert = projData[0];

    const { error: csError } = await insforge.database.from('country_surveys').insert([{
      project_id: projInsert.id,
      project_code: PCODE,
      country_code: 'IN',
      survey_url: 'https://track.opinioninsights.in/r/sdaweq/VERCEL/[UID]',
      status: 'active'
    }]);

    if (csError) {
      console.error('Country Survey Insert Error:', csError.message);
      process.exit(1);
    }

    const { error: supError } = await insforge.database.from('suppliers').insert([{
      code: SCODE,
      name: 'Supplier ' + ts,
      status: 'active'
    }]);

    if (supError) {
      console.log('Supplier insert note:', supError.message);
    }

    console.log('\n--- SUCCESS_MARKER ---');
    console.log(`NEW_CODE=${PCODE}`);
    console.log(`NEW_SUP=${SCODE}`);
    console.log('--- SUCCESS_MARKER ---\n');
  } catch (err) {
    console.error('FATAL ERROR:', err);
    process.exit(1);
  }
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
