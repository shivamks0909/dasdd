import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@insforge/sdk";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.JWT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function getInsforge() {
  return createClient({
    baseUrl: process.env.INSFORGE_BASE_URL!,
    anonKey: process.env.INSFORGE_API_KEY!,
  });
}

async function verifyAdmin(req: NextRequest) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET missing");
  const token = req.cookies.get("admin_token")?.value || req.headers.get("authorization")?.split(" ")[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; username: string };
  } catch {
    return null;
  }
}

function generateProjectCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "PRJ-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { survey_url, project_name, country = "US" } = await req.json();

    if (!survey_url) {
      return NextResponse.json({ message: "Survey URL is required" }, { status: 400 });
    }

    const db = getInsforge().database;
    const projectCode = generateProjectCode();
    const projectId = uuidv4();

    // 1. Create Project
    const { data: projectData, error: projectError } = await db.from("projects").insert([{
      id: projectId,
      project_code: projectCode,
      project_name: project_name || `Quick Project ${projectCode}`,
      status: "active",
      rid_prefix: "RID",
      rid_country_code: country,
      rid_padding: 5,
      rid_counter: 1,
      complete_url: `${APP_URL}/complete?oi_session={oi_session}`,
      terminate_url: `${APP_URL}/terminate?oi_session={oi_session}`,
      quotafull_url: `${APP_URL}/quotafull?oi_session={oi_session}`,
      security_url: `${APP_URL}/security-terminate?oi_session={oi_session}`,
      created_at: new Date().toISOString()
    }]).select();

    if (projectError) throw projectError;
    const project = projectData[0];

    // 2. Create Country Survey Mapping
    const { data: surveyData, error: surveyError } = await db.from("country_surveys").insert([{
      id: uuidv4(),
      project_id: projectId,
      project_code: projectCode,
      country_code: country,
      survey_url: survey_url,
      status: "active",
      created_at: new Date().toISOString()
    }]).select();

    if (surveyError) throw surveyError;
    const countrySurvey = surveyData[0];

    // 3. Get all active suppliers to generate links
    const { data: suppliers } = await db.from("suppliers").select("*");
    
    const supplierLinks = (suppliers || []).map(sup => ({
      supplierName: sup.name,
      supplierCode: sup.code,
      link: `${APP_URL}/track?code=${projectCode}&country=${country}&sup=${sup.code}&uid={uid}`
    }));

    return NextResponse.json({
      project,
      countrySurvey,
      router_link: `${APP_URL}/track?code=${projectCode}&country=${country}`,
      supplier_links: supplierLinks
    }, { status: 201 });

  } catch (error: any) {
    console.error("Quick Create Error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
