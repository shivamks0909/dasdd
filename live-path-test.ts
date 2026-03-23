import { createClient } from '@insforge/sdk';
import fetch from 'node-fetch';

const client = createClient({
    baseUrl: process.env.INSFORGE_BASE_URL || 'https://cpim43si.us-west.insforge.app',
    anonKey: process.env.INSFORGE_ANON_KEY || '' // Assuming anonKey is handled or not strictly needed for this internal test script with direct DB access
});

async function runLivePathTest() {
    console.log("≡ƒÜÇ STARTING LIVE PATH REDIRECTION TEST...");

    const TEST_PROJECT_CODE = "LIVE_PATH_TEST";
    const SURVEY_URL = "https://track.opinioninsights.in/r/sdaweq/VERCEL/[UID]";
    const SUPPLIER_CODE = "DTMN";
    const UID = "USER_LIVE_TEST_123";

    // 1. Create/Update Project
    console.log("1. Setting up project:", TEST_PROJECT_CODE);
    const { error: pErr } = await client.from('projects').upsert({
        code: TEST_PROJECT_CODE,
        name: "Live Path Redirection Test",
        client_id: 1, // Using client 1
        status: 'active',
        type: 'survey_router'
    }, { onConflict: 'code' });

    if (pErr) {
        console.error("Project Create Failed:", pErr);
        // return; // Continue anyway if it exists
    }

    // 2. Setup Country Survey mapping
    console.log("2. Mapping Survey URL...");
    const { error: cErr } = await client.from('country_surveys').upsert({
        project_code: TEST_PROJECT_CODE,
        country_code: 'IN',
        survey_url: SURVEY_URL,
        status: 'active'
    }, { onConflict: 'project_code,country_code' });

    if (cErr) console.error("Survey Map Failed:", cErr);

    // 3. Hit Tracking Endpoint
    const trackUrl = `http://localhost:3000/track?code=${TEST_PROJECT_CODE}&country=IN&sup=${SUPPLIER_CODE}&uid=${UID}`;
    console.log("3. Hitting Track Endpoint:", trackUrl);

    try {
        const resp = await fetch(trackUrl, { redirect: 'manual' });
        const location = resp.headers.get('location') || '';
        console.log("Status:", resp.status);
        console.log("Location:", location);

        // Check if [UID] was replaced by an RID (SDAWEXXXX)
        const ridMatch = location.match(/SDAWE\d{4}/);
        if (ridMatch) {
            console.log("Γ¥î SUCCESS: [UID] replaced with RID:", ridMatch[0]);
            console.log("Final URL looks correct:", location);
        } else {
            console.log("≡ƒö┤ FAILED: [UID] NOT replaced correctly. Found:", location);
        }

        // Test with URL encoded [UID] to be sure
        const trackUrlEncoded = `http://localhost:3000/track?code=${TEST_PROJECT_CODE}&country=IN&sup=${SUPPLIER_CODE}&uid=${UID}`;
        // Wait, the test is about the TEMPLATE containing [UID], not the input.
    } catch (e) {
        console.error("Test execution failed:", e);
    }
}

runLivePathTest();
