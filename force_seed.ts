
import { storage } from "./server/storage";
import { insforge } from "./server/insforge";

async function forceSeed() {
  console.log("Starting force seed...");
  try {
    // 1. Manually check if PATHTEST exists
    const existing = await storage.getProjectByCode('PATHTEST');
    console.log("Existing PATHTEST check:", existing ? "Found" : "Not Found");

    if (!existing) {
      console.log("Creating PATHTEST project...");
      await storage.createProject({
        projectCode: 'PATHTEST',
        projectName: 'Path UID Test Project',
        client: 'Internal',
        status: 'active',
        ridPrefix: 'PT',
        ridCountryCode: 'IN',
        ridPadding: 4,
        ridCounter: 1,
        clientUidParam: 'uid',
        uidInjectionType: 'path'
      });
      console.log("PATHTEST project created.");
    } else {
       console.log("Updating PATHTEST project...");
       await storage.updateProject(existing.id, {
         status: 'active',
         uidInjectionType: 'path'
       });
       console.log("PATHTEST project updated.");
    }

    // 2. Create Country Survey
    console.log("Ensuring country survey...");
    const survey = await storage.getCountrySurveyByCode('PATHTEST', 'IN');
    if (!survey) {
        await storage.createCountrySurvey({
            projectCode: 'PATHTEST',
            countryCode: 'IN',
            surveyUrl: 'https://track.opinioninsights.in/r/sdaweq/VERCEL/[UID]',
            status: 'active',
            projectId: (await storage.getProjectByCode('PATHTEST'))!.id
        });
        console.log("Country survey created.");
    } else {
        console.log("Country survey already exists.");
    }

    // 3. Ensure Supplier
    console.log("Ensuring supplier PATHSUP...");
    const supplier = await storage.getSupplierByCode('PATHSUP');
    if (!supplier) {
        await storage.createSupplier({
            code: 'PATHSUP',
            name: 'Path Test Supplier',
            status: 'active',
            type: 'external'
        });
        console.log("Supplier created.");
    } else {
        console.log("Supplier already exists.");
    }

    console.log("Seed complete.");
  } catch (err) {
    console.error("Seed failed:", err);
  }
  process.exit(0);
}

forceSeed();
