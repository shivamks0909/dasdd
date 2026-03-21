import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@insforge/sdk";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

function getInsforge() {
  return createClient({
    baseUrl: process.env.INSFORGE_BASE_URL!,
    anonKey: process.env.INSFORGE_API_KEY!,
  });
}

export async function GET(req: NextRequest) {
  try {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    // Try Authorization header first, then cookie
    let token: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else {
      token = req.cookies.get("admin_token")?.value ?? null;
    }

    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    let payload: { id: string; username: string; role: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: string };
    } catch {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const db = getInsforge().database;
    const { data: rows } = await db
      .from("admins")
      .select("id, username")
      .eq("id", payload.id)
      .limit(1);

    const admin = rows?.[0];
    if (!admin) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({ id: admin.id, username: admin.username });
  } catch (error) {
    console.error("/api/auth/me error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
