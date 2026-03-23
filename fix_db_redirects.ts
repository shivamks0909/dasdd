import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixRedirectUrls() {
  console.log("--- Fixing Broken Redirect URLs (Standalone Pool) ---");
  
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT id, project_code, redirect_complete, redirect_terminate, redirect_quotafull, redirect_security 
      FROM projects 
      WHERE redirect_complete LIKE '%/status?%' 
         OR redirect_terminate LIKE '%/status?%' 
         OR redirect_quotafull LIKE '%/status?%' 
         OR redirect_security LIKE '%/status?%'
         OR redirect_complete LIKE '%/pages/complete%'
    `);

    console.log(`Found ${res.rows.length} projects to check.`);
    let count = 0;

    for (const project of res.rows) {
      let updated = false;
      
      const fields = [
        ['redirect_complete', 'redirectComplete'],
        ['redirect_terminate', 'redirectTerminate'],
        ['redirect_quotafull', 'redirectQuotafull'],
        ['redirect_security', 'redirectSecurity']
      ];

      const updates: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      for (const [dbField, jsField] of fields) {
        const url = project[dbField];
        if (!url) continue;

        let newUrl = url;
        
        if (newUrl.includes('/status?terminate?')) {
           newUrl = newUrl.replace('/status?terminate?', '/api/track/terminate?');
        } else if (newUrl.includes('/status?quotafull?')) {
           newUrl = newUrl.replace('/status?quotafull?', '/api/track/quotafull?');
        } else if (newUrl.includes('/pages/complete?')) {
           newUrl = newUrl.replace('/pages/complete?', '/api/track/complete?');
        }
        
        const parts = newUrl.split('?');
        if (parts.length > 2) {
           newUrl = parts[0] + '?' + parts.slice(1).join('&');
        }

        if (newUrl !== url) {
           updates.push(`${dbField} = $${paramIdx++}`);
           values.push(newUrl);
           updated = true;
           console.log(`[${project.project_code}] Fixed ${dbField}`);
        }
      }

      if (updated) {
        values.push(project.id);
        await client.query(`UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramIdx}`, values);
        count++;
      }
    }

    console.log(`--- Finished! Fixed ${count} projects. ---`);
  } catch (err) {
    console.error("Database operation failed:", err);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

fixRedirectUrls();
