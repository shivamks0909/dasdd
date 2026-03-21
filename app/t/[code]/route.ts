import { NextRequest, NextResponse } from "next/server";
import { processTrackingRequest } from "@server/lib/tracking-core";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  console.log(`[NextRoute] GET /t/[code] triggered for code=${(await params).code}`);
  const { code } = await params;
  const searchParams = req.nextUrl.searchParams;
  
  const rawParams = Object.fromEntries(searchParams.entries());
  const supplierRid = (rawParams.uid || rawParams.rid || rawParams.toid || rawParams.zid || `DIR-${Math.random().toString(36).substring(7)}`);

  console.log(`[NextRoute] Processing tracking for supplierRid=${supplierRid}`);

  const result = await processTrackingRequest({
    projectCode: code,
    countryCode: rawParams.country || '',
    supplierCode: rawParams.sup || undefined,
    supplierRid,
    extraParams: rawParams,
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
