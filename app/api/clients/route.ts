import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@insforge/sdk";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.JWT_SECRET;

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

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const db = getInsforge().database;
    const { data: clients, error } = await db.from("clients").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json(clients || []);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, email, company, website } = body;

    if (!name || !email || !company) {
      return NextResponse.json({ message: "Missing required fields: name, email, and company are mandatory." }, { status: 400 });
    }

    const db = getInsforge().database;
    const { data: newClient, error } = await db.from("clients").insert([{
      name,
      email,
      company,
      website: website || null
    }]).select();

    if (error) {
      console.error("Client Creation Error:", error);
      return NextResponse.json({ message: error.message || "Failed to create client in Nexus." }, { status: 500 });
    }
    
    if (!newClient || newClient.length === 0) {
      return NextResponse.json({ message: "Client creation failed: no data returned." }, { status: 500 });
    }

    return NextResponse.json(newClient[0], { status: 201 });
  } catch (error: any) {
    console.error("Client API Error:", error);
    return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
  }
}
