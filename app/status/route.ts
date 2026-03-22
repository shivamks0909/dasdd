import { NextRequest, NextResponse } from "next/server";
import { db, pool } from "@server/db";
import { respondents, projects } from "@shared/schema";
import type { Project } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { routerService } from "@server/lib/router-service";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const uid = searchParams.get('uid');
  const type = searchParams.get('type');

  console.log(`[StatusRoute] Request: code=${code}, uid=${uid}, type=${type}`);

  if (!code || !uid || !type) {
    return new NextResponse("Missing required parameters", { status: 400 });
  }

  // Determine base URL: fallback to current request origin
  const baseUrl = req.nextUrl.origin;
  
  // Mapping of status types to system paths
  const pathMap: Record<string, string> = {
    'complete': 'complete',
    'terminate': 'terminate',
    'quota': 'quotafull',
    'quotafull': 'quotafull',
    'security': 'security',
    'security_terminate': 'security-terminate',
    'security-terminate': 'security-terminate',
    'duplicate': 'duplicate',
    'duplicate_ip': 'duplicate-ip',
    'duplicate-ip': 'duplicate-ip',
    'duplicate_string': 'duplicate-string',
    'duplicate-string': 'duplicate-string',
  };
  const statusPath = pathMap[type.toLowerCase()] || type.toLowerCase().replace('_', '-');

  // Skip DB for temporary placeholder tests ONLY (not PRJXXXX anymore)
  const isPlaceholder = code.startsWith("TEST_PLACEHOLDER_SKIP_DB");

  try {
    // 1. Try to fetch project and update respondent (DATABASE DEPENDENT)
    if (!isPlaceholder) {
        console.log("[StatusRoute] Attempting database operations...");
        // We use a separate try-catch for DB to allow fallback if it fails
        try {
        const rawResult = await pool.query("SELECT * FROM projects WHERE project_code = $1 LIMIT 1", [code]);
        const project = rawResult.rows[0] as unknown as Project;

        if (project) {
            // Update respondent if found
            const respondentArray = await pool.query(
                "SELECT * FROM respondents WHERE project_code = $1 AND supplier_rid = $2 LIMIT 1",
                [code, uid]
            );
            const respondent = respondentArray.rows[0];

            if (respondent) {
              const validStatuses = ['complete', 'terminate', 'quotafull', 'security-terminate'];
              let dbStatus = type.toLowerCase();
              if (dbStatus === 'quota') dbStatus = 'quotafull';
              if (dbStatus === 'security_terminate' || dbStatus === 'duplicate_ip' || dbStatus === 'duplicate_string') {
                dbStatus = 'security-terminate';
              }
              const isValidStatus = validStatuses.includes(dbStatus);

              await pool.query(
                "UPDATE respondents SET status = $1, completed_at = $2 WHERE id = $3",
                [isValidStatus ? dbStatus : type, dbStatus === 'complete' ? new Date() : null, respondent.id]
              );
            }

            // Check for custom redirect URL if columns exist
            // (Note: Using dynamic access to avoid crash if columns are missing)
            const propertyMap: Record<string, string> = {
              'complete': 'complete_url',
              'terminate': 'terminate_url',
              'quota': 'quotafull_url',
              'quotafull': 'quotafull_url',
              'security_terminate': 'security_url',
              'security-terminate': 'security_url',
            };
            
            const customUrlColumn = propertyMap[type.toLowerCase()];
            if (customUrlColumn && project[customUrlColumn as keyof typeof project]) {
              let redirectUrl = project[customUrlColumn as keyof typeof project] as string;
              redirectUrl = redirectUrl.replace('[UID]', uid);
              console.log("[StatusRoute] Using custom redirect:", redirectUrl);
              return NextResponse.redirect(redirectUrl);
            }
        }
    } catch (dbError: any) {
        console.error("[StatusRoute] Database operation failed, falling back to system page:", dbError.message);
        // Do NOT throw, just fall through to the system redirect below
    }
}

    // 2. Fallback to generic system landing page (ROBUST)
    const finalUrl = new URL(`${baseUrl}/pages/${statusPath}`);
    finalUrl.searchParams.set('pid', code);
    finalUrl.searchParams.set('uid', uid);
    
    console.log("[StatusRoute] Redirecting to system page:", finalUrl.toString());
    return NextResponse.redirect(finalUrl.toString());

  } catch (error: any) {
    console.error("[StatusRoute] Critical error:", error);
    // Even in a critical error, try one last time to redirect to home
    return NextResponse.redirect(new URL("/", req.nextUrl.origin).toString());
  }
}
