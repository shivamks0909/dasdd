import { test, expect, type Page } from "@playwright/test";
import { nanoid } from "nanoid";

test.describe("Supplier Flow End-to-End", () => {

  async function loginAsAdmin(page: Page) {
    await page.goto("/login");
    await page.getByPlaceholder('Username / ID').fill('admin');
    await page.getByPlaceholder('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL("/admin/dashboard", { timeout: 15000 });
  }

  test("Comprehensive Supplier Portal E2E Flow", async ({ page }) => {
    test.setTimeout(300000); // 5 minutes for full self-contained flow
    const supplierUsername = `sup_${nanoid(8)}`;
    const supplierPassword = `Pass_${nanoid(8)}!`;
    const projectName = `DOM E2E Flow Project ${Date.now()}`;
    let projectCode = "";
    const supplierCode = "AUTO01"; // Consistent with the source selected in Phase 2
    
    // 1. Create a Project first
    await loginAsAdmin(page);
    await page.goto("/admin/projects/quick-create");
    await expect(page.getByPlaceholder('https://survey.com/start?id=123&uid={uid}')).toBeVisible({ timeout: 15000 });
    
    await page.getByPlaceholder('https://survey.com/start?id=123&uid={uid}').fill(`https://example.com?uid={uid}&pid=${Date.now()}`);
    await page.getByPlaceholder('e.g. Consumer Study Q1').fill(projectName);
    
    await page.locator('button:has-text("Create Project & Generate Links")').click({ force: true });
    await expect(page.locator("text=Project Generated")).toBeVisible({ timeout: 20000 });

    // Extract the generated project code from the tracking URL textbox
    const trackingUrl = await page.getByRole('textbox').first().inputValue();
    const urlObj = new URL(trackingUrl);
    projectCode = urlObj.searchParams.get('code') || "";
    console.log(`Extracted Project Code: ${projectCode}`);

    // 2. Create Supplier Portal Access
    await page.goto("/admin/suppliers", { waitUntil: 'networkidle', timeout: 60000 });
    await expect(page.getByText('Compiling...')).not.toBeVisible({ timeout: 45000 });
    await page.waitForTimeout(2000); // Wait for hydration
    
    await page.getByRole('tab', { name: /Portal Access/i }).click();
    
    // Select an existing source (e.g. AUTO)
    await page.locator('button[role="combobox"]:has-text("Select Source")').click({ force: true });
    await page.getByRole('option', { name: /AUTO/ }).first().click();
    
    await page.getByPlaceholder('dynata_admin').fill(supplierUsername);
    await page.getByPlaceholder('••••••••').fill(supplierPassword);
    
    await Promise.all([
        page.waitForResponse(res => res.url().includes('/api/admin/suppliers/users') && res.status() === 201, { timeout: 30000 }),
        page.getByRole('button', { name: /Grant Access/i }).click({ force: true })
    ]);
    await expect(page.locator(`text=${supplierUsername}`)).toBeVisible({ timeout: 15000 });

    // 3. Assign Project
    await page.getByRole('tab', { name: /Project Matrix/i }).click();
    await page.getByRole('combobox', { name: 'Portal Account' }).click({ force: true });
    await page.getByRole('option', { name: supplierUsername }).click();
    
    await page.getByRole('combobox', { name: 'Target Project' }).click({ force: true });
    // Use a more robust locator for the target project
    await page.getByRole('option').filter({ hasText: projectName }).first().click();
    
    await Promise.all([
        page.waitForResponse(res => res.url().includes('/api/admin/suppliers/access') && res.status() < 400),
        page.locator('button:has-text("Authorize Assignment")').click({ force: true })
    ]);
    await expect(page.locator("text=Project visibility granted")).toBeVisible({ timeout: 10000 });

    // 4. Supplier Logs In
    await page.goto("/supplier/login");
    await page.locator('#loginId').fill(supplierUsername);
    await page.locator('#password').fill(supplierPassword);
    await page.getByRole('button', { name: /LOG IN/i }).click();
    
    await expect(page).toHaveURL("/supplier/dashboard", { timeout: 20000 });
    // Wait for the dashboard to hydrate and load data
    await page.waitForLoadState('networkidle');
    await expect(page.locator("text=Active Session Sync (Live)")).toBeVisible({ timeout: 20000 });

    // 5. Tracking Redirect Verification
    const testUid = `uid_${nanoid(10)}`;
    await page.goto(`/track?code=${projectCode}&country=US&sup=${supplierCode}&uid=${testUid}`);
    // Relaxed regex to match any reach of the test destination
    await expect(page).toHaveURL(/.*(landing\?oi_session=|example\.com).*/, { timeout: 20000 });
    
    const url = page.url();
    if (url.includes('landing')) {
        await expect(page.locator("text=Preparing Routing")).toBeVisible();
    } else {
        expect(url).toContain('example.com/survey');
    }
  });
});
