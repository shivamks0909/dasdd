import { NextRequest, NextResponse } from "next/server";
import { storage } from "@server/storage";
import { authMiddleware } from "@server/auth-helper";

export const GET = authMiddleware(async (req: NextRequest) => {
  try {
    const enriched = await storage.getEnrichedRespondents(50);
    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error("Error fetching enriched respondents:", error);
    return NextResponse.json(
      { error: "Failed to fetch responses", message: error.message },
      { status: 500 }
    );
  }
});
