import { storage } from "../server/storage.js";

async function addMackSupplier() {
  console.log("Checking if Mack Insights supplier already exists...");
  
  const existing = await storage.getSupplierByCode("MACK");
  
  if (existing) {
    console.log("Mack Insights supplier already exists. Updating URLs...");
    await storage.updateSupplier(existing.id, {
      name: "Mack Insights",
      completeUrl: "https://dashboard.mackinsights.com/redirect/complete?pid={pid}&uid={uid}",
      terminateUrl: "https://dashboard.mackinsights.com/redirect/terminate?pid={{pid}}&uid={{uid}}",
      quotafullUrl: "https://dashboard.mackinsights.com/redirect/quotafull?pid={{pid}}&uid={{uid}}",
      securityUrl: "https://dashboard.mackinsights.com/redirect/security?pid={{pid}}&uid={{uid}}"
    });
    console.log("Successfully updated Mack Insights supplier.");
  } else {
    console.log("Adding new Mack Insights supplier...");
    await storage.createSupplier({
      name: "Mack Insights",
      code: "MACK",
      completeUrl: "https://dashboard.mackinsights.com/redirect/complete?pid={pid}&uid={uid}",
      terminateUrl: "https://dashboard.mackinsights.com/redirect/terminate?pid={{pid}}&uid={{uid}}",
      quotafullUrl: "https://dashboard.mackinsights.com/redirect/quotafull?pid={{pid}}&uid={{uid}}",
      securityUrl: "https://dashboard.mackinsights.com/redirect/security?pid={{pid}}&uid={{uid}}"
    });
    console.log("Successfully added Mack Insights supplier.");
  }
}

addMackSupplier()
  .then(() => {
    console.log("Script completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error adding Mack Insights supplier:", err);
    process.exit(1);
  });
