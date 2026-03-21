import { z } from "zod";
import { pgTable, text, timestamp, boolean, numeric, integer, jsonb, uuid } from "drizzle-orm/pg-core";

export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectCode: text("project_code").notNull().unique(),
  projectName: text("project_name").notNull(),
  client: text("client"),
  status: text("status").default("active"),
  ridPrefix: text("rid_prefix"),
  ridCountryCode: text("rid_country_code"),
  ridPadding: integer("rid_padding").default(4),
  ridCounter: integer("rid_counter").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  completeUrl: text("complete_url"),
  terminateUrl: text("terminate_url"),
  quotafullUrl: text("quotafull_url"),
  securityUrl: text("security_url"),
  customDomain: text("custom_domain"),
});

export const countrySurveys = pgTable("country_surveys", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  projectCode: text("project_code").notNull(),
  countryCode: text("country_code").notNull(),
  surveyUrl: text("survey_url").notNull(),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  passwordHash: text("password_hash"), // Added for direct supplier login
  completeUrl: text("complete_url"),
  terminateUrl: text("terminate_url"),
  quotafullUrl: text("quotafull_url"),
  securityUrl: text("security_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const respondents = pgTable("respondents", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectCode: text("project_code").notNull(),
  countryCode: text("country_code"),
  supplierCode: text("supplier_code"),
  supplierRid: text("supplier_rid"),
  clientRid: text("client_rid"),
  oiSession: text("oi_session").notNull().unique(),
  status: text("status").default("started"),
  s2sVerified: boolean("s2s_verified").default(false),
  fraudScore: numeric("fraud_score", { precision: 5, scale: 2 }).default("0.00"),
  s2sToken: text("s2s_token"),
  s2sReceivedAt: timestamp("s2s_received_at"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  surveyUrl: text("survey_url"),
  redirectUrl: text("redirect_url"),
  verifyHash: text("verify_hash"),
  extraParams: jsonb("extra_params").$type<Record<string, string>>(),
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectCode: text("project_code"),
  oiSession: text("oi_session"),
  eventType: text("event_type"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supplierAssignments = pgTable("supplier_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectCode: text("project_code").notNull(),
  countryCode: text("country_code").notNull(),
  supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: 'cascade' }),
  generatedLink: text("generated_link").notNull(),
  status: text("status").default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const s2sLogs = pgTable("s2s_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  oiSession: text("oi_session"),
  projectCode: text("project_code"),
  supplierCode: text("supplier_code"),
  status: text("status").default("complete"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectS2sConfig = pgTable("project_s2s_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectCode: text("project_code").notNull().unique(),
  s2sSecret: text("s2s_secret").notNull(),
  requireS2S: boolean("require_s2s").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supplierUsers = pgTable("supplier_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: 'cascade' }),
  supplierCode: text("supplier_code").notNull(),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: text("created_by"),
});

export const supplierProjectAccess = pgTable("supplier_project_access", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => supplierUsers.id, { onDelete: 'cascade' }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: 'cascade' }),
  projectCode: text("project_code").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: text("assigned_by"),
});

// Admin
export const adminSchema = z.object({
  id: z.string(),
  username: z.string(),
  passwordHash: z.string(),
  createdAt: z.date().optional(),
});

export const insertAdminSchema = adminSchema.omit({
  id: true,
  createdAt: true,
});

export type Admin = z.infer<typeof adminSchema>;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

// Clients
export const clientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  company: z.string(),
  website: z.string().nullable().optional(),
  createdAt: z.date().optional(),
});

export const insertClientSchema = clientSchema.omit({
  id: true,
  createdAt: true,
});

export type Client = z.infer<typeof clientSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;

// Projects
export const projectSchema = z.object({
  id: z.string(),
  projectCode: z.string(),
  projectName: z.string(),
  client: z.string().nullable().optional(),
  status: z.string().default("active"),
  ridPrefix: z.string().nullable().optional(),
  ridCountryCode: z.string().nullable().optional(),
  ridPadding: z.number().default(4),
  ridCounter: z.number().default(1),
  createdAt: z.date().optional(),
  completeUrl: z.string().nullable().optional(),
  terminateUrl: z.string().nullable().optional(),
  quotafullUrl: z.string().nullable().optional(),
  securityUrl: z.string().nullable().optional(),
  customDomain: z.string().nullable().optional(),
});

export const insertProjectSchema = projectSchema.omit({
  id: true,
  createdAt: true,
});

export type Project = z.infer<typeof projectSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;

// Country Surveys
export const countrySurveySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectCode: z.string(),
  countryCode: z.string(),
  surveyUrl: z.string(),
  status: z.string().default('active'),
  createdAt: z.date().optional(),
});

export const insertCountrySurveySchema = countrySurveySchema.omit({
  id: true,
  createdAt: true,
});

export type CountrySurvey = z.infer<typeof countrySurveySchema>;
export type InsertCountrySurvey = z.infer<typeof insertCountrySurveySchema>;

// Suppliers
export const supplierSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  passwordHash: z.string().nullable().optional(),
  completeUrl: z.string().nullable().optional(),
  terminateUrl: z.string().nullable().optional(),
  quotafullUrl: z.string().nullable().optional(),
  securityUrl: z.string().nullable().optional(),
  createdAt: z.date().optional(),
});

