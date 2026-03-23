import { injectUidAndSession } from './server/lib/url-intelligence';

const testUrl = "https://track.opinioninsights.in/r/sdaweq/VERCEL/[UID]";
const clientRid = "SDAWE0050";
const oiSession = "test-session-123";

const result = injectUidAndSession(testUrl, clientRid, oiSession);
console.log("Input:", testUrl);
console.log("Result URL:", result.finalUrl);
console.log("Position:", result.uidPosition);
console.log("Segment Value:", result.uidSegmentValue);

if (result.finalUrl.includes(clientRid) && !result.finalUrl.includes("[UID]")) {
    console.log("SUCCESS: UID replaced");
} else {
    console.log("FAILED: UID not replaced");
}

if (result.uidPosition === 'path') {
    console.log("SUCCESS: Position is path");
} else {
    console.log("FAILED: Position is " + result.uidPosition);
}
