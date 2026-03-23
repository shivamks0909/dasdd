
import { insforge } from "./server/insforge.js";

async function main() {
    const { data, error } = await insforge.database.from("country_surveys").select("*");
    if (error) {
        console.error("Error fetching surveys:", error);
        process.exit(1);
    }
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
}

main().catch(console.error);
