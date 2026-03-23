import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth, requireAdmin, requireSupplier } from "./auth";
import {
  insertProjectSchema,
  insertSupplierSchema,
  insertCountrySurveySchema,
  insertRespondentSchema,
  insertActivityLogSchema,
  insertSupplierAssignmentSchema,
  insertSupplierUserSchema,
  insertSupplierProjectAccessSchema
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "./db";
import { s2sLogs, projectS2sConfig, respondents, activityLogs, type Supplier, type Project, type Respondent } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { generateS2SToken, verifyS2SToken } from "./s2s";
import { generateExcelReport } from "./lib/export-excel-server";
import { routerService } from "./lib/router-service";

import { storage, seedAdmin } from "./storage";
import { processTrackingRequest } from "./lib/tracking-core";
import { insforge } from "./insforge";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  console.log("[Routes] registerRoutes started - Registering API routes FIRST");
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

  app.get("/api/test-db", async (_req: Request, res: Response) => {
    res.setHeader("X-Source", "Express-Routes");
    try {
      const projects = await storage.getProjects();
      const techProject = projects.find(p => p.projectCode === "OPI-TECH-24");
      return res.json({ 
        totalProjects: projects.length, 
        techProjectFound: !!techProject,
        techProjectStatus: techProject?.status,
        projectCodes: projects.map(p => p.projectCode)
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ADMIN STATS
  console.log("[Routes] Registering /api/admin/* routes");
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
    const enriched = await storage.getEnrichedRespondents(50);
    return res.json(enriched);
  });

  app.get("/api/admin/respondents", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const list = await storage.getRespondents();
      // Filter sensitive fields like s2sToken before sending to client
      const safeList = list.map(({ s2sToken, verifyHash, ...rest }: any) => rest);
      res.setHeader("Content-Type", "application/json");
      return res.json(safeList);
    } catch (error: any) {
      console.error("Respondents API Error:", error);
      return res.status(500).json({ message: error.message || "Failed to fetch respondents" });
    }
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
  app.post("/api/projects/quick-create", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { survey_url, project_name, country } = req.body;
      if (!survey_url) {
        return res.status(400).json({ message: "Survey URL is required" });
      }

      // 1. UID Detection and Validation
      const uidParams = ["uid", "rid", "resp", "respondent", "userid"];
      const hasUidPlaceholder = uidParams.some(param => 
        survey_url.toLowerCase().includes(`{${param}}`) || 
        survey_url.toLowerCase().includes(`[${param}]`) ||
        survey_url.toLowerCase().includes(`${param}=`)
      );

      if (!hasUidPlaceholder) {
        return res.status(400).json({ message: "Survey URL must contain a UID placeholder (e.g., {uid}, [RID], or uid=)" });
      }

      // 2. Generate Unique Project Code
      let projectCode = "";
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        projectCode = "PRJ" + Math.floor(1000 + Math.random() * 9000);
        const existing = await storage.getProjectByCode(projectCode);
        if (!existing) isUnique = true;
        attempts++;
      }

      if (!isUnique) throw new Error("Failed to generate a unique project code after several attempts");

      const countryCode = country || "US";
      const projectName = project_name || `Quick Project ${projectCode}`;

      // 3. Create Project and Country Survey
      const { project, countrySurvey } = await storage.quickCreateProject({
        projectName,
        projectCode,
        surveyUrl: survey_url,
        countryCode
      });

      // 4. Generate Supplier Links (Assignments)
      const suppliers = await storage.getSuppliers();
      const assignments = suppliers.map(sup => ({
        projectCode: project.projectCode,
        countryCode: countryCode,
        supplierId: sup.id,
        generatedLink: routerService.getTrackingUrl(project.projectCode, countryCode, sup.code),
        status: "active",
        notes: "Auto-generated by Quick Creator"
      }));

      await storage.batchCreateSupplierAssignments(assignments);

      return res.status(201).json({
        project,
        countrySurvey,
        router_link: routerService.getTrackingUrl(project.projectCode, countryCode),
        supplier_links: assignments.map(a => ({
          supplierCode: suppliers.find(s => s.id === a.supplierId)?.code,
          supplierName: suppliers.find(s => s.id === a.supplierId)?.name,
          link: a.generatedLink
        }))
      });
    } catch (error: any) {
      console.error("Quick Create Error:", error);
      return res.status(500).json({ message: error.message || "Failed to quick create project" });
    }
  });

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
    // Filter passwordHash before sending to client
    const safeSups = sups.map(({ passwordHash, ...rest }) => rest);
    return res.json(safeSups);
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
    try {
      const client = await storage.createClient(req.body);
      return res.status(201).json(client);
    } catch (error: any) {
      console.error("Create Client Error:", error);
      return res.status(500).json({ message: error.message || "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", requireAdmin, async (req: Request, res: Response) => {
    const client = await storage.updateClient(req.params.id as string, req.body);
    return res.json(client);
  });

  app.delete("/api/clients/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteClient(req.params.id as string);
    return res.json({ message: "Deleted" });
  });

  // ====== SUPPLIER PORTAL AUTH ======
  app.post("/api/supplier/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getSupplierUserByUsername(username);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials or account inactive" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.supplierUserId = user.id;
      req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Session save failed" });
        return res.json({ id: user.id, username: user.username, supplierCode: user.supplierCode });
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/supplier/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });

  app.get("/api/supplier/auth/me", async (req: Request, res: Response) => {
    if (!req.session.supplierUserId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getSupplierUserById(req.session.supplierUserId);
    if (!user) return res.status(401).json({ message: "User not found" });
    return res.json({ id: user.id, username: user.username, supplierCode: user.supplierCode });
  });

  // ====== ADMIN SUPPLIER MANAGEMENT ======
  app.get("/api/admin/suppliers/users", requireAdmin, async (_req: Request, res: Response) => {
    const users = await storage.listSupplierUsers();
    // Filter passwordHash before sending to client
    const safeUsers = users.map(({ passwordHash, ...rest }) => rest);
    return res.json(safeUsers);
  });

  app.post("/api/admin/suppliers/users", requireAdmin, async (req: Request, res: Response) => {
    const parsed = insertSupplierUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
    }
    
    // Hash password before saving
    const passwordHash = await bcrypt.hash(req.body.password || req.body.passwordHash || "supplier123", 10);
    const user = await storage.createSupplierUser({
      ...parsed.data,
      passwordHash,
      createdBy: "admin"
    });
    // Filter passwordHash before sending to client
    const { passwordHash: _, ...safeUser } = user;
    return res.status(201).json(safeUser);
  });

  app.patch("/api/admin/suppliers/users/:id", requireAdmin, async (req: Request, res: Response) => {
    const updateData = { ...req.body };
    if (updateData.password || updateData.passwordHash) {
      updateData.passwordHash = await bcrypt.hash(updateData.password || updateData.passwordHash, 10);
      delete updateData.password;
    }
    const user = await storage.updateSupplierUser(req.params.id as string, updateData);
    if (!user) return res.status(404).json({ message: "User not found" });
    // Filter passwordHash before sending to client
    const { passwordHash: _, ...safeUser } = user;
    return res.json(safeUser);
  });

  app.delete("/api/admin/suppliers/users", requireAdmin, async (req: Request, res: Response) => {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ message: "Missing ID" });
    await storage.deleteSupplierUser(id);
    return res.json({ message: "Deleted" });
  });

  app.get("/api/admin/suppliers/access", requireAdmin, async (_req: Request, res: Response) => {
    const access = await storage.listSupplierProjectAccess();
    return res.json(access);
  });

  app.post("/api/admin/suppliers/access", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = insertSupplierProjectAccessSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
      }
      const admin = req.session.adminId ? await storage.getAdminById(req.session.adminId) : null;
      const access = await storage.assignProjectToSupplier({
        ...parsed.data,
        assignedBy: admin?.username || "admin"
      });
      return res.status(201).json(access);
    } catch (error: any) {
      console.error("Assignment error:", error);
      if (error.code === '23505') {
        return res.status(409).json({ message: "Project already assigned to this user" });
      }
      return res.status(500).json({ message: error.message || "Failed to assign project" });
    }
  });

  app.delete("/api/admin/suppliers/access", requireAdmin, async (req: Request, res: Response) => {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ message: "Missing ID" });
    await storage.removeProjectFromSupplier(id);
    return res.json({ message: "Deleted" });
  });

  // ====== SUPPLIER PORTAL ENDPOINTS ======
  app.get("/api/supplier/dashboard", requireSupplier, async (req: Request, res: Response) => {
    try {
      const user = await storage.getSupplierUserById(req.session.supplierUserId!);
      if (!user) return res.status(404).json({ message: "User not found" });
      
      const stats = await storage.getSupplierDashboardStats(user.id, user.supplierCode);
      const projects = await storage.getAssignedProjects(user.id);
      
      return res.json({
        ...stats,
        assignedProjects: projects
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/supplier/stats", requireSupplier, async (req: Request, res: Response) => {
    const user = await storage.getSupplierUserById(req.session.supplierUserId!);
    if (!user) return res.status(404).json({ message: "User not found" });
    const stats = await storage.getSupplierDashboardStats(user.id, user.supplierCode);
    return res.json(stats);
  });

  app.get("/api/supplier/assigned-projects", requireSupplier, async (req: Request, res: Response) => {
    const projects = await storage.getAssignedProjects(req.session.supplierUserId!);
    return res.json(projects);
  });

  app.get("/api/supplier/projects", requireSupplier, async (req: Request, res: Response) => {
    try {
      const user = await storage.getSupplierUserById(req.session.supplierUserId!);
      if (!user) return res.status(404).json({ message: "User not found" });
      
      const projects = await storage.getSupplierProjectsWithStats(user.id, user.supplierCode);
      return res.json(projects);
    } catch (error) {
      console.error("Projects error:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/supplier/projects/:code/stats", requireSupplier, async (req: Request, res: Response) => {
    try {
      const user = await storage.getSupplierUserById(req.session.supplierUserId!);
      if (!user) return res.status(404).json({ message: "User not found" });

      const access = await storage.getSupplierProjectAccess(user.id);
      if (!access.some(a => a.projectCode === req.params.code)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = await storage.getSupplierProjectStats(user.supplierCode, req.params.code as string);
      return res.json(stats);
    } catch (error) {
      console.error("Project stats error:", error);
      res.status(500).json({ message: "Failed to fetch project stats" });
    }
  });

  app.get("/api/supplier/responses", requireSupplier, async (req: Request, res: Response) => {
    const user = await storage.getSupplierUserById(req.session.supplierUserId!);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    const access = await storage.getSupplierProjectAccess(user.id);
    const projectCodes = access.map(a => a.projectCode);
    
    const respondents = await storage.getSupplierRespondents(user.supplierCode, projectCodes);
    // Filter sensitive fields like s2sToken for supplier portal
    const safeRespondents = respondents.map(({ s2sToken, verifyHash, ...rest }) => rest);
    return res.json(safeRespondents);
  });

  app.get("/api/supplier/responses/export-excel", requireSupplier, async (req: Request, res: Response) => {
    try {
      const user = await storage.getSupplierUserById(req.session.supplierUserId!);
      if (!user) return res.status(404).json({ message: "User not found" });

      const access = await storage.getSupplierProjectAccess(user.id);
      const projectCodes = access.map(a => a.projectCode);
      
      const respondents = await storage.getSupplierRespondents(user.supplierCode, projectCodes, true);
      const projects = await storage.getAssignedProjects(user.id);
      const suppliers = await storage.getSuppliers?.() || [] as Supplier[]; 
      const supplier = suppliers.find(s => s.code === user.supplierCode);
      
      const logs = await db.query.s2sLogs.findMany({
        where: (logs: any, { eq, and }) => and(
          eq(logs.supplierCode, user.supplierCode)
        ),
        orderBy: (logs: any, { desc }) => [desc(logs.createdAt)],
        limit: 2000
      });

      const buffer = await generateExcelReport({
        responses: respondents,
        projects: projects || [],
        suppliers: supplier ? [supplier] : [],
        s2sLogs: logs || [],
        filterSummary: `Supplier Performance Report - ${user.supplierCode}`,
        projectFilter: 'Assigned Projects',
        supplierFilter: user.supplierCode,
        statusFilter: 'All',
        dateRange: 'All Time',
        exportedBy: `Supplier (${user.username})`
      });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="OpinionInsights_Supplier_Report_${user.supplierCode}.xlsx"`);
      return res.status(200).send(buffer);
    } catch (error) {
      console.error("Supplier Excel Export Error:", error);
      return res.status(500).json({ message: "Failed to generate supplier Excel report" });
    }
  });

  // ====== REDIRECT TRACKING ENDPOINT (/track and /t/:code) ======
  // https://router.domain.com/track?code={PROJECT_CODE}&country={CC}&sup={SUP_CODE}&uid={SUP_RID}
  // OR https://router.domain.com/t/{PROJECT_CODE}?country={CC}&sup={SUP_CODE}&uid={SUP_RID}
  // sup and uid are OPTIONAL — links work with or without a supplier
  const handleTrackingRequest = async (req: Request, res: Response, codeFromPath?: string) => {
    console.log("!!! CRITICAL DEBUG: handleTrackingRequest ENTERED !!!");
    const { code, country, sup, uid, rid, toid, zid, pid, mid, sid, ...remainingParams } = req.query;
    const projectCode = (codeFromPath || code) as string;
    const countryCode = country as string || "IN";
    
    // Normalize Supplier RID from common parameter names used by various platforms
    // rid (Dynata), toid (Lucid), zid (Cint), uid (Generic), pid (Pollfish), mid (Mindshare), sid (SurveySampling)
    const supplierRid = (uid || rid || toid || zid || pid || mid || sid) as string;

    console.log(`[Routes] /track hit: codeFromPath=${codeFromPath}, query=${JSON.stringify(req.query)}`);
    console.log(`[Routes] Extracted: project=${projectCode}, country=${countryCode}, supplier=${sup}, supRid=${supplierRid}`);
    
    // Ensure all these parameters are preserved in extraParams for auto-injection/appending
    const extraParams: Record<string, string> = { ...remainingParams as Record<string, string> };
    if (uid) extraParams.uid = uid as string;
    if (rid) extraParams.rid = rid as string;
    if (toid) extraParams.toid = toid as string;
    if (zid) extraParams.zid = zid as string;
    if (pid) extraParams.pid = pid as string;
    if (mid) extraParams.mid = mid as string;
    if (sid) extraParams.sid = sid as string;

    const result = await processTrackingRequest({
      projectCode,
      countryCode,
      supplierCode: sup as string,
      supplierRid: supplierRid,
      extraParams,
      ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip || "unknown",
      userAgent: req.headers["user-agent"]
    });

    console.log(`[Routes] Tracking Result for ${projectCode}:`, JSON.stringify(result));

    if (result.error) {
      if (result.error.status === 302 && result.error.internalRedirect) {
        return res.redirect(result.error.internalRedirect);
      }
      return res.status(result.error.status).send(result.error.message);
    }

    if (result.redirectUrl) {
      return res.redirect(result.redirectUrl);
    }

    return res.status(500).send("Unknown error");
  };

  console.log("!!! [Routes] REGISTERING TRACKING ROUTES NOW !!!");
  app.get("/track", (req, res) => {
    console.log("!!! [Routes] /TRACK GET REQUEST RECEIVED !!!");
    return handleTrackingRequest(req, res);
  });
  app.get("/t/:code", (req, res) => handleTrackingRequest(req, res, req.params.code));

  // ====== CALLBACK ENDPOINTS ======
  const handleCallback = async (req: Request, res: Response, status: string) => {
    const { oi_session, clickid, pid, uid, cid, guid, rid, session_token } = req.query;
    
    let respondent: Respondent | undefined;

    // 1. Try finding by oi_session (Cleanest)
    if (oi_session) {
      respondent = await storage.getRespondentBySession(oi_session as string);
      console.log(`[Callback] Lookup by oi_session (${oi_session}): ${respondent ? 'Found' : 'Not Found'}`);
    }

    // 2. Try finding by clickid (Robustness)
    if (!respondent && clickid) {
       respondent = await storage.getRespondentByClickid(clickid as string);
       console.log(`[Callback] Lookup by clickid (${clickid}): ${respondent ? 'Found' : 'Not Found'}`);
    }

    // 3. Try finding by Project Code + Supplier UID (Recovery)
    if (!respondent && pid && uid) {
      respondent = await storage.getRespondentBySupplierRid(pid as string, uid as string);
      console.log(`[Callback] Lookup by pid+uid (${pid}+${uid}): ${respondent ? 'Found' : 'Not Found'}`);
    }

    if (!respondent) {
        console.warn(`[Callback] Could not find session. Status: ${status}, Params:`, JSON.stringify(req.query));
        // If we can't find it, show a meaningful landing page instead of raw error
        let statusToUse = status;
        if (statusToUse === 'quota') statusToUse = 'quotafull';
        const landingPath = (routerService.internalPathMap as any)[statusToUse] || '/pages/terminate';
        return res.redirect(`${landingPath}?status=${statusToUse}&error=session_not_found`);
    }

    if (respondent.status !== 'started' && respondent.status !== 'pending') {
      console.log(`[Callback] Session ${respondent.oiSession} already has status ${respondent.status}. Redirecting to final destination.`);
      const supplier = respondent.supplierCode ? await storage.getSupplierByCode(respondent.supplierCode) : undefined;
      const project = await storage.getProjectByCode(respondent.projectCode);
      const finalRedirectUrl = routerService.getStatusRedirectUrl(respondent.status, respondent, supplier, project);
      return res.redirect(finalRedirectUrl);
    }

    let finalStatus = status;

    // S2S Verification Check (using InsForge HTTP SDK to avoid TCP timeout)
    if (status === 'complete') {
      const s2sConfig = await storage.getS2sConfig(respondent.projectCode);
      if (s2sConfig && s2sConfig.requireS2S && !respondent.s2sVerified) {
        // Fraud detected! Mark as security-terminate and log alert
        finalStatus = 'security-terminate';
        await storage.createActivityLog({
          oiSession: respondent.oiSession,
          eventType: 'security_alert',
          meta: { details: `Fraud attempt blocked: Manual client complete without S2S verification.` }
        });
        // Update respondent fraud flag via InsForge HTTP
        await insforge.database.from('respondents').update({ fraud_score: '1.0', status: 'fraud' }).eq('oi_session', respondent.oiSession);
      }
    }

    // Update Status
    if (finalStatus !== 'security-terminate' || status === 'security-terminate') {
       await storage.updateRespondentStatus(respondent.oiSession, finalStatus);
    }

    // Get Supplier & Project for Redirect calculation
    const supplier = respondent.supplierCode ? await storage.getSupplierByCode(respondent.supplierCode) : undefined;
    const project = await storage.getProjectByCode(respondent.projectCode);

    // Log Activity
    await storage.createActivityLog({
      oiSession: respondent.oiSession,
      eventType: 'callback',
      meta: { details: `Received ${status} callback from client.` }
    });

    // Calculate Destination URL using Unified Router Service
    const finalRedirectUrl = routerService.getStatusRedirectUrl(finalStatus, respondent, supplier, project);

    return res.redirect(finalRedirectUrl);
  };

  app.get("/complete", (req, res) => handleCallback(req, res, "complete"));
  app.get("/terminate", (req, res) => handleCallback(req, res, "terminate"));
  app.get("/quotafull", (req, res) => handleCallback(req, res, "quotafull"));
  app.get("/security-terminate", (req, res) => handleCallback(req, res, "security-terminate"));

  // Unified Status Endpoint using UID and Project Code
  // Uses InsForge HTTP SDK to avoid direct TCP database connections that time out locally
  app.get("/status", async (req: Request, res: Response) => {
    const { code, uid, type } = req.query;
    if (!code || !uid || !type) {
      return res.status(400).send("Missing required parameters: code, uid, type");
    }

    try {
      // Use InsForge HTTP SDK instead of raw Drizzle (avoids ETIMEDOUT on local)
      const { data: rows, error } = await insforge.database
        .from('respondents')
        .select('*')
        .eq('project_code', (code as string).toUpperCase())
        .eq('supplier_rid', uid as string)
        .order('started_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      const raw = rows?.[0];
      if (!raw) {
        // No session found - redirect straight to the internal status landing page
        let statusToUse = (type as string).toLowerCase();
        if (statusToUse === 'quota') statusToUse = 'quotafull';
        else if (['security_terminate','duplicate','duplicate_ip','duplicate_string'].includes(statusToUse)) statusToUse = 'security';
        const landingPath = (routerService.internalPathMap as any)[statusToUse] || '/pages/terminate';
        return res.redirect(`${landingPath}?pid=${(code as string).toUpperCase()}&uid=${uid}`);
      }

      // Map snake_case to camelCase for handleCallback compatibility
      req.query.oi_session = raw.oi_session;

      // Map 'type' to our internal status logic
      let statusToUse = (type as string).toLowerCase();
      if (statusToUse === 'quota') statusToUse = 'quotafull';
      else if (['security_terminate','duplicate','duplicate_ip','duplicate_string'].includes(statusToUse)) statusToUse = 'security-terminate';

      return handleCallback(req, res, statusToUse);
    } catch (e) {
      console.error("Error processing /status endpoint:", e);
      return res.status(500).send("Internal Server Error");
    }
  });

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

  // ====== DUMMY DATA SEED ======
  app.post("/api/admin/seed-dummy-data", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const results: string[] = [];

      // --- PROJECTS ---
      const projectDefs = [
        { projectCode: "OPI-HEALTH-24", projectName: "Health & Wellness Survey 2024", client: "HealthCorp", ridPrefix: "OPH", ridCountryCode: "US", ridPadding: 5 },
        { projectCode: "OPI-TECH-24", projectName: "Technology Adoption Study", client: "TechInsights", ridPrefix: "OPT", ridCountryCode: "UK", ridPadding: 5 },
        { projectCode: "OPI-FIN-24", projectName: "Financial Sentiment Tracker", client: "FinanceIQ", ridPrefix: "OPF", ridCountryCode: "AU", ridPadding: 5 },
        { projectCode: "OPI-RETAIL-24", projectName: "Retail Experience Benchmark", client: "RetailEdge", ridPrefix: "OPR", ridCountryCode: "IN", ridPadding: 5 },
        { projectCode: "OPI-AUTO-24", projectName: "Automotive Preference Study", client: "AutoSense", ridPrefix: "OPA", ridCountryCode: "DE", ridPadding: 5 },
      ];

      const createdProjects: any[] = [];
      for (const pd of projectDefs) {
        try {
          const existing = await storage.getProjectByCode(pd.projectCode);
          if (!existing) {
            const p = await storage.createProject({
              ...pd,
              status: "active",
              ridCounter: 0,
              completeUrl: "https://example.com/complete?rid={RID}",
              terminateUrl: "https://example.com/terminate?rid={RID}",
              quotafullUrl: "https://example.com/quotafull?rid={RID}",
              securityUrl: "https://example.com/security?rid={RID}",
              clientUidParam: "uid",
              forcePidAsUid: false,
              uidInjectionType: "query"
            });
            createdProjects.push(p);
            results.push(`Created project: ${pd.projectCode}`);
          } else {
            createdProjects.push(existing);
            results.push(`Skipped project (exists): ${pd.projectCode}`);
          }
        } catch (_) {}
      }

      // --- SUPPLIERS ---
      const supplierDefs = [
        { name: "PanelPlus Global", code: "PNLP", completeUrl: "https://pnlplus.com/complete?uid={RID}", terminateUrl: "https://pnlplus.com/term?uid={RID}", quotafullUrl: "https://pnlplus.com/qf?uid={RID}", securityUrl: "https://pnlplus.com/sec?uid={RID}" },
        { name: "SurveyReach Inc", code: "SRVR", completeUrl: "https://surveyreach.io/done?r={RID}", terminateUrl: "https://surveyreach.io/term?r={RID}", quotafullUrl: "https://surveyreach.io/qf?r={RID}", securityUrl: "https://surveyreach.io/sec?r={RID}" },
        { name: "DataMinds Network", code: "DTMN", completeUrl: "https://dataminds.net/end?id={RID}", terminateUrl: "https://dataminds.net/term?id={RID}", quotafullUrl: "https://dataminds.net/qf?id={RID}", securityUrl: "https://dataminds.net/sec?id={RID}" },
      ];

      for (const sd of supplierDefs) {
        try {
          const existing = await storage.getSupplierByCode(sd.code);
          if (!existing) {
            await storage.createSupplier({ ...sd, passwordHash: null, uidMacro: "[uid]" });
            results.push(`Created supplier: ${sd.code}`);
          } else {
            results.push(`Skipped supplier (exists): ${sd.code}`);
          }
        } catch (_) {}
      }

      // --- RESPONDENTS ---
      const statuses = [
        "complete", "complete", "complete", "complete", "complete",
        "terminate", "terminate", "terminate",
        "quotafull", "quotafull",
        "security-terminate",
        "started", "started"
      ];
      const supplierCodes = ["PNLP", "SRVR", "DTMN", "DIRECT"];
      const countries = ["US", "UK", "AU", "IN", "DE"];
      const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0) Mobile/15E148",
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/120.0.0.0 Mobile",
      ];

      let respondentCount = 0;
      for (const project of createdProjects) {
        const numRespondents = 18 + Math.floor(Math.random() * 12);
        for (let i = 0; i < numRespondents; i++) {
          try {
            const oiSession = randomUUID();
            const supplierCode = supplierCodes[i % supplierCodes.length];
            const status = statuses[i % statuses.length];
            const country = countries[i % countries.length];
            const minutesAgo = Math.floor(Math.random() * 1440);

            await storage.createRespondent({
              oiSession,
              projectCode: project.projectCode,
              supplierCode,
              supplierRid: `${supplierCode}-${randomUUID().split("-")[0].toUpperCase()}`,
              countryCode: country,
              clientRid: `${project.ridPrefix || "OPI"}${country}${String(i + 1).padStart(5, "0")}`,
              ipAddress: `${Math.floor(Math.random() * 220) + 10}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
              userAgent: userAgents[i % userAgents.length],
              status,
              s2sVerified: status === "complete",
              fraudScore: status === "security-terminate" ? 0.92 : 0.0,
              clientUidParam: "uid",
              uidInjectionType: "query"
            });

            respondentCount++;
          } catch (_) {}
        }
      }
      results.push(`Created ${respondentCount} respondents across ${createdProjects.length} projects`);

      return res.json({ success: true, message: "Dummy data seeded!", details: results });
    } catch (err: any) {
      console.error("Seed error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  return createServer(app);
}
