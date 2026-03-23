import { NextRequest, NextResponse } from "next/server";
import { processTrackingRequest } from "@server/lib/tracking-core";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  console.log(`[NextRoute] GET /r/[...slug] triggered for slug=${slug.join('/')}`);
  
  const searchParams = req.nextUrl.searchParams;
  const projectCode = slug[0];
  let countryCode = searchParams.get('country') || '';
  let supplierCodeFromPath = searchParams.get('sup') || undefined;
  let supplierRidFromPath = searchParams.get('uid') || undefined;

  // Handle path-based parameters: /r/[project]/[country]/[uid] or /r/[project]/[uid]
  if (slug.length === 2) {
    // /r/[project]/[uid]
    supplierRidFromPath = slug[1];
  } else if (slug.length === 3) {
    // /r/[project]/[country]/[uid]
    countryCode = slug[1];
    supplierRidFromPath = slug[2];
  } else if (slug.length >= 4) {
    // /r/[project]/[country]/[supplier]/[uid]
    countryCode = slug[1];
    supplierCodeFromPath = slug[2];
    supplierRidFromPath = slug[slug.length - 1];
  }
  
  const result = await processTrackingRequest({
    projectCode: projectCode,
    countryCode: countryCode,
    supplierCode: supplierCodeFromPath,
    supplierRid: supplierRidFromPath,
    extraParams: Object.fromEntries(searchParams.entries()),
    ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
    userAgent: req.headers.get("user-agent") || "unknown"
  });

  if (result.error) {
    if (result.error.status === 302 && result.error.internalRedirect) {
      return NextResponse.redirect(new URL(result.error.internalRedirect, req.url));
    }
    return new NextResponse(result.error.message, { status: result.error.status });
  }

  if (result.redirectUrl) {
    return NextResponse.redirect(new URL(result.redirectUrl));
  }

  return new NextResponse("Unknown error", { status: 500 });
}
