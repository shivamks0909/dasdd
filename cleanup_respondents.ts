
import { insforge } from "./server/insforge";

async function cleanup() {
  console.log("Cleaning up respondents for project SDAWEQ...");
  const { error } = await insforge.database
    .from("respondents")
    .delete()
    .eq("project_code", "SDAWEQ");
  
  if (error) {
    console.error("Cleanup error:", error);
  } else {
    console.log("Cleanup successful.");
  }
  process.exit(0);
}

cleanup();
