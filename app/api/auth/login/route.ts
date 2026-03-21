import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@insforge/sdk";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("JWT_SECRET is missing in process.env");
}

function getInsforge() {
  return createClient({
    baseUrl: process.env.INSFORGE_BASE_URL!,
    anonKey: process.env.INSFORGE_API_KEY!,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: "Username and password are required" },
        { status: 400 }
      );
    }

    const db = getInsforge().database;
    const { data: rows, error } = await db
      .from("admins")
      .select("*")
      .eq("username", username)
      .limit(1);

    if (error) {
      console.error("DB error:", error);
      return NextResponse.json({ message: "Database error" }, { status: 500 });
    }

    const admin = rows?.[0];
    if (!admin) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: "admin" },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    const response = NextResponse.json({
      id: admin.id,
      username: admin.username,
      token,
    });

    // Also set cookie for convenience
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      maxAge: 86400,
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
