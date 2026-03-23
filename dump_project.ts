
import { storage } from "./server/storage";

async function main() {
    try {
        const project = await storage.getProjectByCode("EXR");
        console.log("Project EXR:", JSON.stringify(project, null, 2));
        
        const surveys = await storage.getCountrySurveysByProject("EXR");
        console.log("Surveys for EXR:", JSON.stringify(surveys, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

main();
