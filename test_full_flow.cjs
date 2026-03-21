/**
 * Full E2E Test: Opinion Routing Platform (Next.js App Router)
 * Uses JWT Bearer token auth. Uses unique UIDs per run to avoid duplicate issues.
 */

const BASE = "http://localhost:3000";
const RUN_ID = Date.now().toString(36); // unique per run

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const body = await res.json();
  if (!body.token) { console.error("❌ Login failed:", body); return null; }
  console.log(`🔑 Logged in as ${body.username}`);
  return body.token;
}

function authHeaders(token) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function apiGet(path, token) {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders(token) });
  return res.json();
}

async function apiPost(path, data, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return { status: res.status, data: await res.json() };
}

async function apiDelete(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function trackAndGetSession(uid) {
  const url = `${BASE}/track?code=TEST2026&country=US&sup=TESTSUP&uid=${uid}`;
  const res = await fetch(url, { redirect: "manual" });
  const loc = res.headers.get("location");
  console.log(`    → HTTP ${res.status} → ${loc ? loc.substring(0, 100) : "(no location)"}`);
  if (!loc) {
    const body = await res.text().catch(() => "");
    console.log(`    Body: ${body.substring(0, 200)}`);
    return null;
  }
  // Extract oi_session from redirect URL
  try {
    const u = new URL(loc, BASE);
    return u.searchParams.get("session") || u.searchParams.get("oi_session");
  } catch { return null; }
}

async function fireCallback(path, oiSession) {
  const url = `${BASE}${path}?oi_session=${oiSession}`;
  const res = await fetch(url, { redirect: "manual" });
  const loc = res.headers.get("location");
  console.log(`    → Callback ${path}: HTTP ${res.status} → ${loc ? loc.substring(0, 80) : "(none)"}`);
  return { status: res.status, location: loc };
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  FULL E2E TEST - Opinion Routing Platform");
  console.log(`  Run ID: ${RUN_ID}`);
  console.log("═══════════════════════════════════════════\n");

  // 1. LOGIN
  const token = await login();
  if (!token) return;
  console.log("");

  // 2. CLEANUP old test data
  console.log("🧹 Cleaning up old test data...");
  const projects = await apiGet("/api/projects", token);
  console.log(`   Found ${Array.isArray(projects) ? projects.length : 0} projects`);
  if (Array.isArray(projects)) {
    for (const p of projects.filter(p => p.projectCode === "TEST2026")) {
      console.log(`   Deleting project ${p.id}...`);
      await apiDelete(`/api/projects/${p.id}`, token);
      console.log(`   ✅ Removed project ${p.id}`);
    }
  }
  const suppliers = await apiGet("/api/suppliers", token);
  console.log(`   Found ${Array.isArray(suppliers) ? suppliers.length : 0} suppliers`);
  if (Array.isArray(suppliers)) {
    for (const s of suppliers.filter(s => s.code === "TESTSUP")) {
      console.log(`   Deleting supplier ${s.id}...`);
      await apiDelete(`/api/suppliers/${s.id}`, token);
      console.log(`   ✅ Removed supplier ${s.id}`);
    }
  }
  console.log("");

  // 3. CREATE PROJECT
  console.log("📦 Creating project TEST2026...");
  const projRes = await apiPost("/api/projects", {
    projectCode: "TEST2026",
    projectName: "E2E Test Project",
    client: "TestClient",
    status: "active",
    ridPrefix: "OI",
    ridCountryCode: "US",
    ridPadding: 4,
    ridCounter: 0,
    completeUrl: "https://example.com/client-complete?rid={RID}",
    terminateUrl: "https://example.com/client-terminate?rid={RID}",
    quotafullUrl: "https://example.com/client-quotafull?rid={RID}",
    securityUrl: "https://example.com/client-security?rid={RID}",
  }, token);
  if (projRes.status !== 201) { console.error("❌ Project failed:", projRes.data); return; }
  const project = projRes.data;
  console.log(`  ✅ ${project.projectCode} (${project.id})`);

  // 4. CREATE SUPPLIER
  console.log("📦 Creating supplier TESTSUP...");
  const supRes = await apiPost("/api/suppliers", {
    name: "Test Supplier Panel",
    code: "TESTSUP",
    completeUrl: "https://example.com/sup-complete?uid={UID}",
    terminateUrl: "https://example.com/sup-terminate?uid={UID}",
    quotafullUrl: "https://example.com/sup-quotafull?uid={UID}",
    securityUrl: "https://example.com/sup-security?uid={UID}",
  }, token);
  if (supRes.status !== 201) { console.error("❌ Supplier failed:", supRes.data); return; }
  console.log(`  ✅ ${supRes.data.code} (${supRes.data.id})`);

  // 5. CREATE COUNTRY SURVEY
  console.log("📦 Creating country survey US...");
  const survRes = await apiPost(`/api/projects/${project.id}/surveys`, {
    projectCode: "TEST2026",
    countryCode: "US",
    surveyUrl: "https://survey.example.com/take?rid={RID}&session={oi_session}",
    status: "active",
  }, token);
  if (survRes.status !== 201) { console.error("❌ Survey failed:", survRes.data); return; }
  console.log("  ✅ US survey created\n");

  // ═══ FLOW TESTS ═══
  console.log("═══════════════════════════════════════════");
  console.log("         TESTING CALLBACK FLOWS");
  console.log("═══════════════════════════════════════════\n");

  const results = [];

  // A: COMPLETE
  const uidA = `C_${RUN_ID}`;
  console.log(`🟢 TEST A: COMPLETE (uid=${uidA})`);
  console.log("  Step 1: Track...");
  const sessA = await trackAndGetSession(uidA);
  console.log(`  Step 2: oi_session = ${sessA}`);
  if (sessA) {
    console.log("  Step 3: Fire /complete...");
    await fireCallback("/complete", sessA);
    console.log("  Step 4: Verify DB...");
    const resp = await apiGet("/api/respondents", token);
    const e = Array.isArray(resp) ? resp.find(r => r.oiSession === sessA) : null;
    const pass = e?.status === "complete";
    console.log(`    status=${e?.status} completedAt=${e?.completedAt || "null"} → ${pass ? "✅" : "❌"}`);
    results.push({ name: "COMPLETE", pass, got: e?.status });
  } else {
    console.log("  ❌ No session extracted from redirect!");
    results.push({ name: "COMPLETE", pass: false, got: "no session" });
  }
  console.log("");

  // B: TERMINATE
  const uidB = `T_${RUN_ID}`;
  console.log(`🔴 TEST B: TERMINATE (uid=${uidB})`);
  console.log("  Step 1: Track...");
  const sessB = await trackAndGetSession(uidB);
  console.log(`  Step 2: oi_session = ${sessB}`);
  if (sessB) {
    console.log("  Step 3: Fire /terminate...");
    await fireCallback("/terminate", sessB);
    console.log("  Step 4: Verify DB...");
    const resp = await apiGet("/api/respondents", token);
    const e = Array.isArray(resp) ? resp.find(r => r.oiSession === sessB) : null;
    const pass = e?.status === "terminate";
    console.log(`    status=${e?.status} completedAt=${e?.completedAt || "null"} → ${pass ? "✅" : "❌"}`);
    results.push({ name: "TERMINATE", pass, got: e?.status });
  } else {
    console.log("  ❌ No session extracted from redirect!");
    results.push({ name: "TERMINATE", pass: false, got: "no session" });
  }
  console.log("");

  // C: QUOTAFULL
  const uidC = `Q_${RUN_ID}`;
  console.log(`🟡 TEST C: QUOTAFULL (uid=${uidC})`);
  console.log("  Step 1: Track...");
  const sessC = await trackAndGetSession(uidC);
  console.log(`  Step 2: oi_session = ${sessC}`);
  if (sessC) {
    console.log("  Step 3: Fire /quotafull...");
    await fireCallback("/quotafull", sessC);
    console.log("  Step 4: Verify DB...");
    const resp = await apiGet("/api/respondents", token);
    const e = Array.isArray(resp) ? resp.find(r => r.oiSession === sessC) : null;
    const pass = e?.status === "quotafull";
    console.log(`    status=${e?.status} completedAt=${e?.completedAt || "null"} → ${pass ? "✅" : "❌"}`);
    results.push({ name: "QUOTAFULL", pass, got: e?.status });
  } else {
    console.log("  ❌ No session extracted from redirect!");
    results.push({ name: "QUOTAFULL", pass: false, got: "no session" });
  }
  console.log("");

  // D: DUPLICATE
  console.log(`🔒 TEST D: DUPLICATE (re-track uid=${uidA})`);
  console.log("  Step 1: Re-track...");
  const locD = await fetch(`${BASE}/track?code=TEST2026&country=US&sup=TESTSUP&uid=${uidA}`, { redirect: "manual" });
  const locDUrl = locD.headers.get("location");
  const dupPass = locDUrl && locDUrl.includes("/pages/duplicate");
  console.log(`    ${dupPass ? "✅ Redirected to duplicate page" : "❌ NOT duplicate redirect"}`);
  results.push({ name: "DUPLICATE", pass: dupPass, got: dupPass ? "duplicate page" : locDUrl });
  console.log("");

  // ═══ DB VERIFICATION ═══
  console.log("═══════════════════════════════════════════");
  console.log("     DATABASE FINAL VERIFICATION");
  console.log("═══════════════════════════════════════════\n");

  const allResp = await apiGet("/api/respondents", token);
  if (Array.isArray(allResp)) {
    const test = allResp.filter(r => r.projectCode === "TEST2026" && r.supplierRid?.includes(RUN_ID));
    console.log(`  Respondents for this run: ${test.length}`);
    for (const r of test) {
      console.log(`    ${r.supplierRid} → status=${r.status} completed=${r.completedAt || "null"}`);
    }
  }

  console.log("\n  Project TEST2026:");
  const pList = await apiGet("/api/projects", token);
  if (Array.isArray(pList)) {
    const tp = pList.find(p => p.projectCode === "TEST2026");
    if (tp) {
      console.log(`    completeUrl:  ${tp.completeUrl}`);
      console.log(`    terminateUrl: ${tp.terminateUrl}`);
      console.log(`    quotafullUrl: ${tp.quotafullUrl}`);
      console.log(`    RID Counter:  ${tp.ridCounter}`);
    }
  }

  console.log("\n  Supplier TESTSUP:");
  const sList = await apiGet("/api/suppliers", token);
  if (Array.isArray(sList)) {
    const ts = sList.find(s => s.code === "TESTSUP");
    if (ts) {
      console.log(`    completeUrl:  ${ts.completeUrl}`);
      console.log(`    terminateUrl: ${ts.terminateUrl}`);
      console.log(`    quotafullUrl: ${ts.quotafullUrl}`);
    }
  }

  // ═══ RESULTS ═══
  console.log("\n═══════════════════════════════════════════");
  console.log("            FINAL RESULTS");
  console.log("═══════════════════════════════════════════");
  for (const r of results) {
    console.log(`  ${r.pass ? "✅" : "❌"} ${r.name}: ${r.pass ? "PASSED" : `FAILED (got: ${r.got})`}`);
  }
  const passed = results.filter(r => r.pass).length;
  console.log(`\n  Score: ${passed}/${results.length}`);
  if (passed === results.length) {
    console.log("  🎉 ALL TESTS PASSED!");
  }
  console.log("═══════════════════════════════════════════\n");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
