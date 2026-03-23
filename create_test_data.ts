import { insforge } from "./server/insforge.js";

async function setup() {
  console.log("Setting up test data...");

  // 1. Create Test Supplier
  const { data: sup, error: supErr } = await insforge.database
    .from("suppliers")
    .upsert([
      {
        code: "UIDSUP",
        name: "UID Test Supplier",
        complete_url: "https://example.com/complete?uid={uid}&pid={pid}",
        terminate_url: "https://example.com/terminate?uid={uid}&pid={pid}",
        quotafull_url: "https://example.com/quotafull?uid={uid}&pid={pid}",
        security_url: "https://example.com/security?uid={uid}&pid={pid}",
        uid_macro: "[uid]",
      },
    ])
    .select();

  if (supErr) console.error("Error creating supplier:", supErr);
  else console.log("Supplier UIDSUP created/updated");

  // 2. Create Test Project
  const { data: proj, error: projErr } = await insforge.database
    .from("projects")
    .upsert([
      {
        project_code: "UIDTEST",
        name: "UID Test Project",
        client_id: 1, // Assuming common client ID 1 exists
        status: "active",
        rid_counter: 0,
        client_uid_param: "uid",
        uid_injection_type: "auto",
      },
    ])
    .select();

  if (projErr) {
    console.error("Error creating project:", projErr);
    return;
  }
  const projectId = proj[0].id;
  console.log("Project UIDTEST created/updated, ID:", projectId);

  // 3. Create Country Survey config
  const { error: surveyErr } = await insforge.database.from("country_surveys").upsert([
    {
      project_id: projectId,
      project_code: "UIDTEST",
      country_code: "IN",
      survey_url: "https://track.opinioninsights.in/track?code=sdaweq&uid={RID}",
      status: "active",
    },
  ]);

  if (surveyErr) console.error("Error creating country survey:", surveyErr);
  else console.log("Country Survey for IN created/updated");
}

setup();
