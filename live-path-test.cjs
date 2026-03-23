const { createClient } = require('@insforge/sdk');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const client = createClient({
    baseUrl: process.env.INSFORGE_BASE_URL || 'https://cpim43si.us-west.insforge.app',
    anonKey: process.env.INSFORGE_API_KEY || ''
});

const TEST_PROJECT_CODE = "LIVE_PATH_TEST";
const SURVEY_URL = "https://track.opinioninsights.in/r/sdaweq/VERCEL/[UID]";
const SUPPLIER_CODE = "DTMN";
const UID = "USER_LIVE_TEST_123";

async function runLivePathTest() {
    console.log("≡ƒÜÇ STARTING LIVE PATH REDIRECTION TEST...");
    try {
        console.log("1. Setting up project:", TEST_PROJECT_CODE);
        const { data: pData, error: pErr } = await client.database.from('projects').upsert({
            code: TEST_PROJECT_CODE,
            name: "Live Path Redirection Test",
            status: 'active',
            type: 'survey_router'
        }, { onConflict: 'code' }).select();

        if (pErr) console.error("Project Upsert Error:", pErr);
        else console.log("Project setup done");

        console.log("2. Mapping Survey URL:", SURVEY_URL);
        // Delete existing mapping first to avoid conflict if we don't know the constraint
        await client.database.from('country_surveys').delete().match({ project_code: TEST_PROJECT_CODE });
        
        const { data: cData, error: cErr } = await client.database.from('country_surveys').insert({
            project_code: TEST_PROJECT_CODE,
            country_code: 'IN',
            survey_url: SURVEY_URL,
            status: 'active'
        }).select();

        if (cErr) console.error("Survey Mapping Error:", cErr);
        else console.log("Mapping done");

        const trackUrl = `http://localhost:3000/track?code=${TEST_PROJECT_CODE}&country=IN&sup=${SUPPLIER_CODE}&uid=${UID}`;
        console.log("3. Hitting Track Endpoint:", trackUrl);

        try {
            const resp = await axios.get(trackUrl, {
                maxRedirects: 0,
                validateStatus: (status) => status >= 200 && status < 400
            });
            console.log("Response received. Status:", resp.status);
            const location = resp.headers.location || '';
            console.log("Location:", location);

            if (location.includes('[UID]')) {
                console.log("≡ƒö┤ FAILED: [UID] placeholder is still present.");
            } else {
                const ridMatch = location.match(/SDAWE\d{4}/);
                if (ridMatch) {
                    console.log("Γ¥î SUCCESS: [UID] replaced with RID:", ridMatch[0]);
                } else {
                    console.log("ΓÜÖ∩╕Å Placeholder replaced, but RID pattern not matched.");
                }
            }
        } catch (axiosError) {
            if (axiosError.response && axiosError.response.status === 302) {
                const location = axiosError.response.headers.location;
                console.log("Redirected to:", location);
                if (location.includes('[UID]')) {
                    console.log("≡ƒö┤ FAILED: [UID] placeholder is still present.");
                } else {
                    console.log("Γ¥î SUCCESS: [UID] replaced correctly.");
                }
            } else {
                throw axiosError;
            }
        }
    } catch (e) {
        console.error("≡ƒö┤ FATAL ERROR:", e.message);
    } finally {
        console.log("--- TEST FINISHED ---");
    }
}

runLivePathTest();
