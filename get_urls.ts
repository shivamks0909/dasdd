import { db } from './server/db';
import { respondents } from './shared/schema';
import { desc, eq } from 'drizzle-orm';
async function main() {
  const data = await db.select({ projectCode: respondents.projectCode, supplierRid: respondents.supplierRid, clientRid: respondents.clientRid, surveyUrl: respondents.surveyUrl, redirectUrl: respondents.redirectUrl }).from(respondents).where(eq(respondents.projectCode, 'WEDQW')).orderBy(desc(respondents.startedAt)).limit(1);
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}
main();