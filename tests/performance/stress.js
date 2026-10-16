// STRESS: step the load up past normal to find where latency / errors / PgBouncer queueing start.
// Watch Grafana: PgBouncer "clients waiting" + "% pool in use", container CPU/memory > 40% alerts.
import { browse, deposit, prepare } from './lib.js';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 20 }, { duration: '3m', target: 20 },
    { duration: '2m', target: 50 }, { duration: '3m', target: 50 },
    { duration: '2m', target: 100 }, { duration: '3m', target: 100 },
    { duration: '3m', target: 0 },
  ],
  thresholds: { http_req_failed: ['rate<0.05'], http_req_duration: ['p(95)<3000'] },
};
export function setup() { return prepare(); }
export default function (s) { browse(s.customer); if (Math.random() < 0.2) deposit(s.teller, s.accountId, 1); sleep(0.5); }
