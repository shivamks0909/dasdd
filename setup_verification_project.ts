
import { insforge } from "./server/insforge";

async function setup() {
  console.log("Setting up project SDAWEQ for verification...");
  
  // 1. Create Project
  const { data: project, error: pError } = await insforge.database
    .from("projects")
    .insert([{
      project_code: "SDAWEQ",
      project_name: "Verification Project",
      status: "active",
      rid_prefix: "OPISH",
      rid_country_code: "IN",
      rid_padding: 4,
      rid_counter: 0
    }])
    .select()
    .single();

  if (pError) {
    console.error("Project creation error:", pError);
    // If it already exists, just get it
    const { data: existing } = await insforge.database
      .from("projects")
      .select("*")
      .eq("project_code", "SDAWEQ")
      .single();
    if (!existing) process.exit(1);
    console.log("Using existing project.");
  } else {
    console.log("Project created:", project.id);
  }

  // 2. Create Country Survey
  const { data: survey, error: sError } = await insforge.database
    .from("country_surveys")
    .insert([{
      project_code: "SDAWEQ",
      country_code: "IN",
      survey_url: "https://track.opinioninsights.in/r/sdaweq/VERCEL/[UID]",
      status: "active"
    }])
    .select()
    .single();

  if (sError) {
    console.error("Country survey creation error:", sError);
  } else {
    console.log("Country survey created:", survey.id);
  }

  process.exit(0);
}

setup();
