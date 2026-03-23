
import { storage } from "./server/storage";

async function main() {
    console.log("Direct storage call test...");
    const survey = await storage.getCountrySurveyByCode("PATHTEST", "GL");
    console.log("Survey result:", JSON.stringify(survey, null, 2));
    
    const p = await storage.getProjectByCode("PATHTEST");
    console.log("Project result:", JSON.stringify(p, null, 2));
}

main();
