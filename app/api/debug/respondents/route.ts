import { NextRequest, NextResponse } from "next/server";
import { insforge } from "@server/insforge";

export async function GET(_req: NextRequest) {
  try {
    const { data: respondents, error } = await insforge.database
      .from("respondents")
      .select("oi_session, project_code, supplier_code, supplier_rid, client_rid, status, started_at")
      .order("started_at", { ascending: false })
      .limit(10);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: respondents?.length ?? 0, respondents });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
