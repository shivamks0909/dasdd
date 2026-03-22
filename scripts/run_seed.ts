import { db } from "../server/db";
import { sql } from "drizzle-orm";
import fs from "fs";

async function main() {
  const query = fs.readFileSync("seed_test.sql", "utf-8");
  try {
    await db.execute(sql.raw(query));
    console.log("Seeding complete.");
  } catch (err) {
    console.error("Error seeding:", err);
  }
  process.exit(0);
}

main();
