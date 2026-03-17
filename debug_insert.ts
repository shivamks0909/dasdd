import { storage } from './server/storage';
import fs from 'fs';

async function run() {
  try {
    const supplierCode = "TEST_SUPP_" + Date.now();
    const supplier = await storage.createSupplier({
      name: "Test Isolation Supplier",
      code: supplierCode
    });
    console.log("Success:", supplier);
  } catch (e: any) {
    fs.writeFileSync('db_error.txt', Object.getOwnPropertyNames(e).reduce((a, b) => {
      a[b] = e[b]; return a;
    }, {} as any).message || e.toString());
  }
}
run();
