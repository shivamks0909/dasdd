import { NextRequest, NextResponse } from "next/server";
import { insforge } from "@server/insforge";

export async function GET(_req: NextRequest) {
  try {
    const { data: surveys, error } = await insforge.database
      .from("country_surveys")
      .select("*")
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: surveys?.length ?? 0, surveys });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectCode, countryCode, surveyUrl } = body;
    
    // Find project first
    const { data: project } = await insforge.database
      .from("projects")
      .select("id, project_code")
      .eq("project_code", projectCode)
      .maybeSingle();
    
    if (!project) {
      return NextResponse.json({ error: `Project not found: ${projectCode}` }, { status: 404 });
    }

    const { data, error } = await insforge.database
      .from("country_surveys")
      .insert([{
        project_id: project.id,
        project_code: projectCode,
        country_code: countryCode,
        survey_url: surveyUrl,
        status: "active",
      }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, survey: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
