
import { storage } from './server/storage.ts';
async function seed() {
  const projects = await storage.getProjects();
  const project = projects.find(p => p.projectCode === 'EWDQD');
  if (!project) {
    console.log('Project EWDQD not found');
    process.exit(1);
  }
  
  // Create country survey
  try {
    const survey = await storage.createCountrySurvey({
      projectId: project.id,
      projectCode: project.projectCode, // Added
      countryCode: 'IN',
      surveyUrl: 'https://track.exploresearch.in/start/TEST_INJECTION?uid=&pid=', // Changed from clientSurveyUrl
      status: 'active'
    } as any);
    console.log('Created test survey:', JSON.stringify(survey));
    process.exit(0);
  } catch (err) {
    console.error('Error creating survey:', err);
    process.exit(1);
  }
}
seed();
