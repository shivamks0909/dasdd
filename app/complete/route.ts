import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Catch traffic to /complete?uid=123 (a frequent client misconfiguration)
  // Forward it to our backend tracking API while preserving all search params
  const url = req.nextUrl.clone();
  url.pathname = "/api/complete";
  
  console.log(`[Intercept] Redirecting legacy ${req.nextUrl.pathname} to ${url.pathname} with query: ${url.search}`);
  
  // Use a 307 Temporary Redirect to ensure the method and body are preserved if ever needed,
  // but GET is standard for these tracking pixels/redirects
  return NextResponse.redirect(url, 307);
}
