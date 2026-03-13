import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth, requireAdmin } from "./auth";
import {
  insertProjectSchema,
  insertSupplierSchema,
  insertCountrySurveySchema,
  insertRespondentSchema,
  insertActivityLogSchema,
  insertSupplierAssignmentSchema
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "./db";
import { s2sLogs, projectS2sConfig, respondents, activityLogs } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { generateS2SToken, verifyS2SToken } from "./s2s";
import { generateExcelReport } from "./lib/export-excel-server";

import { storage, seedAdmin } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // Seed admin in the background
  seedAdmin(storage).catch(err => console.error("Admin seeding failed:", err));

  // AUTH ROUTES
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      console.log(`Login attempt for username: ${username}`);
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      console.log("Fetching admin from storage...");
      const admin = await storage.getAdminByUsername(username);
      
      if (!admin) {
        console.log(`Login failed: Admin user ${username} not found`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("Comparing passwords...");
      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) {
        console.log(`Login failed: Invalid password for ${username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log(`Login successful for ${username}, saving session...`);
      req.session.adminId = admin.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Internal server error during login" });
        }
        console.log(`Session saved for ${username}`);
        return res.json({ id: admin.id, username: admin.username });
      });
    } catch (error) {
      console.error("Login route error:", error);
      res.status(500).json({ message: "Internal server error during login execution" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Failed to logout" });
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.adminId) return res.status(401).json({ message: "Not authenticated" });
    const admin = await storage.getAdminById(req.session.adminId);
    if (!admin) return res.status(401).json({ message: "Not authenticated" });
    return res.json({ id: admin.id, username: admin.username });
  });

  // ADMIN STATS
  app.get("/api/admin/stats", requireAdmin, async (_req: Request, res: Response) => {
    const stats = await storage.getDashboardStats();
    return res.json(stats);
  });

  app.get("/api/admin/system-pulse", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getSystemPulseStats();
      return res.json(stats);
    } catch (error) {
      console.error("System Pulse Error:", error);
      return res.status(500).json({ message: "Failed to fetch system pulse data" });
    }
  });

  app.get("/api/admin/responses", requireAdmin, async (_req: Request, res: Response) => {
    // This is a legacy alias used by some test scripts
    const respondents = await storage.getRespondents();
    return res.json(respondents);
  });

  app.get("/api/admin/respondents", requireAdmin, async (_req: Request, res: Response) => {
    const list = await storage.getRespondents();
    return res.json(list);
  });

  app.get("/api/admin/responses/export", requireAdmin, async (_req: Request, res: Response) => {
    const list = await storage.getRespondents();
    const headers = ["ID", "Project Code", "Session", "Client RID", "Supplier Code", "Supplier RID", "Status", "S2S Verified", "Fraud Score", "Started At", "IP", "User Agent"];
    const rows = list.map(r => [
      r.id,
      r.projectCode,
      r.oiSession,
      r.clientRid || "",
      r.supplierCode || "",
      r.supplierRid || "",
      r.status,
      r.s2sVerified ? "Yes" : "No",
      r.fraudScore?.toString() || "0",
      r.startedAt ? r.startedAt.toISOString() : '',
      `"${r.ipAddress || ""}"`,
      `"${(r.userAgent || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=responses_export.csv");
    return res.status(200).send(csvContent);
  });

  app.get("/api/admin/responses/export-excel", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const respondents = await storage.getRespondents();
      const projects = await storage.getProjects();
      const suppliers = await storage.getSuppliers();
      const logs = await db.query.s2sLogs.findMany({
        orderBy: (logs, { desc }) => [desc(logs.createdAt)],
        limit: 5000
      });

      const buffer = await generateExcelReport({
        responses: respondents,
        projects: projects || [],
        suppliers: suppliers || [],
        s2sLogs: logs || [],
        filterSummary: 'Enterprise Archive Export',
        projectFilter: 'All Projects',
        supplierFilter: 'All Suppliers',
        statusFilter: 'All',
        dateRange: 'All Time',
        exportedBy: 'Admin'
      });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="OpinionInsights_Analytics.xlsx"');
      return res.status(200).send(buffer);
    } catch (error) {
      console.error("Excel Export Error:", error);
      return res.status(500).json({ message: "Failed to generate Excel report" });
    }
  });

  // PROJECTS
  app.get("/api/projects", requireAdmin, async (_req: Request, res: Response) => {
    const allProjects = await storage.getProjects();
    return res.json(allProjects);
  });

  app.post("/api/projects", requireAdmin, async (req: Request, res: Response) => {
    const parsed = insertProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
    }
    const project = await storage.createProject(parsed.data);
    return res.status(201).json(project);
  });

  app.get("/api/projects/:id", requireAdmin, async (req: Request, res: Response) => {
    const project = await storage.getProjectById(req.params.id as string);
    if (!project) return res.status(404).json({ message: "Project not found" });
    return res.json(project);
  });

  app.patch("/api/projects/:id", requireAdmin, async (req: Request, res: Response) => {
    const project = await storage.updateProject(req.params.id as string, req.body);
    if (!project) return res.status(404).json({ message: "Project not found" });
    return res.json(project);
  });

  app.delete("/api/projects/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteProject(req.params.id as string);
    return res.json({ message: "Deleted" });
  });

  // PROJECT S2S CONFIG & LOGS
  app.get("/api/projects/:code/s2s-config", requireAdmin, async (req: Request, res: Response) => {
    const code = req.params.code as string;
    const config = await db.query.projectS2sConfig.findFirst({
      where: eq(projectS2sConfig.projectCode, code)
    });
    return res.json(config || null);
  });

  app.post("/api/projects/:code/s2s-config", requireAdmin, async (req: Request, res: Response) => {
    const { s2sSecret, requireS2S } = req.body;
    const code = req.params.code as string;
    
    const existing = await db.query.projectS2sConfig.findFirst({
      where: eq(projectS2sConfig.projectCode, code)
    });

    if (existing) {
      const [updated] = await db.update(projectS2sConfig)
        .set({ s2sSecret, requireS2S })
        .where(eq(projectS2sConfig.projectCode, code))
        .returning();
      return res.json(updated);
    } else {
      const [created] = await db.insert(projectS2sConfig)
        .values({
          projectCode: code,
          s2sSecret,
          requireS2S
        })
        .returning();
      return res.status(201).json(created);
    }
  });

  app.get("/api/projects/:code/s2s-logs", requireAdmin, async (req: Request, res: Response) => {
    const code = req.params.code as string;
    const logs = await db.select()
      .from(s2sLogs)
      .where(eq(s2sLogs.projectCode, code))
      .orderBy(desc(s2sLogs.createdAt))
      .limit(100);
    return res.json(logs);
  });

  // COUNTRY SURVEYS (v2 Mapping)
  app.get("/api/projects/:id/surveys", requireAdmin, async (req: Request, res: Response) => {
    const surveys = await storage.getCountrySurveys(req.params.id as string);
    return res.json(surveys);
  });

  app.delete("/api/projects/:id/surveys/all", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteAllCountrySurveys(req.params.id as string);
    return res.json({ message: "All surveys deleted" });
  });

  app.post("/api/projects/:id/surveys", requireAdmin, async (req: Request, res: Response) => {
    const parsed = insertCountrySurveySchema.safeParse({ ...req.body, projectId: req.params.id as string });
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
    }
    const survey = await storage.createCountrySurvey(parsed.data);
    return res.status(201).json(survey);
  });

  app.delete("/api/surveys/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteCountrySurvey(req.params.id as string);
    return res.json({ message: "Deleted" });
  });

  // SUPPLIERS
  app.get("/api/suppliers", requireAdmin, async (_req: Request, res: Response) => {
    const sups = await storage.getSuppliers();
    return res.json(sups);
  });

  app.post("/api/suppliers", requireAdmin, async (req: Request, res: Response) => {
    const parsed = insertSupplierSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
    }
    const supplier = await storage.createSupplier(parsed.data);
    return res.status(201).json(supplier);
  });

  app.patch("/api/suppliers/:id", requireAdmin, async (req: Request, res: Response) => {
    const supplier = await storage.updateSupplier(req.params.id as string, req.body);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    return res.json(supplier);
  });

  app.delete("/api/suppliers/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteSupplier(req.params.id as string);
    return res.json({ message: "Deleted" });
  });

  // LINK GENERATOR
  app.get("/api/link-generator/assignments", requireAdmin, async (req: Request, res: Response) => {
    const { projectCode, supplierId } = req.query;
    const assignments = await storage.getSupplierAssignments(
      projectCode as string | undefined,
      supplierId as string | undefined
    );
    return res.json(assignments);
  });

  app.post("/api/link-generator/assignments", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { project_code, country_code, supplier_id, generated_link, notes } = req.body;
      const projectCode = project_code || req.body.projectCode;
      const countryCode = country_code || req.body.countryCode;
      const supplierId = supplier_id || req.body.supplierId;
      const generatedLink = generated_link || req.body.generatedLink;

      if (!projectCode || !countryCode || !generatedLink) {
        return res.status(400).json({ message: "projectCode, countryCode, and generatedLink are required" });
      }

      // Check for duplicate — only if supplierId is provided
      if (supplierId) {
        const existing = await storage.getSupplierAssignmentByCombo(projectCode, countryCode, supplierId);
        if (existing) {
          return res.status(409).json({ message: "Assignment already exists for this project, country, and supplier." });
        }
      }

      const assignment = await storage.createSupplierAssignment({
        projectCode,
        countryCode,
        supplierId: supplierId || null,
        generatedLink,
        notes: notes || null,
        status: 'active'
      });
      
      return res.status(201).json(assignment);
    } catch (error: any) {
      console.error("Link Generator Error:", error);
      return res.status(500).json({ message: "Internal server error", detail: error.message });
    }
  });

  app.put("/api/link-generator/assignments/:id", requireAdmin, async (req: Request, res: Response) => {
    const assignment = await storage.updateSupplierAssignment(req.params.id as string, req.body);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    return res.json(assignment);
  });

  app.delete("/api/link-generator/assignments/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteSupplierAssignment(req.params.id as string);
    return res.json({ message: "Deleted" });
  });

  app.get("/api/link-generator/assignments/export", requireAdmin, async (_req: Request, res: Response) => {
    const assignments = await storage.getSupplierAssignments();
    
    const headers = ["ID", "Project Code", "Project Name", "Country Code", "Supplier Code", "Supplier Name", "Link", "Status", "Notes", "Created At"];
    const rows = assignments.map(a => [
      a.id,
      a.projectCode,
      `"${a.projectName}"`,
      a.countryCode,
      a.supplierCode,
      `"${a.supplierName}"`,
      a.generatedLink,
      a.status,
      `"${a.notes || ""}"`,
      a.createdAt.toISOString()
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=supplier_assignments_export.csv");
    return res.status(200).send(csvContent);
  });

  // CLIENTS (Legacy Mocked)
  app.get("/api/clients", requireAdmin, async (_req: Request, res: Response) => {
    const clients = await storage.getClients();
    return res.json(clients);
  });

  app.post("/api/clients", requireAdmin, async (req: Request, res: Response) => {
    const client = await storage.createClient(req.body);
    return res.status(201).json(client);
  });

  app.patch("/api/clients/:id", requireAdmin, async (req: Request, res: Response) => {
    const client = await storage.updateClient(req.params.id as string, req.body);
    return res.json(client);
  });

  app.delete("/api/clients/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteClient(req.params.id as string);
    return res.json({ message: "Deleted" });
  });

  // ====== REDIRECT TRACKING ENDPOINT (/track and /t/:code) ======
  // https://router.domain.com/track?code={PROJECT_CODE}&country={CC}&sup={SUP_CODE}&uid={SUP_RID}
  // OR https://router.domain.com/t/{PROJECT_CODE}?country={CC}&sup={SUP_CODE}&uid={SUP_RID}
  // sup and uid are OPTIONAL — links work with or without a supplier
  const handleTrackingRequest = async (req: Request, res: Response, codeFromPath?: string) => {
    const { code, country, sup, uid, ...extraParams } = req.query;
    const projectCode = (codeFromPath || code) as string;
    const countryCode = country as string;

    // Only code and country are strictly required — sup and uid are optional for direct links
    if (!projectCode || !countryCode) {
      return res.status(400).send(`Missing tracking parameters. Need: code, country. Got: code=${projectCode}, country=${countryCode}`);
    }

    const supplierCode = (sup as string) || "DIRECT";  
    
    // UID Sanitization
    let rawUid = uid as string;
    const SANITY_PLACEHOLDERS = ['n/a', '[uid]', '{uid}', '[rid]', '{rid}', 'null', 'undefined', ''];
    if (rawUid && SANITY_PLACEHOLDERS.includes(rawUid.toLowerCase().trim())) {
      rawUid = ""; // treat as missing
    }
    const supplierRid = rawUid || `DIR-${randomUUID().split('-')[0]}`; // generated UID if none provided

    try {
      // 1. Validate Project
      const project = await storage.getProjectByCode(projectCode);
      if (!project || project.status !== 'active') return res.status(404).send("Project not found or inactive");

      // 2. Validate Supplier ONLY if sup param was provided
      if (sup) {
        const supplier = await storage.getSupplierByCode(supplierCode);
        if (!supplier) return res.status(404).send("Supplier not found");
      }

      // 3. Validate Country Survey
      const countrySurvey = await storage.getCountrySurveyByCode(projectCode, countryCode);
      if (!countrySurvey || countrySurvey.status !== 'active') return res.status(404).send("Survey not found for this country");

      // 4. Check for Duplicates (by project + supplier_rid only)
      const isDuplicate = await storage.checkDuplicateRespondent(projectCode, supplierCode, supplierRid);
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip || "unknown";

      if (isDuplicate) {
        const oiSessionForLog = randomUUID();
        await storage.createActivityLog({
          oiSession: oiSessionForLog,
          projectCode,
          eventType: 'duplicate_entry',
          meta: { details: `Duplicate RID detected: ${supplierRid} for ${supplierCode} on ${projectCode}` } as any
        } as any);

        const params = new URLSearchParams({
          pid: projectCode,
          uid: supplierRid,
        });
        return res.redirect(`/pages/duplicate?${params.toString()}`);
      }

      // 5. Generate Client RID (Atomic)
      let clientRid: string;
      try {
        clientRid = await storage.generateClientRID(projectCode);
      } catch (ridErr: any) {
        console.error("RID generation error:", ridErr);
        // Fallback using timestamp
        const prefix = project.ridPrefix || "OPI";
        const cc = project.ridCountryCode || "XX";
        clientRid = `${prefix}${cc}${Date.now().toString().slice(-6)}`;
      }

      if (!clientRid || clientRid.trim() === '') {
        console.error("RID generation returned empty string for project:", projectCode);
        return res.redirect(`/pages/terminate?reason=rid_failed`);
      }

      console.log(`Track: supplierRid=${supplierRid}, clientRid=${clientRid}, project=${projectCode}`);

      // 6. Create Respondent Session
      const oiSession = randomUUID();
      
      // S2S Generation
      let s2sToken: string | null = null;
      const s2sConfig = await storage.getS2sConfig(projectCode);
      
      if (s2sConfig && s2sConfig.requireS2S) {
        s2sToken = generateS2SToken(oiSession, s2sConfig.s2sSecret);
      }

      // 7. Build survey URL — inject clientRid and arbitrary params
      let redirectUrl = countrySurvey.surveyUrl
        .replaceAll("{RID}", clientRid)
        .replaceAll("[RID]", clientRid)
        .replaceAll("{rid}", clientRid)
        .replaceAll("{uid}", clientRid)
        .replaceAll("[UID]", clientRid)
        .replaceAll("{oi_session}", oiSession);

      // Support arbitrary parameters from query string
      const usedParams = new Set<string>();
      Object.entries(extraParams).forEach(([key, value]) => {
        if (typeof value === 'string') {
          const keyLower = key.toLowerCase();
          const hasPlaceholder = 
            redirectUrl.includes(`{${key}}`) || 
            redirectUrl.includes(`[${key}]`) ||
            redirectUrl.includes(`{${keyLower}}`) ||
            redirectUrl.includes(`[${keyLower}]`);
          
          if (hasPlaceholder) {
            redirectUrl = redirectUrl
              .replaceAll(`{${key}}`, value)
              .replaceAll(`[${key}]`, value)
              .replaceAll(`{${keyLower}}`, value)
              .replaceAll(`[${keyLower}]`, value);
            usedParams.add(key);
          }
        }
      });

      // Append unused extra params to query string
      const finalUrlObj = new URL(redirectUrl);
      Object.entries(extraParams).forEach(([key, value]) => {
        if (!usedParams.has(key) && typeof value === 'string') {
          finalUrlObj.searchParams.set(key, value);
        }
      });
      redirectUrl = finalUrlObj.toString();

      if (s2sToken) {
        const separator = redirectUrl.includes('?') ? '&' : '?';
        redirectUrl += `${separator}s2s_token=${s2sToken}`;
      }

      // Append oi_session if not already in URL
      if (!redirectUrl.includes("oi_session=")) {
        const separator = redirectUrl.includes('?') ? '&' : '?';
        redirectUrl += `${separator}oi_session=${oiSession}`;
      }

      // 8. Save respondent with survey_url stored server-side
      await storage.createRespondent({
        oiSession,
        projectCode,
        supplierCode,
        supplierRid,
        countryCode,
        clientRid,
        ipAddress: ip,
        userAgent: req.headers["user-agent"] || "unknown",
        status: 'started',
        s2sToken: s2sToken || undefined,
        surveyUrl: redirectUrl // Store the final final URL (column added to DB)
      } as any);

      // 9. Log Entry
      await storage.createActivityLog({
        oiSession,
        projectCode,
        eventType: 'entry',
        meta: { details: `Respondent started. sup=${supplierCode}, clientRid=${clientRid}` } as any
      } as any);

      // 10. Redirect to Client Survey URL
      return res.redirect(redirectUrl);

    } catch (err: any) {
      console.error("Tracking Error:", err);
      return res.status(500).send("Internal Server Error during tracking");
    }
  };

  app.get("/track", (req, res) => handleTrackingRequest(req, res));
  app.get("/t/:code", (req, res) => handleTrackingRequest(req, res, req.params.code));

  // ====== CALLBACK ENDPOINTS ======
  const handleCallback = async (req: Request, res: Response, status: string) => {
    const { oi_session } = req.query;
    if (!oi_session) return res.status(400).send("Missing oi_session");

    const respondent = await storage.getRespondentBySession(oi_session as string);
    if (!respondent) return res.status(404).send("Session not found");

    if (respondent.status !== 'started' && respondent.status !== 'pending') {
      return res.status(400).send("Respondent already reached a final status");
    }

    let finalStatus = status;

    // S2S Verification Check
    if (status === 'complete') {
      const s2sConfig = await db.query.projectS2sConfig.findFirst({
        where: eq(projectS2sConfig.projectCode, respondent.projectCode)
      });
      if (s2sConfig && s2sConfig.requireS2S && !respondent.s2sVerified) {
        // Fraud detected! Mark as security-terminate and log alert
        finalStatus = 'security-terminate';
        await storage.createActivityLog({
          oiSession: respondent.oiSession,
          eventType: 'security_alert',
          meta: { details: `Fraud attempt blocked: Manual client complete without S2S verification.` } as any
        } as any);
        
        // Also update respondent fraud flag
        await db.update(respondents)
          .set({ fraudScore: "1.0", status: 'fraud' })
          .where(eq(respondents.oiSession, respondent.oiSession));
      }
    }

    // Update Status
    if (finalStatus !== 'security-terminate' || status === 'security-terminate') {
       await storage.updateRespondentStatus(respondent.oiSession, finalStatus);
    }

    // Get Supplier
    const supplier = await storage.getSupplierByCode(respondent.supplierCode || "");
    if (!supplier) return res.status(404).send("Supplier not found");

    // Log Activity
    await storage.createActivityLog({
      oiSession: respondent.oiSession,
      eventType: 'callback',
      meta: { details: `Received ${status} callback from client.` } as any
    } as any);

    // Calculate LOI
    const startTime = respondent.startedAt ? Math.floor(respondent.startedAt.getTime() / 1000) : Math.floor(Date.now() / 1000);
    const endTime = Math.floor(Date.now() / 1000);
    const loi = Math.round((endTime - startTime) / 60);

    // Construct common params for our internal landing page - MINIMAL PARAMS
    const internalPathMap: Record<string, string> = {
      'complete': '/pages/complete',
      'terminate': '/pages/terminate',
      'quotafull': '/pages/quotafull',
      'security-terminate': '/pages/security',
      'fraud': '/pages/security'
    };

    const internalPath = internalPathMap[finalStatus] || '/pages/terminate';
    const redirectParams = new URLSearchParams({
      pid: respondent.projectCode || "",
      uid: respondent.supplierRid || "",
      session: respondent.oiSession
    });

    // 7. Determine Final Destination (Supplier Redirect vs Project Redirect vs Landing Page)
    let finalRedirectUrl = `${internalPath}?${redirectParams.toString()}`;

    // A. Try Supplier Redirect first if applicable
    if (respondent.supplierCode && respondent.supplierCode !== 'direct') {
      const supplier = await storage.getSupplierByCode(respondent.supplierCode);
      if (supplier) {
        let supRedirect: string | null = null;
        if (finalStatus === 'complete') supRedirect = supplier.completeUrl ?? null;
        else if (finalStatus === 'terminate') supRedirect = supplier.terminateUrl ?? null;
        else if (finalStatus === 'quotafull') supRedirect = supplier.quotafullUrl ?? null;
        else if (finalStatus === 'security-terminate' || finalStatus === 'fraud') supRedirect = supplier.securityUrl ?? null;

        if (supRedirect && supRedirect.trim() !== '') {
          finalRedirectUrl = supRedirect;
        }
      }
    } 
    // B. Fallback to Project Redirect if it's a direct respondent or no supplier redirect found
    else {
      const project = await storage.getProjectByCode(respondent.projectCode);
      if (project) {
        let projRedirect: string | null = null;
        if (finalStatus === 'complete') projRedirect = project.completeUrl ?? null;
        else if (finalStatus === 'terminate') projRedirect = project.terminateUrl ?? null;
        else if (finalStatus === 'quotafull') projRedirect = project.quotafullUrl ?? null;
        else if (finalStatus === 'security-terminate' || finalStatus === 'fraud') projRedirect = project.securityUrl ?? null;

        if (projRedirect && projRedirect.trim() !== '') {
          finalRedirectUrl = projRedirect;
        }
      }
    }

    // 7.5. Runtime UID Sanitization (Safety check for legacy data)
    let sanitizedRid = respondent.supplierRid || "";
    const SANITY_PLACEHOLDERS = ['n/a', '[uid]', '{uid}', '[rid]', '{rid}', 'null', 'undefined', ''];
    if (sanitizedRid && SANITY_PLACEHOLDERS.includes(sanitizedRid.toLowerCase().trim())) {
      sanitizedRid = `DIR-${respondent.oiSession.split('-')[0]}`;
    }

    // 8. Replace Placeholders in Final URL
    if (finalRedirectUrl.includes('{') || finalRedirectUrl.includes('[')) {
      finalRedirectUrl = finalRedirectUrl
        .replaceAll("{RID}", sanitizedRid)
        .replaceAll("[RID}", sanitizedRid) // Fixing a potential bracket typo if I saw one, but usually it's [RID]
        .replaceAll("[RID]", sanitizedRid)
        .replaceAll("{rid}", sanitizedRid)
        .replaceAll("{uid}", sanitizedRid)
        .replaceAll("[UID]", sanitizedRid)
        .replaceAll("{PID}", respondent.projectCode)
        .replaceAll("[PID]", respondent.projectCode)
        .replaceAll("{pid}", respondent.projectCode)
        .replaceAll("{oi_session}", respondent.oiSession);
    }

    return res.redirect(finalRedirectUrl);
  };

  app.get("/complete", (req, res) => handleCallback(req, res, "complete"));
  app.get("/terminate", (req, res) => handleCallback(req, res, "terminate"));
  app.get("/quotafull", (req, res) => handleCallback(req, res, "quotafull"));
  app.get("/security-terminate", (req, res) => handleCallback(req, res, "security-terminate"));

  // API to fetch respondent info for landing pages (without heavy URL params)
  app.get("/api/respondent-stats/:oiSession", async (req: Request, res: Response) => {
    const oiSession = req.params.oiSession as string;
    if (!oiSession) {
      return res.status(400).json({ message: "Missing session ID" });
    }
    try {
      const respondent = await storage.getRespondentBySession(oiSession);
      if (!respondent) return res.status(404).json({ message: "Session not found" });

      const startTime = respondent.startedAt ? Math.floor(respondent.startedAt.getTime() / 1000) : null;
      const endTime = respondent.completedAt ? Math.floor(respondent.completedAt.getTime() / 1000) : Math.floor(Date.now() / 1000);
      const loi = startTime ? Math.round((endTime - startTime) / 60) : 0;

      return res.json({
        projectCode: respondent.projectCode,
        supplierCode: respondent.supplierCode,
        supplierRid: respondent.supplierRid,
        status: respondent.status,
        loi: loi,
        startTime,
        endTime,
        ip: respondent.ipAddress,
        country: respondent.countryCode
      });
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // S2S Callback Endpoint
  app.post("/api/s2s/callback", async (req: Request, res: Response) => {
    try {
      const { project_code, oi_session, status, signature_token } = req.body;
      const ip = (req.headers["x-forwarded-for"] as string) || req.ip || "unknown";

      if (!project_code || !oi_session || !signature_token) {
        return res.status(400).json({ error: "Missing required S2S parameters" });
      }

      await db.insert(s2sLogs).values({
        oiSession: oi_session,
        projectCode: project_code,
        status: status || 'complete',
        ipAddress: ip,
        userAgent: req.headers["user-agent"] || "unknown",
        payload: req.body,
      });

      const respondent = await storage.getRespondentBySession(oi_session);
      if (!respondent) {
        return res.status(404).json({ error: "Session not found" });
      }

      const s2sConfig = await db.query.projectS2sConfig.findFirst({
        where: eq(projectS2sConfig.projectCode, project_code)
      });

      if (!s2sConfig) {
        return res.status(404).json({ error: "Project S2S config not found" });
      }

      const isValid = verifyS2SToken(signature_token, oi_session, s2sConfig.s2sSecret);
      if (!isValid) {
        return res.status(403).json({ error: "Invalid signature_token" });
      }

      // Mark verified
      await db.update(respondents)
        .set({ 
          s2sVerified: true, 
          s2sReceivedAt: new Date(),
          status: status || 'complete'
        })
        .where(eq(respondents.oiSession, oi_session));

      return res.status(200).json({ success: true, message: "S2S verified" });
    } catch (err: any) {
      console.error("S2S Error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // SECURITY ALERTS
  app.get("/api/s2s/alerts", requireAdmin, async (_req: Request, res: Response) => {
    const alerts = await db.select()
      .from(activityLogs)
      .where(eq(activityLogs.eventType, 'security_alert'))
      .orderBy(desc(activityLogs.createdAt))
      .limit(50);
    return res.json(alerts);
  });

  return createServer(app);
}
