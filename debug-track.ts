import fetch from 'node-fetch';

async function debugTrack() {
    const url = "http://localhost:3000/track?code=SDAWEQ&country=IN&sup=DTMN&uid=DEBUG_UID_123";
    console.log("Hitting:", url);
    
    try {
        const resp = await fetch(url, { redirect: 'manual' });
        console.log("Status:", resp.status);
        console.log("Location:", resp.headers.get('location'));
        
        const location = resp.headers.get('location') || '';
        if (location.includes('DEBUG_UID_123')) {
            console.log("SUCCESS: UID found in redirect URL");
        } else {
            console.log("FAILED: UID NOT found in redirect URL. Found:", location);
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

debugTrack();
