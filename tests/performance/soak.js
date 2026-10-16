// SOAK / ENDURANCE: moderate constant load for hours: leaks, pool exhaustion, queue build-up, disk growth.
// Default 2h; override:  -e SOAK_DURATION=30m
import { browse, deposit, prepare, stdThresholds } from './lib.js';
import { sleep } from 'k6';

export const options = {
  stages: [{ duration: '5m', target: 10 }, { duration: __ENV.SOAK_DURATION || '2h', target: 10 }, { duration: '5m', target: 0 }],
  thresholds: stdThresholds,
};
export function setup() { return prepare(); }
export default function (s) { browse(s.customer); if (Math.random() < 0.1) deposit(s.teller, s.accountId, 1); sleep(Math.random() * 3 + 1); }
