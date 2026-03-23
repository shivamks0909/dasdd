import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/api/quotafull";
  
  console.log(`[Intercept] Redirecting legacy ${req.nextUrl.pathname} to ${url.pathname} with query: ${url.search}`);
  return NextResponse.redirect(url, 307);
}
