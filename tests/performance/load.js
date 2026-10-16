// LOAD: expected day-to-day traffic. Ramp to 15 VUs, hold 5 minutes, ramp down.
import { browse, deposit, prepare, stdThresholds } from './lib.js';
import { sleep } from 'k6';

export const options = {
  stages: [{ duration: '1m', target: 15 }, { duration: '5m', target: 15 }, { duration: '1m', target: 0 }],
  thresholds: stdThresholds,
};
export function setup() { return prepare(); }
export default function (s) {
  browse(s.customer);
  if (Math.random() < 0.15) deposit(s.teller, s.accountId, 1);   // ~15% of iterations write
  sleep(Math.random() * 2 + 1);
}
