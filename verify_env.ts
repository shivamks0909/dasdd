
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

async function main() {
    console.log("=== Environment Verification ===");
    const required = ["DATABASE_URL", "INSFORGE_API_KEY", "INSFORGE_BASE_URL", "JWT_SECRET"];
    for (const key of required) {
        const val = process.env[key];
        console.log(`${key}: ${val ? 'SET (Length: ' + val.length + ')' : 'MISSING'}`);
    }

    if (process.env.INSFORGE_BASE_URL) {
        console.log("\nTesting InsForge connectivity...");
        try {
            const res = await fetch(`${process.env.INSFORGE_BASE_URL}/rest/v1/`, {
                headers: { "apikey": process.env.INSFORGE_API_KEY || "" }
            });
            console.log(`InsForge API Status: ${res.status} ${res.statusText}`);
        } catch (e: any) {
            console.error(`InsForge Connectivity Failed: ${e.message}`);
        }
    }
}

main();
