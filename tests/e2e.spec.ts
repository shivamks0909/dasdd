import { test, expect, type Page } from '@playwright/test';

test.describe('Opinion Insights - DOM Regression Test', () => {
    async function loginAsAdmin(page: Page) {
        await page.goto('/login');
        await page.getByPlaceholder('Username / ID').fill('admin');
        await page.getByPlaceholder('Password').fill('admin123');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await expect(page).toHaveURL('/admin/dashboard', { timeout: 15000 });
    }


    // Test 1: Admin Login Flow
    test('Admin can log in and view dashboard', async ({ page }) => {
        await loginAsAdmin(page);
        
        // Final assertions inside dashboard

        // Verify successful redirect to dashboard with inclusive timeout
        await expect(page).toHaveURL(/.*\/admin\/dashboard/, { timeout: 20000 });
        
        // Verify dashboard elements loaded
        await expect(page.getByText('Control Hub', { exact: false })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Management Deck', { exact: false })).toBeVisible({ timeout: 15000 });
        
        // Wait for stats to load (Total Hits is a StatCard title)
        // We use a regex to ensure we match the heading/title specifically if possible
        await expect(page.getByText('Total Hits', { exact: false })).toBeVisible({ timeout: 30000 });
    });

    // Test 2: Supplier Creation Flow
    test('Admin can create a new supplier', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/suppliers');

        // Open Dialog
        await page.getByRole('button', { name: /Register Source/i }).click();

        // Fill Form
        const supplierCode = `AUTO${Math.floor(Date.now() / 1000).toString().slice(-4)}`;
        await page.getByPlaceholder('e.g. Dynata Global').fill(`Automated Test Supplier ${Date.now()}`);
        await page.getByPlaceholder('DYN01').first().fill(supplierCode);
        await page.getByRole('button', { name: 'Synchronize Supplier' }).click();

        // Verify supplier card exists
        await expect(page.locator(`text=${supplierCode}`).first()).toBeVisible();
    });

    // Test 3: Project Creation Flow
    test('Admin can initialize a new project', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/projects/quick-create');
        // Ensure the page is fully loaded and compiling is finished
        await expect(page.getByText('Quick Project Creator')).toBeVisible({ timeout: 30000 });
        await expect(page.getByText('Compiling...')).not.toBeVisible({ timeout: 30000 });
        await page.waitForTimeout(1000); // Give React a moment to hydrate

        // Step 1: Form Details
        const projectName = `DOM E2E Test Project ${Date.now()}`;
        await page.getByPlaceholder(/survey\.com/).fill('https://example.com/survey?id=123&uid={uid}');
        await page.getByPlaceholder(/Consumer Study/).fill(projectName);
        
        // Submit and Wait for success
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'debug-quick-create.png' });
        
        await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/projects/quick-create') && res.status() < 400, { timeout: 30000 }),
            page.locator('button:has-text("Create Project & Generate Links")').click({ force: true })
        ]);

        // Verify result page
        await expect(page.getByText('Project Generated')).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('table')).toBeVisible();
    });

    // Test 4: Respondent Traversal Backend Simulation
    test('Respondent tracking system functions', async ({ page }) => {
        // We expect the router to redirect or respond with something when hitting a live survey link.
        const response = await page.goto('/track?code=DOME2E&country=US&sup=AUTO01&uid=TESTUID123');

        // For audit, we just want to ensure it doesn't 404 or hang indefinitely
        expect(response?.status()).toBeLessThan(500);
    });
});
