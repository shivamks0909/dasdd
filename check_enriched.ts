
import { storage } from "./server/storage";

async function check() {
  try {
    const respondents = await storage.getEnrichedRespondents(5);
    console.log("Enriched Respondents Count:", respondents.length);
    if (respondents.length > 0) {
      console.log("First Respondent Sample:", JSON.stringify(respondents[0], null, 2));
    } else {
      console.log("No respondents found.");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

check();
