import { NextRequest, NextResponse } from "next/server";
import { db } from "@server/db";
import { respondents, projects } from "@shared/schema";
import type { Project } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { routerService } from "@server/lib/router-service";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const uid = searchParams.get('uid');
  const type = searchParams.get('type');

  if (!code || !uid || !type) {
    return new NextResponse("Missing required parameters", { status: 400 });
  }

  try {
    // Look up project to get base URL
    const projectArray = await db.select().from(projects).where(eq(projects.projectCode, code));
    const project = projectArray[0] as unknown as Project;

    const baseUrl = routerService.getBaseUrl(project);

    // Update respondent if found
    const respondentArray = await db.select()
      .from(respondents)
      .where(
        and(
          eq(respondents.projectCode, code),
          eq(respondents.supplierRid, uid)
        )
      );

    const respondent = respondentArray[0];

    if (respondent) {
      // Map 'type' parameter to valid DB status
      const validStatuses = ['complete', 'terminate', 'quotafull', 'security-terminate'];
      let dbStatus = type.toLowerCase();
      
      // Handle legacy/alternate string types
      if (dbStatus === 'quota') dbStatus = 'quotafull';
      if (dbStatus === 'security_terminate' || dbStatus === 'duplicate_ip' || dbStatus === 'duplicate_string') {
        dbStatus = 'security-terminate';
      }

      const isValidStatus = validStatuses.includes(dbStatus);

      // Update the respondent's status
      await db.update(respondents)
        .set({ 
          status: isValidStatus ? dbStatus : type, 
          completedAt: dbStatus === 'complete' ? new Date() : null 
        })
        .where(eq(respondents.id, respondent.id));
    }

    // Map internal routing path based on type
    const pathMap: Record<string, string> = {
      'complete': 'complete',
      'terminate': 'terminate',
      'quota': 'quotafull',
      'quotafull': 'quotafull',
      'security_terminate': 'security',
      'security-terminate': 'security',
      'duplicate_ip': 'security',
      'duplicate_string': 'security',
    };
    
    const statusPath = pathMap[type.toLowerCase()] || type;
    
    // Redirect to the appropriate pages route
    return NextResponse.redirect(`${baseUrl}/pages/${statusPath}?pid=${code}&uid=${uid}`);

  } catch (error) {
    console.error("Status Route Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
