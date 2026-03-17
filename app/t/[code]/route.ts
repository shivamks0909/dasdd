import { NextRequest, NextResponse } from "next/server";
import { processTrackingRequest } from "@server/lib/tracking-core";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  console.log(`[NextRoute] GET /t/[code] triggered for code=${(await params).code}`);
  const { code } = await params;
  const searchParams = req.nextUrl.searchParams;
  
  const result = await processTrackingRequest({
    projectCode: code,
    countryCode: searchParams.get('country') || '',
    supplierCode: searchParams.get('sup') || undefined,
    supplierRid: searchParams.get('uid') || undefined,
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
