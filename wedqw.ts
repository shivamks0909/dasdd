import { db } from './server/db';
import { respondents } from './shared/schema';
import { eq, desc } from 'drizzle-orm';
import * as fs from 'fs';

async function main() {
  const data = await db.select({
    clientRid: respondents.clientRid,
    sentUid: respondents.sentUid,
    surveyUrl: respondents.surveyUrl,
    redirectUrl: respondents.redirectUrl
  }).from(respondents).where(eq(respondents.projectCode, 'WEDQW')).orderBy(desc(respondents.startedAt)).limit(5);

  fs.writeFileSync('wedqw.json', JSON.stringify(data, null, 2));
  console.log('done');
  process.exit(0);
}
main();
