
import { nanoid } from 'nanoid';

const BASE_URL = 'http://localhost:3000'; // Adjust if needed
const PROJECT_CODE = 'OPI-TECH-24';
const ITERATIONS = 100;
const CONCURRENCY = 10;

async function runBenchmark() {
  console.log(`Starting benchmark: ${ITERATIONS} iterations, ${CONCURRENCY} concurrent requests`);
  
  const startTime = Date.now();
  let completed = 0;
  let success = 0;
  let totalLatency = 0;

  const runTask = async () => {
    while (completed < ITERATIONS) {
      const current = completed++;
      const uid = `bench_${nanoid(8)}`;
      const trackUrl = `${BASE_URL}/t/${PROJECT_CODE}?country=US&sup=TEST_SUPP_1773589013687&uid=${uid}`;
      
      const start = Date.now();
      try {
        const res = await fetch(trackUrl, { redirect: 'manual' });
        const latency = Date.now() - start;
        totalLatency += latency;
        
        if (res.status === 302) {
          success++;
        }
      } catch (e) {
        console.error(`Request ${current} failed:`, e);
      }
    }
  };

  const workers = Array.from({ length: CONCURRENCY }).map(() => runTask());
  await Promise.all(workers);

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\nBenchmark Results:`);
  console.log(`Total Time: ${duration.toFixed(2)}s`);
  console.log(`Requests/sec: ${(ITERATIONS / duration).toFixed(2)}`);
  console.log(`Avg Latency: ${(totalLatency / ITERATIONS).toFixed(2)}ms`);
  console.log(`Success Rate: ${(success / ITERATIONS * 100).toFixed(2)}%`);
}

runBenchmark().catch(console.error);
