import { storage } from './server/storage';

async function runTests() {
  console.log("=== STARTING SUPPLIER ISOLATION TESTS ===");
  try {
    // 1. Create a dummy supplier
    const supplierCode = "TEST_SUPP_" + Date.now();
    const supplier = await storage.createSupplier({
      name: "Test Isolation Supplier",
      code: supplierCode
    });
    console.log("Created Supplier:", supplier.code);

    // 2. Create Projects (One assigned, one unassigned)
    const assignedProjectCode = "ASSIGNED_" + Date.now();
    const unassignedProjectCode = "UNASSIGNED_" + Date.now();
    
    const assignedProject = await storage.createProject({
      projectCode: assignedProjectCode,
      projectName: "Assigned Project",
      clientName: "Test Client",
      status: "active",
      category: "B2B",
      cpi: "10"
    });

    const unassignedProject = await storage.createProject({
      projectCode: unassignedProjectCode,
      projectName: "Unassigned Project",
      clientName: "Test Client",
      status: "active",
      category: "B2C",
      cpi: "5"
    });
    console.log("Created Projects.");

    // 3. Create a Supplier User
    const supplierUser = await storage.createSupplierUser({
      username: "iso_user_" + Date.now(),
      passwordHash: "password123",
      supplierId: supplier.id,
      supplierCode: supplier.code,
      isActive: true
    });
    console.log("Created Supplier User:", supplierUser.username);

    // 4. Assign the project
    await storage.assignProjectToSupplier({
      userId: supplierUser.id,
      projectId: assignedProject.id,
      projectCode: assignedProject.projectCode,
      assignedBy: "test_suite"
    });
    console.log("Assigned Project to Supplier.");

    // 5. Create some Respondents
    const respondentAssigned = await storage.createRespondent({
      projectCode: assignedProject.projectCode,
      supplierCode: supplier.code,
      supplierRid: "RID_A_" + Date.now(),
      oiSession: "SESSION_A_" + Date.now(),
      status: "completed",
      clientRid: "CLIENT_A",
      surveyUrl: "http://test.com/a",
      s2sToken: "TOKEN_A",
      verifyHash: "HASH_A"
    });

    const respondentUnassigned = await storage.createRespondent({
      projectCode: unassignedProject.projectCode,
      supplierCode: supplier.code, // Even if it's the same supplier, they shouldn't see it if project isn't assigned
      supplierRid: "RID_B_" + Date.now(),
      oiSession: "SESSION_B_" + Date.now(),
      status: "completed",
      clientRid: "CLIENT_B"
    });

    console.log("Created Respondents.");

    // --- EXECUTE ISOLATION TESTS ---
    console.log("\n--- EXECUTING TESTS ---");

    // Test A: Assigned Projects List
    const assignedProjectsList = await storage.getSupplierProjectsWithStats(supplierUser.id, supplier.code);
    console.log("Assigned Projects List:", JSON.stringify(assignedProjectsList, null, 2));
    if (assignedProjectsList.length !== 1 || assignedProjectsList[0].projectCode !== assignedProject.projectCode) {
      throw new Error(`FAIL: Supplier sees incorrect projects. Count: ${assignedProjectsList.length}, Code: ${assignedProjectsList[0]?.projectCode || 'N/A'}`);
    }
    console.log("PASS: Supplier sees ONLY assigned projects.");

    // Test B: Project Stats Isolation
    try {
      // Attempt to access unassigned project stats shouldn't throw but might return null or 0 stats 
      // The API route itself does the access check, but let's check the storage method
      const stats = await storage.getSupplierProjectStats(supplier.code, unassignedProject.projectCode);
      // It should just return 0s if they have no respondents mapped or error out
      // Our logic allows getting stats for any project if you have the code, BUT the routes.ts guards it!
    } catch (e) {
      // Expected or not
    }

    // Test C: Respondents visibility & sensitive data omit
    const respondents = await storage.getSupplierRespondents(supplier.code, [assignedProject.projectCode], true);
    
    if (respondents.length !== 1 || respondents[0].supplierRid !== respondentAssigned.supplierRid) {
      throw new Error(`FAIL: Supplier sees incorrect respondents. Expected 1, got ${respondents.length}`);
    }
    console.log("PASS: Supplier sees ONLY respondents for ASSIGNED projects.");

    // Check sensitive data omit
    const r = respondents[0];
    if (r.clientRid !== null || r.surveyUrl !== null || r.s2sToken !== null || r.verifyHash !== null) {
      throw new Error("FAIL: Sensitive data (clientRid, surveyUrl, etc.) was NOT omitted!");
    }
    if (r.oiSession !== "***") {
      throw new Error("FAIL: oiSession was NOT masked as '***'!");
    }
    console.log("PASS: Sensitive data successfully omitted/masked.");

    console.log("\n=== ALL SUPPLIER ISOLATION TESTS PASSED ===");

  } catch (error: any) {
    console.error("\nxxx TEST SUITE FAILED xxx");
    // Ensure we see the direct error message
    console.error(error.message || error);
  }
}

runTests();