export const insertSupplierSchema = supplierSchema.omit({
  id: true,
  createdAt: true,
});

export const updateSupplierSchema = supplierSchema.partial().omit({
  createdAt: true,
});

export type Supplier = z.infer<typeof supplierSchema>;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type UpdateSupplier = z.infer<typeof updateSupplierSchema>;

// Respondents
export const respondentSchema = z.object({
  id: z.string(),
  projectCode: z.string(),
  countryCode: z.string().nullable().optional(),
  supplierCode: z.string().nullable().optional(),
  supplierRid: z.string(),
  clientRid: z.string().nullable().optional(),
  oiSession: z.string(),
  status: z.string().default('started'),
  s2sVerified: z.boolean().default(false),
  fraudScore: z.number().default(0.00),
  s2sToken: z.string().nullable().optional(),
  s2sReceivedAt: z.date().nullable().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  surveyUrl: z.string().nullable().optional(),
  redirectUrl: z.string().nullable().optional(),
  verifyHash: z.string().nullable().optional(),
  extraParams: z.record(z.string()).nullable().optional(),
});

export const insertRespondentSchema = respondentSchema.omit({
  id: true,
  startedAt: true,
});

export type Respondent = z.infer<typeof respondentSchema>;
export type InsertRespondent = z.infer<typeof insertRespondentSchema>;

// Activity Logs
export const activityLogSchema = z.object({
  id: z.string(),
  projectCode: z.string().nullable().optional(),
  oiSession: z.string().nullable().optional(),
  eventType: z.string().nullable().optional(),
  meta: z.any().nullable().optional(),
  createdAt: z.date().optional(),
});

export const insertActivityLogSchema = activityLogSchema.omit({
  id: true,
  createdAt: true,
});

export type ActivityLog = z.infer<typeof activityLogSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Supplier Assignments
export const supplierAssignmentSchema = z.object({
  id: z.string(),
  projectCode: z.string(),
  countryCode: z.string(),
  supplierId: z.string().nullable().optional(),
  generatedLink: z.string(),
  status: z.string().default("active"),
  notes: z.string().nullable().optional(),
  createdAt: z.date().optional(),
});

export const insertSupplierAssignmentSchema = supplierAssignmentSchema.omit({
  id: true,
  createdAt: true,
});

export type SupplierAssignment = z.infer<typeof supplierAssignmentSchema>;
export type InsertSupplierAssignment = z.infer<typeof insertSupplierAssignmentSchema>;

// S2S Logs
export const s2sLogSchema = z.object({
  id: z.string(),
  oiSession: z.string(),
  projectCode: z.string(),
  supplierCode: z.string().nullable().optional(),
  status: z.string().default('complete'),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  payload: z.any().nullable().optional(),
  createdAt: z.date().optional(),
});

export const insertS2sLogSchema = s2sLogSchema.omit({
  id: true,
  createdAt: true,
});

export type S2sLog = z.infer<typeof s2sLogSchema>;
export type InsertS2sLog = z.infer<typeof insertS2sLogSchema>;

// Project S2S Config
export const projectS2sConfigSchema = z.object({
  id: z.string(),
  projectCode: z.string(),
  s2sSecret: z.string(),
  requireS2S: z.boolean().default(true),
  createdAt: z.date().optional(),
});

export const insertProjectS2sConfigSchema = projectS2sConfigSchema.omit({
  id: true,
  createdAt: true,
});

export type ProjectS2sConfig = z.infer<typeof projectS2sConfigSchema>;
export type InsertProjectS2sConfig = z.infer<typeof insertProjectS2sConfigSchema>;

// Supplier Users
export const supplierUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  passwordHash: z.string(),
  supplierId: z.string(),
  supplierCode: z.string(),
  isActive: z.boolean().default(true),
  lastLogin: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  createdBy: z.string().nullable().optional(),
});

export const insertSupplierUserSchema = supplierUserSchema.omit({
  id: true,
  createdAt: true,
});

export type SupplierUser = z.infer<typeof supplierUserSchema>;
export type InsertSupplierUser = z.infer<typeof insertSupplierUserSchema>;

// Supplier Project Access
export const supplierProjectAccessSchema = z.object({
  id: z.string(),
  userId: z.string(),
  projectId: z.string(),
  projectCode: z.string(),
  assignedAt: z.date().optional(),
  assignedBy: z.string().nullable().optional(),
});

export const insertSupplierProjectAccessSchema = supplierProjectAccessSchema.omit({
  id: true,
  assignedAt: true,
});

export type SupplierProjectAccess = z.infer<typeof supplierProjectAccessSchema>;
export type InsertSupplierProjectAccess = z.infer<typeof insertSupplierProjectAccessSchema>;

// Dashboard stats type
export type DashboardStats = {
  totalProjects: number;
  activeProjects: number;
  totalRespondents: number;
  completes: number;
  terminates: number;
  quotafulls: number;
  securityTerminates: number;
  
  // Today's stats
  clicksToday: number;
  completesToday: number;
  quotafullToday: number;
  terminatesToday: number;
  inProgressToday: number;
  duplicatesToday: number;
  securityToday: number;
  conversionRateToday: string;
  
  activityData: { date: string; count: number }[];
};
