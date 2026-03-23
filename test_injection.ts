
import { injectUidAndSession } from "./server/lib/url-intelligence";

const testUrl = "https://track.exploresearch.in/start/MTkxNkAyOA==?uid=";
const clientRid = "OPIIN1234";
const oiSession = "session-abc-123";

const result = injectUidAndSession(testUrl, clientRid, oiSession, "uid", "auto");

console.log("Input:", testUrl);
console.log("Result URL:", result.finalUrl);
console.log("Sent UID:", result.sentUid);
console.log("Position:", result.uidPosition);
console.log("Value:", result.uidSegmentValue);

if (result.finalUrl.includes("uid=OPIIN1234")) {
    console.log("SUCCESS: UID injected into blank param");
} else {
    console.log("FAILURE: UID NOT injected into blank param");
}
