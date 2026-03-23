import { db } from './server/db';
import { projects, respondents } from './shared/schema';
import { eq, desc } from 'drizzle-orm';
async function main() {
  const p = await db.select().from(projects).where(eq(projects.projectCode, 'WEDQW'));
  console.log('PROJECT:', JSON.stringify(p, null, 2));
  const r = await db.select().from(respondents).where(eq(respondents.projectCode, 'WEDQW')).orderBy(desc(respondents.startedAt)).limit(1);
  console.log('RESPONDENT:', JSON.stringify(r, null, 2));
  process.exit(0);
}
main();
