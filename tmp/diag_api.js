const BASE = "http://localhost:3000";

async function diag() {
  console.log("Testing Login...");
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const loginBody = await loginRes.json();
  if (!loginBody.token) {
    console.error("Login failed:", loginBody);
    return;
  }
  console.log("Login Success! Token obtained.");
  const token = loginBody.token;

  console.log("\nTesting GET /api/projects...");
  const projRes = await fetch(`${BASE}/api/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("Status:", projRes.status);
  const projects = await projRes.json();
  console.log("Projects found:", Array.isArray(projects) ? projects.length : "Not an array");
  if (Array.isArray(projects)) {
    projects.forEach(p => console.log(` - ${p.projectCode} (ID: ${p.id})`));
  } else {
    console.log("Response body:", projects);
  }
}

diag().catch(console.error);
