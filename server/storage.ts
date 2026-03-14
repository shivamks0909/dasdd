import { insforge } from "./insforge";
import {
  type Admin, type InsertAdmin,
  type Project, type InsertProject,
  type CountrySurvey, type InsertCountrySurvey,
  type Supplier, type InsertSupplier,
  type Respondent, type InsertRespondent,
  type ActivityLog, type InsertActivityLog,
  type Client, type InsertClient,
  type SupplierAssignment, type InsertSupplierAssignment,
  type ProjectS2sConfig, type InsertProjectS2sConfig,
  type S2sLog, type InsertS2sLog,
  type SupplierUser, type InsertSupplierUser,
  type SupplierProjectAccess, type InsertSupplierProjectAccess,
  type DashboardStats
} from "@shared/schema";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface IStorage {
  // Auth
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdminById(id: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdminPassword(id: string, passwordHash: string): Promise<void>;

  // Projects
  getProjects(): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | undefined>;
  getProjectByCode(projectCode: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  // Country Surveys
  getCountrySurveys(projectId: string): Promise<CountrySurvey[]>;
  getCountrySurveyByCode(projectCode: string, countryCode: string): Promise<CountrySurvey | undefined>;
  createCountrySurvey(survey: InsertCountrySurvey): Promise<CountrySurvey>;
  deleteCountrySurvey(id: string): Promise<void>;
  deleteAllCountrySurveys(projectId: string): Promise<void>;

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplierById(id: string): Promise<Supplier | undefined>;
  getSupplierByCode(code: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  updateSupplierPassword(id: string, hash: string): Promise<void>;
  deleteSupplier(id: string): Promise<void>;

  // Respondents (Tracking)
  createRespondent(respondent: InsertRespondent): Promise<Respondent>;
  getRespondentBySession(oiSession: string): Promise<Respondent | undefined>;
  updateRespondentStatus(oiSession: string, status: string, redirectUrl?: string): Promise<Respondent | undefined>;
  checkDuplicateRespondent(projectCode: string, supplierCode: string, supplierRid: string): Promise<boolean>;
  getRespondents(): Promise<Respondent[]>;
  getRespondentsByProject(projectCode: string): Promise<Respondent[]>;

  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(oiSession: string): Promise<ActivityLog[]>;

  // Stats
  getDashboardStats(): Promise<DashboardStats>;
  getSystemPulseStats(): Promise<{
    totalVolume: number;
    successChain: number;
    filteredOut: number;
    securityAlerts: number;
    ratePerMinute: number;
    recentActivity: any[];
  }>;

  // RID Generation
  generateClientRID(projectCode: string): Promise<string>;

  // Clients
  getClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<void>;

  // Supplier Assignments
  getSupplierAssignments(projectCode?: string, supplierId?: string): Promise<any[]>;
  createSupplierAssignment(assignment: InsertSupplierAssignment): Promise<SupplierAssignment>;
  updateSupplierAssignment(id: string, data: Partial<SupplierAssignment>): Promise<SupplierAssignment | undefined>;
  deleteSupplierAssignment(id: string): Promise<void>;
  getSupplierAssignmentByCombo(projectCode: string, countryCode: string, supplierId: string): Promise<SupplierAssignment | undefined>;

  // S2S Config
  getS2sConfig(projectCode: string): Promise<ProjectS2sConfig | undefined>;
  createS2sConfig(config: InsertProjectS2sConfig): Promise<ProjectS2sConfig>;
  updateS2sConfig(projectCode: string, config: Partial<InsertProjectS2sConfig>): Promise<ProjectS2sConfig>;

  // S2S Logs
  createS2sLog(log: InsertS2sLog): Promise<S2sLog>;
  getS2sLogs(projectCode: string): Promise<S2sLog[]>;

  // Security Alerts
  getSecurityAlerts(): Promise<ActivityLog[]>;

  // Additional Respondent Logic
  verifyS2sRespondent(oiSession: string, status: string): Promise<void>;
  // Export methods
  getExportData(projectIds?: string[], status?: string): Promise<any[]>;
  getSupplierAssignmentsForExport(supplierId: string): Promise<any[]>;

  // Supplier Portal
  getSupplierUserByUsername(username: string): Promise<SupplierUser | undefined>;
  getSupplierUserById(id: string): Promise<SupplierUser | undefined>;
  getSupplierProjectAccess(userId: string): Promise<SupplierProjectAccess[]>;
  getAssignedProjects(userId: string): Promise<Project[]>;
  createSupplierUser(user: InsertSupplierUser): Promise<SupplierUser>;
  updateSupplierUser(id: string, user: Partial<InsertSupplierUser>): Promise<SupplierUser | undefined>;
  getSupplierDashboardStats(userId: string, supplierCode: string): Promise<DashboardStats>;
  listSupplierUsers(): Promise<SupplierUser[]>;
  listSupplierProjectAccess(): Promise<SupplierProjectAccess[]>;
  assignProjectToSupplier(access: InsertSupplierProjectAccess): Promise<SupplierProjectAccess>;
  removeProjectFromSupplier(id: string): Promise<void>;
  deleteSupplierUser(id: string): Promise<void>;
  getSupplierRespondents(supplierCode: string, projectCodes: string[]): Promise<Respondent[]>;
  getSupplierStatsOverview(supplierCode: string): Promise<{
    completed: number;
    disqualified: number;
    quotafull: number;
    security: number;
  }>;
}

// Mapping helpers to bridge snake_case DB columns and camelCase TS properties
const mapAdmin = (data: any): Admin => ({
  ...data,
  passwordHash: data.password_hash,
  createdAt: data.created_at ? new Date(data.created_at) : undefined
});

const mapProject = (data: any): Project => ({
  ...data,
  projectCode: data.project_code,
  projectName: data.project_name,
  ridPrefix: data.rid_prefix,
  ridCountryCode: data.rid_country_code,
  ridPadding: data.rid_padding,
  ridCounter: data.rid_counter,
  createdAt: data.created_at ? new Date(data.created_at) : undefined,
  completeUrl: data.complete_url,
  terminateUrl: data.terminate_url,
  quotafullUrl: data.quotafull_url,
  securityUrl: data.security_url
});

const mapCountrySurvey = (data: any): CountrySurvey => ({
  ...data,
  projectId: data.project_id,
  projectCode: data.project_code,
  countryCode: data.country_code,
  surveyUrl: data.survey_url,
  createdAt: data.created_at ? new Date(data.created_at) : undefined
});

const mapSupplier = (data: any): Supplier => ({
  ...data,
  passwordHash: data.password_hash,
  completeUrl: data.complete_url,
  terminateUrl: data.terminate_url,
  quotafullUrl: data.quotafull_url,
  securityUrl: data.security_url,
  createdAt: data.created_at ? new Date(data.created_at) : undefined
});

const mapRespondent = (data: any): Respondent => ({
  ...data,
  projectCode: data.project_code,
  countryCode: data.country_code,
  supplierCode: data.supplier_code,
  supplierRid: data.supplier_rid,
  clientRid: data.client_rid,
  oiSession: data.oi_session,
  s2sVerified: data.s2s_verified,
  fraudScore: parseFloat(data.fraud_score || "0"),
  s2sToken: data.s2s_token,
  s2sReceivedAt: data.s2s_received_at ? new Date(data.s2s_received_at) : undefined,
  startedAt: data.started_at ? new Date(data.started_at) : undefined,
  completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
  ipAddress: data.ip_address,
  userAgent: data.user_agent,
  surveyUrl: data.survey_url,
  redirectUrl: data.redirect_url,
  verifyHash: data.verify_hash
});

const mapSupplierUser = (data: any): SupplierUser => ({
  ...data,
  passwordHash: data.password_hash,
  supplierId: data.supplier_id,
  supplierCode: data.supplier_code,
  isActive: data.is_active,
  lastLogin: data.last_login ? new Date(data.last_login) : undefined,
  createdAt: data.created_at ? new Date(data.created_at) : undefined,
  createdBy: data.created_by
});

const mapSupplierProjectAccess = (data: any): SupplierProjectAccess => ({
  ...data,
  userId: data.user_id,
  projectId: data.project_id,
  projectCode: data.project_code,
  assignedAt: data.assigned_at ? new Date(data.assigned_at) : undefined,
  assignedBy: data.assigned_by
});

export class DatabaseStorage implements IStorage {
  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const { data } = await insforge.database.from("admins").select("*").eq("username", username).single();
    return data ? mapAdmin(data) : undefined;
  }

  async getAdminById(id: string): Promise<Admin | undefined> {
    const { data } = await insforge.database.from("admins").select("*").eq("id", id).single();
    return data ? mapAdmin(data) : undefined;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const dbAdmin = {
      username: admin.username,
      password_hash: admin.passwordHash
    };
    const { data } = await insforge.database.from("admins").insert([dbAdmin]).select().single();
    if (!data) throw new Error("Failed to create admin");
    return mapAdmin(data);
  }

  async updateAdminPassword(id: string, passwordHash: string): Promise<void> {
    await insforge.database.from("admins").update({ password_hash: passwordHash }).eq("id", id);
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    const { data } = await insforge.database.from("projects").select("*").order("created_at", { ascending: false });
    return (data || []).map(mapProject);
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    const { data } = await insforge.database.from("projects").select("*").eq("id", id).single();
    return data ? mapProject(data) : undefined;
  }

  async getProjectByCode(projectCode: string): Promise<Project | undefined> {
    const { data } = await insforge.database.from("projects").select("*").eq("project_code", projectCode).maybeSingle();
    return data ? mapProject(data) : undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const dbProject = {
      project_code: project.projectCode,
      project_name: project.projectName,
      client: project.client,
      status: project.status,
      rid_prefix: project.ridPrefix,
      rid_country_code: project.ridCountryCode,
      rid_padding: project.ridPadding,
      rid_counter: project.ridCounter,
      complete_url: project.completeUrl,
      terminate_url: project.terminateUrl,
      quotafull_url: project.quotafullUrl,
      security_url: project.securityUrl
    };
    const { data } = await insforge.database.from("projects").insert([dbProject]).select().single();
    if (!data) throw new Error("Failed to create project");
    return mapProject(data);
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const dbProject: any = {};
    if (project.projectCode) dbProject.project_code = project.projectCode;
    if (project.projectName) dbProject.project_name = project.projectName;
    if (project.client !== undefined) dbProject.client = project.client;
    if (project.status) dbProject.status = project.status;
    if (project.ridPrefix !== undefined) dbProject.rid_prefix = project.ridPrefix;
    if (project.ridCountryCode !== undefined) dbProject.rid_country_code = project.ridCountryCode;
    if (project.ridPadding !== undefined) dbProject.rid_padding = project.ridPadding;
    if (project.ridCounter !== undefined) dbProject.rid_counter = project.ridCounter;
    if (project.completeUrl !== undefined) dbProject.complete_url = project.completeUrl;
    if (project.terminateUrl !== undefined) dbProject.terminate_url = project.terminateUrl;
    if (project.quotafullUrl !== undefined) dbProject.quotafull_url = project.quotafullUrl;
    if (project.securityUrl !== undefined) dbProject.security_url = project.securityUrl;

    const { data } = await insforge.database.from("projects").update(dbProject).eq("id", id).select().single();
    return data ? mapProject(data) : undefined;
  }

  async generateClientRID(projectCode: string): Promise<string> {
    const project = await this.getProjectByCode(projectCode);
    if (!project) throw new Error(`Project with code ${projectCode} not found`);

    const nextCounter = (project.ridCounter || 0) + 1;
    await insforge.database.from("projects").update({ rid_counter: nextCounter }).eq("id", project.id);

    const prefix = project.ridPrefix || "";
    const countryCode = project.ridCountryCode || "";
    const padding = project.ridPadding || 4;

    const paddedCounter = nextCounter.toString().padStart(padding, "0");
    return `${prefix}${countryCode}${paddedCounter}`;
  }

  async deleteProject(id: string): Promise<void> {
    await insforge.database.from("projects").delete().eq("id", id);
  }

  // Country Surveys
  async getCountrySurveys(projectId: string): Promise<CountrySurvey[]> {
    const { data } = await insforge.database.from("country_surveys").select("*").eq("project_id", projectId);
    return (data || []).map(mapCountrySurvey);
  }

  async getCountrySurveyByCode(projectCode: string, countryCode: string): Promise<CountrySurvey | undefined> {
    const { data } = await insforge.database.from("country_surveys").select("*").eq("project_code", projectCode).eq("country_code", countryCode).maybeSingle();
    return data ? mapCountrySurvey(data) : undefined;
  }

  async createCountrySurvey(survey: InsertCountrySurvey): Promise<CountrySurvey> {
    const dbSurvey = {
      project_id: survey.projectId,
      project_code: survey.projectCode,
      country_code: survey.countryCode,
      survey_url: survey.surveyUrl,
      status: survey.status || 'active'
    };
    const { data } = await insforge.database.from("country_surveys").insert([dbSurvey]).select().single();
    if (!data) throw new Error("Failed to create country survey");
    return mapCountrySurvey(data);
  }

  async deleteCountrySurvey(id: string): Promise<void> {
    await insforge.database.from("country_surveys").delete().eq("id", id);
  }

  async deleteAllCountrySurveys(projectId: string): Promise<void> {
    await insforge.database.from("country_surveys").delete().eq("project_id", projectId);
  }

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    const { data } = await insforge.database.from("suppliers").select("*").order("created_at", { ascending: false });
    return (data || []).map(mapSupplier);
  }

  async getSupplierById(id: string): Promise<Supplier | undefined> {
    const { data } = await insforge.database.from("suppliers").select("*").eq("id", id).single();
    return data ? mapSupplier(data) : undefined;
  }

  async getSupplierByCode(code: string): Promise<Supplier | undefined> {
    const { data } = await insforge.database.from("suppliers").select("*").eq("code", code).maybeSingle();
    return data ? mapSupplier(data) : undefined;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const dbSupplier = {
      name: supplier.name,
      code: supplier.code,
      complete_url: supplier.completeUrl,
      terminate_url: supplier.terminateUrl,
      quotafull_url: supplier.quotafullUrl,
      security_url: supplier.securityUrl,
      password_hash: supplier.passwordHash || null
    };
    const { data } = await insforge.database.from("suppliers").insert([dbSupplier]).select().single();
    if (!data) throw new Error("Failed to create supplier");
    return mapSupplier(data);
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const dbSupplier: any = {};
    if (supplier.name) dbSupplier.name = supplier.name;
    if (supplier.code) dbSupplier.code = supplier.code;
    if (supplier.completeUrl !== undefined) dbSupplier.complete_url = supplier.completeUrl;
    if (supplier.terminateUrl !== undefined) dbSupplier.terminate_url = supplier.terminateUrl;
    if (supplier.quotafullUrl !== undefined) dbSupplier.quotafull_url = supplier.quotafullUrl;
    if (supplier.securityUrl !== undefined) dbSupplier.security_url = supplier.securityUrl;
    if (supplier.passwordHash !== undefined) dbSupplier.password_hash = supplier.passwordHash;

    const { data } = await insforge.database.from("suppliers").update(dbSupplier).eq("id", id).select().single();
    return data ? mapSupplier(data) : undefined;
  }

  async deleteSupplier(id: string): Promise<void> {
    await insforge.database.from("suppliers").delete().eq("id", id);
  }

  async updateSupplierPassword(id: string, hash: string): Promise<void> {
    await insforge.database.from("suppliers").update({ password_hash: hash }).eq("id", id);
  }

  // Respondents
  async createRespondent(respondent: InsertRespondent): Promise<Respondent> {
    const dbRespondent = {
      project_code: respondent.projectCode,
      country_code: respondent.countryCode,
      supplier_code: respondent.supplierCode,
      supplier_rid: respondent.supplierRid,
      client_rid: respondent.clientRid,
      oi_session: respondent.oiSession,
      status: respondent.status,
      s2s_verified: respondent.s2sVerified,
      fraud_score: respondent.fraudScore,
      s2s_token: respondent.s2sToken,
      ip_address: respondent.ipAddress,
      user_agent: respondent.userAgent,
      survey_url: respondent.surveyUrl || (respondent as any).surveyUrl || null,
      verify_hash: respondent.verifyHash || (respondent as any).verifyHash || null
    };
    const { data } = await insforge.database.from("respondents").insert([dbRespondent]).select().single();
    if (!data) throw new Error("Failed to create respondent");
    return mapRespondent(data);
  }

  async getRespondentBySession(oiSession: string): Promise<Respondent | undefined> {
    const { data } = await insforge.database.from("respondents").select("*").eq("oi_session", oiSession).maybeSingle();
    return data ? mapRespondent(data) : undefined;
  }

  async updateRespondentStatus(oiSession: string, status: string, redirectUrl?: string): Promise<Respondent | undefined> {
    const updateData: any = { 
      status, 
      completed_at: status !== 'started' ? new Date() : null 
    };
    if (redirectUrl) {
      updateData.redirect_url = redirectUrl;
    }

    const { data } = await insforge.database.from("respondents")
      .update(updateData)
      .eq("oi_session", oiSession)
      .select()
      .single();
    return data ? mapRespondent(data) : undefined;
  }

  async checkDuplicateRespondent(projectCode: string, supplierCode: string, supplierRid: string): Promise<boolean> {
    const { count } = await insforge.database.from("respondents")
      .select("*", { count: 'exact', head: true })
      .eq("project_code", projectCode)
      .eq("supplier_code", supplierCode)
      .eq("supplier_rid", supplierRid);
    return (count || 0) > 0;
  }

  async getRespondents(): Promise<Respondent[]> {
    const { data } = await insforge.database.from("respondents").select("*").order("started_at", { ascending: false });
    return (data || []).map(mapRespondent);
  }

  async getEnrichedRespondents(limit = 100): Promise<any[]> {
    const { data: respondents } = await insforge.database.from("respondents")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);
    
    if (!respondents) return [];

    const { data: suppliers } = await insforge.database.from("suppliers").select("id, name, code");
    const supplierMap = new Map((suppliers || []).map(s => [s.code, s.name]));

    const { data: projects } = await insforge.database.from("projects").select("project_code, project_name");
    const projectMap = new Map((projects || []).map(p => [p.project_code, p.project_name]));

    return respondents.map(r => ({
      ...mapRespondent(r),
      supplierName: r.supplier_code ? supplierMap.get(r.supplier_code) || "Direct Traffic" : "Direct Traffic",
      projectName: projectMap.get(r.project_code) || r.project_code
    }));
  }

  async getRespondentsByProject(projectCode: string): Promise<Respondent[]> {
    const { data } = await insforge.database.from("respondents")
      .select("*")
      .eq("project_code", projectCode)
      .order("started_at", { ascending: false });
    return (data || []).map(mapRespondent);
  }

  // Activity Logs
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const dbLog: any = {
      oi_session: log.oiSession,
      event_type: log.eventType,
      meta: log.meta || null
    };
    // Include project_code if provided (tracking handler sends it)
    if ((log as any).projectCode) {
      dbLog.project_code = (log as any).projectCode;
    }
    const { data } = await insforge.database.from("activity_logs").insert([dbLog]).select().single();
    if (!data) throw new Error("Failed to create activity log");
    return data;
  }

  async getActivityLogs(oiSession: string): Promise<ActivityLog[]> {
    const { data } = await insforge.database.from("activity_logs").select("*").eq("oi_session", oiSession).order("created_at", { ascending: false });
    return data || [];
  }

  // Internal stats calculation
  async getDashboardStats() {
    const { count: totalProjects } = await insforge.database.from("projects").select("*", { count: 'exact', head: true });
    const { count: totalRespondents } = await insforge.database.from("respondents").select("*", { count: 'exact', head: true });
    const { count: completes } = await insforge.database.from("respondents").select("*", { count: 'exact', head: true }).eq("status", "complete");
    const { count: terminates } = await insforge.database.from("respondents").select("*", { count: 'exact', head: true }).eq("status", "terminate");
    const { count: quotafulls } = await insforge.database.from("respondents").select("*", { count: 'exact', head: true }).eq("status", "quotafull");
    const { count: securityTerminates } = await insforge.database.from("respondents").select("*", { count: 'exact', head: true }).eq("status", "security-terminate");

    return {
      totalProjects: totalProjects || 0,
      totalRespondents: totalRespondents || 0,
      completes: completes || 0,
      terminates: terminates || 0,
      quotafulls: quotafulls || 0,
      securityTerminates: securityTerminates || 0,
      activityData: [],
    };
  }

  async getSystemPulseStats() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: last24h } = await insforge.database.from("respondents").select("*").gte("started_at", oneDayAgo);
    
    const activity = (last24h || []).map(mapRespondent);
    return {
      totalVolume: activity.length,
      successChain: activity.filter(r => r.status === 'complete' && r.s2sVerified).length,
      filteredOut: activity.filter(r => ['terminate', 'quotafull'].includes(r.status || '')).length,
      securityAlerts: activity.filter(r => ['security-terminate', 'fraud'].includes(r.status || '')).length,
      ratePerMinute: 0,
      recentActivity: activity.slice(0, 20)
    };
  }

  // Clients
  async getClients(): Promise<Client[]> {
    const { data } = await insforge.database.from("clients").select("*").order("created_at", { ascending: false });
    return data || [];
  }

  async createClient(client: InsertClient): Promise<Client> {
    const { data } = await insforge.database.from("clients").insert([{ ...client }]).select().single();
    if (!data) throw new Error("Failed to create client");
    return data;
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined> {
    const { data } = await insforge.database.from("clients").update(client).eq("id", id).select().single();
    return data || undefined;
  }

  async deleteClient(id: string): Promise<void> {
    await insforge.database.from("clients").delete().eq("id", id);
  }

  // Supplier Assignments
  async getSupplierAssignments(projectCode?: string, supplierId?: string): Promise<any[]> {
    let query = insforge.database.from("supplier_assignments").select(`
      *,
      suppliers!inner(name, code),
      projects!inner(project_name)
    `);

    if (projectCode) query = query.eq("project_code", projectCode);
    if (supplierId) query = query.eq("supplier_id", supplierId);

    const { data } = await query.order("created_at", { ascending: false });
    
    return (data || []).map(a => ({
      ...a,
      projectCode: a.project_code,
      countryCode: a.country_code,
      supplierId: a.supplier_id,
      completeUrl: a.complete_url,
      terminateUrl: a.terminate_url,
      quotafull_url: a.quotafull_url,
      security_url: a.security_url,
      supplierName: a.suppliers?.name,
      supplierCode: a.suppliers?.code,
      projectName: a.projects?.project_name
    }));
  }

  async createSupplierAssignment(assignment: InsertSupplierAssignment): Promise<SupplierAssignment> {
    const a = assignment as any;
    const dbAssignment: any = {
      project_code: a.projectCode,
      country_code: a.countryCode,
      supplier_id: a.supplierId || null,
      generated_link: a.generatedLink,
      status: a.status || 'active',
      notes: a.notes || null,
    };
    const { data, error } = await insforge.database.from("supplier_assignments").insert([dbAssignment]).select().single();
    if (error) {
      console.error("DB insert error for supplier_assignments:", error);
      throw new Error(`Failed to create supplier assignment: ${error.message}`);
    }
    if (!data) throw new Error("Failed to create supplier assignment");
    return data;
  }

  async updateSupplierAssignment(id: string, assignment: Partial<SupplierAssignment>): Promise<SupplierAssignment | undefined> {
    const a = assignment as any;
    const dbAssignment: any = {};
    if (a.projectCode) dbAssignment.project_code = a.projectCode;
    if (a.countryCode) dbAssignment.country_code = a.countryCode;
    if (a.supplierId) dbAssignment.supplier_id = a.supplierId;
    if (a.status) dbAssignment.status = a.status;
    if (a.completeUrl !== undefined) dbAssignment.complete_url = a.completeUrl;
    if (a.terminateUrl !== undefined) dbAssignment.terminate_url = a.terminateUrl;
    if (a.quotafullUrl !== undefined) dbAssignment.quotafull_url = a.quotafullUrl;
    if (a.securityUrl !== undefined) dbAssignment.security_url = a.securityUrl;

    const { data: updated } = await insforge.database.from("supplier_assignments").update(dbAssignment).eq("id", id).select().single();
    return updated || undefined;
  }

  async deleteSupplierAssignment(id: string): Promise<void> {
    await insforge.database.from("supplier_assignments").delete().eq("id", id);
  }

  async getSupplierAssignmentByCombo(projectCode: string, countryCode: string, supplierId: string): Promise<SupplierAssignment | undefined> {
    const { data } = await insforge.database.from("supplier_assignments")
      .select("*")
      .eq("project_code", projectCode)
      .eq("country_code", countryCode)
      .eq("supplier_id", supplierId)
      .single();
    return data || undefined;
  }

  // S2S Config
  async getS2sConfig(projectCode: string): Promise<ProjectS2sConfig | undefined> {
    const { data } = await insforge.database.from("project_s2s_config").select("*").eq("project_code", projectCode).single();
    return data || undefined;
  }

  async createS2sConfig(config: InsertProjectS2sConfig): Promise<ProjectS2sConfig> {
    const c = config as any;
    const dbConfig: any = {
      project_code: c.projectCode,
      s2s_secret: c.s2sSecret,
      require_s2s: c.requireS2S
    };
    if (c.s2sUrl) dbConfig.s2s_url = c.s2sUrl;
    if (c.tokenParam) dbConfig.token_param = c.tokenParam;
    if (c.statusParam) dbConfig.status_param = c.statusParam;
    if (c.ridParam) dbConfig.rid_param = c.ridParam;
    if (c.additionalParams) dbConfig.additional_params = c.additionalParams;
    const { data } = await insforge.database.from("project_s2s_config").insert([dbConfig]).select().single();
    if (!data) throw new Error("Failed to create S2S config");
    return data;
  }

  async updateS2sConfig(projectCode: string, config: Partial<InsertProjectS2sConfig>): Promise<ProjectS2sConfig> {
    const c = config as any;
    const dbConfig: any = {};
    if (c.s2sUrl !== undefined) dbConfig.s2s_url = c.s2sUrl;
    if (c.tokenParam !== undefined) dbConfig.token_param = c.tokenParam;
    if (c.statusParam !== undefined) dbConfig.status_param = c.statusParam;
    if (c.ridParam !== undefined) dbConfig.rid_param = c.ridParam;
    if (c.additionalParams !== undefined) dbConfig.additional_params = c.additionalParams;
    if (c.s2sSecret !== undefined) dbConfig.s2s_secret = c.s2sSecret;
    if (c.requireS2S !== undefined) dbConfig.require_s2s = c.requireS2S;

    const { data } = await insforge.database.from("project_s2s_config")
      .update(dbConfig)
      .eq("project_code", projectCode)
      .select()
      .single();
    if (!data) throw new Error("Failed to update S2S config");
    return data;
  }

  // S2S Logs
  async createS2sLog(log: InsertS2sLog): Promise<S2sLog> {
    const l = log as any;
    const dbLog: any = {
      project_code: l.projectCode,
      oi_session: l.oiSession,
      status: l.status,
      payload: l.payload,
      supplier_code: l.supplierCode,
      ip_address: l.ipAddress,
      user_agent: l.userAgent
    };
    if (l.endpoint) dbLog.endpoint = l.endpoint;
    if (l.response) dbLog.response = l.response;
    if (l.statusCode) dbLog.status_code = l.statusCode;
    if (l.success !== undefined) dbLog.success = l.success;
    const { data } = await insforge.database.from("s2s_logs").insert([dbLog]).select().single();
    if (!data) throw new Error("Failed to create S2S log");
    return data;
  }

  async getS2sLogs(projectCode: string): Promise<S2sLog[]> {
    const { data } = await insforge.database.from("s2s_logs")
      .select("*")
      .eq("project_code", projectCode)
      .order("created_at", { ascending: false })
      .limit(100);
    return data || [];
  }

  // Security Alerts
  async getSecurityAlerts(): Promise<ActivityLog[]> {
    const { data } = await insforge.database.from("activity_logs")
      .select("*")
      .eq("event_type", "security_alert")
      .order("created_at", { ascending: false })
      .limit(50);
    return data || [];
  }

  // Additional Respondent Logic
  async verifyS2sRespondent(oiSession: string, status: string): Promise<void> {
    await insforge.database.from("respondents")
      .update({ s2s_verified: true, status: status || 'complete', completed_at: new Date() })
      .eq("oi_session", oiSession);
  }

  // Export methods
  async getExportData(projectIds?: string[], status?: string): Promise<any[]> {
    let query = insforge.database.from("respondents").select("*");

    if (projectIds && projectIds.length > 0) {
      query = query.in("project_code", projectIds);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data } = await query.order("started_at", { ascending: false });
    const respondents = (data || []).map(mapRespondent);

    // Get projects and suppliers to join names
    const projects = await this.getProjects();
    const suppliers = await this.getSuppliers();

    const projectMap = new Map(projects.map(p => [p.projectCode, p.projectName]));
    const supplierMap = new Map(suppliers.map(s => [s.code, s.name]));

    return respondents.map(r => ({
      id: r.id,
      projectId: r.projectCode,
      projectName: projectMap.get(r.projectCode) || "",
      supplierId: r.supplierCode,
      supplierName: supplierMap.get(r.supplierCode || "") || "",
      status: r.status,
      ipAddress: r.ipAddress,
      createdAt: r.startedAt
    }));
  }

  async getSupplierAssignmentsForExport(supplierId: string): Promise<any[]> {
    const { data } = await insforge.database.from("supplier_assignments")
      .select("*")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });

    const assignments = data || [];
    const projects = await this.getProjects();
    const projectMap = new Map(projects.map(p => [p.projectCode, p]));

    return assignments.map(a => {
      const p = projectMap.get(a.project_code);
      return {
        projectId: a.project_code,
        projectName: p?.projectName || "",
        clientId: p?.client || "",
        totalTarget: 0,
        completes: 0,
        status: a.status,
        cpa: 0,
        revenue: 0
      };
    });
  }

  // Supplier Portal Implementation
  async getSupplierUserByUsername(username: string): Promise<SupplierUser | undefined> {
    const { data } = await insforge.database.from("supplier_users").select("*").eq("username", username).maybeSingle();
    return data ? mapSupplierUser(data) : undefined;
  }

  async getSupplierUserById(id: string): Promise<SupplierUser | undefined> {
    const { data } = await insforge.database.from("supplier_users").select("*").eq("id", id).maybeSingle();
    return data ? mapSupplierUser(data) : undefined;
  }

  async getSupplierProjectAccess(userId: string): Promise<SupplierProjectAccess[]> {
    const { data } = await insforge.database.from("supplier_project_access").select("*").eq("user_id", userId);
    return (data || []).map(mapSupplierProjectAccess);
  }

  async getAssignedProjects(userId: string): Promise<Project[]> {
    // Join project access with projects table
    const access = await this.getSupplierProjectAccess(userId);
    if (access.length === 0) return [];
    
    const projectIds = access.map(a => a.projectId);
    const { data } = await insforge.database.from("projects").select("*").in("id", projectIds);
    return (data || []).map(mapProject);
  }

  async createSupplierUser(user: InsertSupplierUser): Promise<SupplierUser> {
    const dbUser = {
      username: user.username,
      password_hash: user.passwordHash,
      supplier_id: user.supplierId,
      supplier_code: user.supplierCode,
      is_active: user.isActive,
      created_by: user.createdBy
    };
    const { data } = await insforge.database.from("supplier_users").insert([dbUser]).select().single();
    if (!data) throw new Error("Failed to create supplier user");
    return mapSupplierUser(data);
  }

  async updateSupplierUser(id: string, user: Partial<InsertSupplierUser>): Promise<SupplierUser | undefined> {
    const dbUser: any = {};
    if (user.username) dbUser.username = user.username;
    if (user.passwordHash) dbUser.password_hash = user.passwordHash;
    if (user.supplierId) dbUser.supplier_id = user.supplierId;
    if (user.supplierCode) dbUser.supplier_code = user.supplierCode;
    if (user.isActive !== undefined) dbUser.is_active = user.isActive;
    if ((user as any).lastLogin) dbUser.last_login = (user as any).lastLogin;

    const { data } = await insforge.database.from("supplier_users").update(dbUser).eq("id", id).select().single();
    return data ? mapSupplierUser(data) : undefined;
  }

  async getSupplierDashboardStats(userId: string, supplierCode: string): Promise<DashboardStats> {
    const access = await this.getSupplierProjectAccess(userId);
    const projectCodes = access.map(a => a.projectCode);
    
    if (projectCodes.length === 0) {
      return {
        totalProjects: 0,
        totalRespondents: 0,
        completes: 0,
        terminates: 0,
        quotafulls: 0,
        securityTerminates: 0,
        activityData: [],
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const { count: totalProjects } = await insforge.database.from("supplier_project_access")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", userId);

    const { count: totalRespondents } = await insforge.database.from("respondents")
      .select("*", { count: 'exact', head: true })
      .eq("supplier_code", supplierCode)
      .in("project_code", projectCodes)
      .gte("started_at", todayStr);

    const { count: completes } = await insforge.database.from("respondents")
      .select("*", { count: 'exact', head: true })
      .eq("supplier_code", supplierCode)
      .in("project_code", projectCodes)
      .eq("status", "complete")
      .gte("started_at", todayStr);

    const { count: terminates } = await insforge.database.from("respondents")
      .select("*", { count: 'exact', head: true })
      .eq("supplier_code", supplierCode)
      .in("project_code", projectCodes)
      .eq("status", "terminate")
      .gte("started_at", todayStr);

    const { count: quotafulls } = await insforge.database.from("respondents")
      .select("*", { count: 'exact', head: true })
      .eq("supplier_code", supplierCode)
      .in("project_code", projectCodes)
      .eq("status", "quotafull")
      .gte("started_at", todayStr);

    const { count: securityTerminates } = await insforge.database.from("respondents")
      .select("*", { count: 'exact', head: true })
      .eq("supplier_code", supplierCode)
      .in("project_code", projectCodes)
      .eq("status", "security-terminate")
      .gte("started_at", todayStr);

    return {
      totalProjects: totalProjects || 0,
      totalRespondents: totalRespondents || 0,
      completes: completes || 0,
      terminates: terminates || 0,
      quotafulls: quotafulls || 0,
      securityTerminates: securityTerminates || 0,
      activityData: [],
    };
  }

  async getSupplierRespondents(supplierCode: string, projectCodes: string[]): Promise<Respondent[]> {
    if (projectCodes.length === 0) return [];
    
    const { data } = await insforge.database.from("respondents")
      .select("*")
      .eq("supplier_code", supplierCode)
      .in("project_code", projectCodes)
      .order("started_at", { ascending: false });
      
    return (data || []).map(mapRespondent);
  }

  async listSupplierUsers(): Promise<SupplierUser[]> {
    const { data } = await insforge.database.from("supplier_users").select("*").order("created_at", { ascending: false });
    return (data || []).map(mapSupplierUser);
  }

  async listSupplierProjectAccess(): Promise<SupplierProjectAccess[]> {
    const { data, error } = await insforge.database
      .from("supplier_project_access")
      .select(`
        *,
        supplier_users (username),
        projects (project_name)
      `)
      .order("assigned_at", { ascending: false });
    
    if (error) {
      console.error("Error listing supplier project access:", error);
      return [];
    }
    
    return (data || []).map(a => ({
      ...mapSupplierProjectAccess(a),
      username: a.supplier_users?.username,
      projectName: a.projects?.project_name
    }));
  }

  async assignProjectToSupplier(access: InsertSupplierProjectAccess): Promise<SupplierProjectAccess> {
    const dbAccess = {
      user_id: access.userId,
      project_id: access.projectId,
      project_code: access.projectCode,
      assigned_by: access.assignedBy
    };
    
    const { data, error } = await insforge.database.from("supplier_project_access").insert([dbAccess]).select().single();
    if (error) {
      console.error("DB insert error for supplier_project_access:", error);
      throw error;
    }
    if (!data) throw new Error("Failed to assign project to supplier");
    return mapSupplierProjectAccess(data);
  }

  async removeProjectFromSupplier(id: string): Promise<void> {
    await insforge.database.from("supplier_project_access").delete().eq("id", id);
  }

  async deleteSupplierUser(id: string): Promise<void> {
    await insforge.database.from("supplier_users").delete().eq("id", id);
  }

  async getSupplierStatsOverview(supplierCode: string): Promise<{
    completed: number;
    disqualified: number;
    quotafull: number;
    security: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const { count: completed } = await insforge.database.from("respondents")
      .select("*", { count: 'exact', head: true })
      .eq("supplier_code", supplierCode)
      .eq("status", "complete")
      .gte("started_at", todayStr);

    const { count: disqualified } = await insforge.database.from("respondents")
      .select("*", { count: 'exact', head: true })
      .eq("supplier_code", supplierCode)
      .eq("status", "terminate")
      .gte("started_at", todayStr);

    const { count: quotafull } = await insforge.database.from("respondents")
      .select("*", { count: 'exact', head: true })
      .eq("supplier_code", supplierCode)
      .eq("status", "quotafull")
      .gte("started_at", todayStr);

    const { count: security } = await insforge.database.from("respondents")
      .select("*", { count: 'exact', head: true })
      .eq("supplier_code", supplierCode)
      .eq("status", "security-terminate")
      .gte("started_at", todayStr);

    return {
      completed: completed || 0,
      disqualified: disqualified || 0,
      quotafull: quotafull || 0,
      security: security || 0
    };
  }
}

export const storage = new DatabaseStorage();

export async function seedAdmin(storage: IStorage) {
  const existing = await storage.getAdminByUsername("admin");
  if (!existing) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await storage.createAdmin({ username: "admin", passwordHash });
    console.log("Seeded admin user (username: admin, password: admin123)");
  }
}
