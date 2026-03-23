
import { insforge } from "./server/insforge";

async function verifySetup() {
  console.log("Setting up SDAWEQ project for RID browser test...");
  
  const projectData = {
    project_code: "SDAWEQ",
    project_name: "RID Browser Test",
    status: "active",
    rid_prefix: "OPI",
    rid_country_code: "TS",
    rid_padding: 4,
    rid_counter: 100
  };

  const { error: pError } = await insforge.database
    .from("projects")
    .upsert([projectData], { onConflict: 'project_code' });

  if (pError) {
    console.error("Project Upsert Error:", pError);
  } else {
    console.log("Project SDAWEQ is ready.");
  }

  const surveyData = {
    project_code: "SDAWEQ",
    country_code: "IN",
    survey_url: "https://track.opinioninsights.in/r/sdaweq/VERCEL/[UID]",
    status: "active"
  };

  const { error: sError } = await insforge.database
    .from("country_surveys")
    .upsert([surveyData], { onConflict: 'project_code,country_code' });

  if (sError) {
    console.error("Survey Upsert Error:", sError);
  } else {
    console.log("Country Survey (IN) is ready.");
  }

  process.exit(0);
}

verifySetup();
