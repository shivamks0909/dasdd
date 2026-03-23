
import { insforge } from "./server/insforge";

async function checkProject() {
  console.log("Checking project QWDQDQW...");
  const { data: project, error: pError } = await insforge.database
    .from("projects")
    .select("*")
    .eq("project_code", "QWDQDQW")
    .maybeSingle();

  if (pError) {
    console.error("Project Fetch Error:", pError);
    process.exit(1);
  }

  if (!project) {
    console.log("Project QWDQDQW not found.");
  } else {
    console.log("Current Project Data:", JSON.stringify(project, null, 2));
    
    // Repair if needed
    if (!project.rid_prefix || !project.rid_country_code) {
      console.log("Repairing RID settings...");
      const { error: uError } = await insforge.database
        .from("projects")
        .update({
          rid_prefix: "OPISH",
          rid_country_code: "IN",
          rid_padding: 4,
          status: "active"
        })
        .eq("project_code", "QWDQDQW");
      
      if (uError) console.error("Update Error:", uError);
      else console.log("Project repaired.");
    }
  }

  const { data: survey, error: sError } = await insforge.database
    .from("country_surveys")
    .select("*")
    .eq("project_code", "QWDQDQW")
    .eq("country_code", "IN")
    .maybeSingle();

  if (sError) console.error("Survey Error:", sError);
  if (survey) {
    console.log("Current Survey URL:", survey.survey_url);
    if (!survey.survey_url.includes("[UID]")) {
        console.log("Updating survey URL to path-based placeholder...");
        await insforge.database
            .from("country_surveys")
            .update({ survey_url: "https://track.opinioninsights.in/r/sdaweq/VERCEL/[UID]" })
            .eq("id", survey.id);
    }
  }

  process.exit(0);
}

checkProject();
