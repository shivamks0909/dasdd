import { NextRequest, NextResponse } from "next/server";
import { processTrackingRequest } from "@server/lib/tracking-core";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  console.log(`[NextRoute] GET /t/[...slug] triggered for slug=${slug.join('/')}`);
  
  const projectCode = slug[0];
  const supplierCodeFromPath = slug[1];
  const supplierRidFromPath = slug[2];
  
  const searchParams = req.nextUrl.searchParams;
  
  const result = await processTrackingRequest({
    projectCode: projectCode,
    countryCode: searchParams.get('country') || '',
    supplierCode: supplierCodeFromPath || searchParams.get('sup') || undefined,
    supplierRid: supplierRidFromPath || searchParams.get('uid') || undefined,
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
