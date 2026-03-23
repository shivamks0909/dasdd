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
  const { data, error } = await db.from("projects").select("project_code, project_name");
  if (error) {
    console.error("Error fetching projects:", error.message);
  } else {
    console.log("Projects in DB:");
    data.forEach(p => console.log(`- ${p.project_code}: ${p.project_name}`));
  }
}
main();
