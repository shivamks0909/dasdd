
import { storage } from "./server/storage";

async function checkSuppliers() {
  console.log("--- Suppliers ---");
  const suppliers = await storage.listSuppliers();
  console.log(JSON.stringify(suppliers, null, 2));

  console.log("\n--- Projects ---");
  const projects = await storage.listProjects();
  console.log(JSON.stringify(projects, null, 2));
}

checkSuppliers().catch(console.error);
