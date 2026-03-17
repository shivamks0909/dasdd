
import { storage } from "./server/storage";
import bcrypt from "bcryptjs";

async function setup() {
  try {
    const supplierCode = "SUPP_VERIFY";
    let supplier = await storage.getSupplierByCode(supplierCode);
    if (!supplier) {
      supplier = await storage.createSupplier({
        name: "Verification Supplier",
        code: supplierCode
      });
    }

    const username = "verify_user";
    let user = await storage.getSupplierUserByUsername(username);
    if (!user) {
      const passwordHash = await bcrypt.hash("password123", 10);
      user = await storage.createSupplierUser({
        username,
        passwordHash,
        supplierId: supplier.id,
        supplierCode: supplier.code,
        isActive: true
      });
    }

    // Create a project and assign it
    const pCode = "PRJ_VERIFY";
    let project = await storage.getProjectByCode(pCode);
    if (!project) {
        project = await storage.createProject({
            projectCode: pCode,
            projectName: "Verification Project",
            status: "active"
        });
    }

    // Assign
    await storage.assignProjectToSupplier({
        userId: user.id,
        projectId: project.id,
        projectCode: project.projectCode,
        assignedBy: "admin"
    });

    console.log("Verification account ready:");
    console.log("URL: /supplier/login");
    console.log("Username: verify_user");
    console.log("Password: password123");

  } catch (e) {
    console.error(e);
  }
}

setup();
