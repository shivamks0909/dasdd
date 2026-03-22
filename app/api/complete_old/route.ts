import { NextRequest, NextResponse } from "next/server";
import { handleCallback } from "@server/callback-handler";

export async function GET(req: NextRequest) {
  return handleCallback(req, "complete");
}
