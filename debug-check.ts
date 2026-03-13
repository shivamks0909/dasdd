import { storage } from "./server/storage";

async function run() {
  const projects = await storage.getProjects();
  console.log("Projects:", JSON.stringify(projects, null, 2));
  
  const respondent = await storage.getRespondentBySession(projects[0].projectCode); // Wait, this isn't a valid way to get 'latest'
  // I'll use a raw query or just fetch by a known session if I had one.
  // Actually, I can just list all respondents for the project.
  const respondents = await storage.getRespondentsByProject(projects[0].projectCode);
  console.log("Latest Respondent:", JSON.stringify(respondents[respondents.length - 1], null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
