
import { insforge } from "./server/insforge.js";

async function main() {
    console.log("Fetching ALL surveys...");
    const { data, error } = await insforge.database.from("country_surveys").select("*");
    if (error) {
        console.error("Error:", error);
        process.exit(1);
    }
    
    console.log("Total surveys:", data.length);
    data.forEach(s => {
        console.log(`Survey: ID=${s.id}, ProjectCode="${s.project_code}", CountryCode="${s.country_code}"`);
    });
    
    const pCode = "PATHTEST";
    const cCode = "IN";
    
    console.log(`\nManual filter for "${pCode}" / "${cCode}":`);
    const match = data.find(s => 
        s.project_code?.toLowerCase() === pCode.toLowerCase() && 
        s.country_code === cCode
    );
    
    console.log("Match found manually:", match ? "YES" : "NO");
    if (match) {
        console.log("Matched Survey:", JSON.stringify(match, null, 2));
    }
    
    process.exit(0);
}

main().catch(console.error);
