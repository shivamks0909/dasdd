
import { insforge } from "./server/insforge";

async function repair() {
  const code = 'QWDQDQW';
  console.log(`Checking project ${code}...`);
  
  const { data: project, error } = await insforge.database
    .from('projects')
    .select('*')
    .eq('project_code', code)
    .maybeSingle();

  if (error) {
    console.error('Error fetching project:', error);
    return;
  }

  if (!project) {
    console.log('Project not found. Creating it...');
    const { error: insertError } = await insforge.database
      .from('projects')
      .insert({
        project_code: code,
        project_name: 'Verification Project',
        rid_prefix: 'OPISH',
        rid_country_code: 'IN',
        rid_padding: 4,
        status: 'active'
      });
    if (insertError) console.error('Insert Error:', insertError);
    else console.log('Project created.');
  } else {
    console.log('Project exists. Repairing settings...');
    const { error: updateError } = await insforge.database
      .from('projects')
      .update({
        rid_prefix: 'OPISH',
        rid_country_code: 'IN',
        rid_padding: 4,
        status: 'active'
      })
      .eq('id', project.id);
    if (updateError) console.error('Update Error:', updateError);
    else console.log('Project settings repaired.');
  }

  // Also check country survey
  const { data: survey } = await insforge.database
    .from('country_surveys')
    .select('*')
    .eq('project_code', code)
    .eq('country_code', 'IN')
    .maybeSingle();

  if (!survey) {
    console.log('Creating country survey...');
    await insforge.database.from('country_surveys').insert({
      project_code: code,
      country_code: 'IN',
      survey_url: 'https://track.opinioninsights.in/r/sdaweq/VERCEL/[UID]',
      status: 'active'
    });
  } else {
    console.log('Updating country survey URL...');
    await insforge.database.from('country_surveys').update({
      survey_url: 'https://track.opinioninsights.in/r/sdaweq/VERCEL/[UID]',
      status: 'active'
    }).eq('id', survey.id);
  }
}

repair().then(() => process.exit(0));
