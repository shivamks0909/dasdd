
import { storage } from './server/storage';

async function setup() {
  console.log('--- Setting up test data ---');
  try {
    // Create a Project
    const project = await (storage as any).createProject({
    projectName: 'Test Project',
    projectCode: 'TEST-PROJ-1',
    client: 'Test Client',
    status: 'active',
    ridPrefix: 'T',
    ridCountryCode: 'US',
    ridPadding: 4,
    ridCounter: 0
  });
  console.log(`Created Project: ${project.projectCode} (ID: ${project.id})`);
  
  // Create a Country Survey
  await (storage as any).createCountrySurvey({
    projectId: project.id,
    projectCode: project.projectCode,
    countryCode: 'US',
    surveyUrl: 'https://survey.test/start?pid={pid}&rid={rid}',
    status: 'active'
  });
  console.log('Created Country Survey for US');

  // Create a Supplier
  const supplier = await (storage as any).createSupplier({
    name: 'Test Supplier',
    code: 'TEST_SUP',
    completeUrl: 'https://supplier.test/complete?uid={{uid}}&age={{age}}&gender={{gender}}',
    terminateUrl: 'https://supplier.test/terminate?uid={{uid}}',
    quotafullUrl: 'https://supplier.test/quotafull?uid={{uid}}',
    securityUrl: 'https://supplier.test/security?uid={{uid}}',
    status: 'active'
  });
  console.log(`Created Supplier: ${supplier.code}`);

  // Link Supplier to Project
  await (storage as any).createProjectSupplier({
    projectId: project.id,
    supplierId: supplier.id,
    cpi: 0.5,
    quota: 50,
    status: 'active'
  });
  console.log('Linked Supplier to Project');
  } catch (err: any) {
    console.error('Setup FAILED:', err.message);
    if (err.stack) console.error(err.stack);
    console.error('Full error:', JSON.stringify(err, null, 2));
  }
}

setup().catch(console.error);
