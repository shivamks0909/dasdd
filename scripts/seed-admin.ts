import { storage, seedAdmin } from "../server/storage";

async function run() {
  console.log("Seeding started...");
  try {
    await seedAdmin(storage);
    console.log("Seeding completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

run();
