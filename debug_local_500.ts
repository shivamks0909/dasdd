
import fetch from "node-fetch";

async function main() {
    console.log("Testing localhost:5000/track with VALID data and country GL...");
    try {
        const res = await fetch("http://localhost:5000/track?code=PATHTEST&uid=TEST_LOCAL_REAL_GL&sup=PNLP&country=GL");
        console.log("Status:", res.status);
        const body = await res.text();
        console.log("Body:", body);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

main();
