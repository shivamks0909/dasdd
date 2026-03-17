
import { storage } from "./server/storage";

async function diagnose() {
  try {
    const username = "verify_user";
    const user = await storage.getSupplierUserByUsername(username);
    if (!user) {
      console.log("User not found");
      return;
    }
    console.log("User:", user);

    const access = await storage.getSupplierProjectAccess(user.id);
    console.log("Access Rows:", access);

    const projects = await storage.getAssignedProjects(user.id);
    console.log("Assigned Projects:", projects);

    const stats = await storage.getSupplierProjectsWithStats(user.id, user.supplierCode);
    console.log("Projects with Stats:", JSON.stringify(stats, null, 2));

    const respondents = await storage.getSupplierRespondents(user.supplierCode, ["PRJ_VERIFY"]);
    console.log("Respondents for PRJ_VERIFY:", respondents);

  } catch (e) {
    console.error(e);
  }
}

diagnose();
