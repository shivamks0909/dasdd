import { NextRequest, NextResponse } from "next/server";
import { processCallback } from "@server/lib/callback-core";

export async function GET(req: NextRequest) {
  const result = await processCallback({
    oi_session: req.nextUrl.searchParams.get('oi_session'),
    clickid: req.nextUrl.searchParams.get('clickid'),
    pid: req.nextUrl.searchParams.get('pid'),
    uid: req.nextUrl.searchParams.get('uid'),
    status: "complete",
    baseUrl: req.url
  });
  return NextResponse.redirect(result.redirectUrl);
}


