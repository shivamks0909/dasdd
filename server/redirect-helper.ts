import { NextRequest, NextResponse } from "next/server";
import { routerService } from "./lib/router-service";
import { storage } from "./storage";

export async function redirectToSupplierOrLanding(respondent: any, status: string, req: NextRequest) {
  // Fetch required data for RouterService
  const [supplier, project] = await Promise.all([
    respondent.supplierCode ? storage.getSupplierByCode(respondent.supplierCode) : Promise.resolve(undefined),
    respondent.projectCode ? storage.getProjectByCode(respondent.projectCode) : Promise.resolve(undefined)
  ]);

  const redirectUrl = routerService.getStatusRedirectUrl(status, respondent, supplier, project);
  
  if (!redirectUrl) {
    return {
      response: new Response("Redirect URL not found", { status: 404 }),
      url: ""
    };
  }
  
  // Ensure we have a valid absolute URL for NextResponse.redirect
  let absoluteUrl = redirectUrl;
  if (!redirectUrl.startsWith('http')) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    absoluteUrl = new URL(redirectUrl, baseUrl).toString();
  }

  return { 
    response: NextResponse.redirect(new URL(absoluteUrl)), 
    url: absoluteUrl 
  };
}
