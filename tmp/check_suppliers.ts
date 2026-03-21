import { insforge } from "../server/insforge";

async function checkSuppliers() {
  console.log("Querying suppliers table...");
  const { data, error } = await insforge.database.from("suppliers").select("*");
  if (error) {
    console.error("Query error:", error);
    return;
  }
  console.log("Suppliers count:", data.length);
  data.forEach(s => console.log(` - ${s.name} (${s.code})` || "N/A"));
}

checkSuppliers().catch(console.error);
