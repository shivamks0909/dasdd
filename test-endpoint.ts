const BASE_URL = "http://localhost:3000";

async function probe() {
  const targets = [
    "/api/admin/respondents",
    "/track/complete",
    "/non-existent-api-test"
  ];

  for (const t of targets) {
    console.log(`\nProbing: ${t}`);
    const res = await fetch(BASE_URL + t, {
        headers: { "x-test-bypass": "UID-TEST-SECRET" }
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Content-Type: ${res.headers.get("content-type")}`);
    console.log(`Body Snippet: ${text.substring(0, 200).replace(/\n/g, " ")}`);
  }
}

probe();
