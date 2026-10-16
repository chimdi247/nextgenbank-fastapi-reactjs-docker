// SPIKE: sudden surge (payday). Does the bank survive it and recover afterwards?
import { browse, deposit, prepare } from './lib.js';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 5 }, { duration: '20s', target: 120 }, { duration: '2m', target: 120 },
    { duration: '20s', target: 5 }, { duration: '3m', target: 5 }, { duration: '20s', target: 0 },
  ],
  thresholds: { http_req_failed: ['rate<0.10'], http_req_duration: ['p(95)<4000'] },
};
export function setup() { return prepare(); }
export default function (s) { browse(s.customer); if (Math.random() < 0.2) deposit(s.teller, s.accountId, 1); sleep(0.3); }
