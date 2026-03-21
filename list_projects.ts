
import { storage } from './server/storage.js';

async function list() {
  const projects = await (storage as any).getProjects();
  console.log(JSON.stringify(projects, null, 2));
}

list().catch(console.error);
