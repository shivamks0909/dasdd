import { createClient } from "@insforge/sdk";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const db = createClient({ 
  baseUrl: process.env.INSFORGE_BASE_URL!, 
  anonKey: process.env.INSFORGE_API_KEY! 
}).database;

async function main() {
  const projectCode = 'TEST-CB-2024';
  
  // Clean up if exists
  await db.from("projects").delete().eq("project_code", projectCode);
  
  const { data, error } = await db.from("projects").insert([{
    project_code: projectCode,
    project_name: "Test Callback Project",
    client: "Internal Test",
    status: "active",
    rid_prefix: "TCB",
    rid_country_code: "IN",
    rid_padding: 4,
    rid_counter: 1,
    survey_url: "https://track.exploresearch.in/start/TEST?uid=",
    complete_url: "https://example.com/complete?rid={RID}",
    terminate_url: "https://example.com/terminate?rid={RID}",
    quotafull_url: "https://example.com/quotafull?rid={RID}",
    security_url: "https://example.com/security?rid={RID}"
  }]).select("id").single();

  if (error) {
    console.error("Error creating test project:", error.message);
  } else {
    console.log(`✅ Created test project: ${projectCode} (ID: ${data.id})`);
  }
}
main();
