// BREAKPOINT / capacity: raise the arrival rate until thresholds fail; the run aborts there and the last
// rate is the capacity limit. Use on a disposable stack only.
import { browse, prepare } from './lib.js';

export const options = {
  scenarios: { breakpoint: { executor: 'ramping-arrival-rate', startRate: 5, timeUnit: '1s', preAllocatedVUs: 100, maxVUs: 1000, stages: [{ duration: '15m', target: 300 }] } },
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' }],
    http_req_duration: [{ threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '30s' }],
  },
};
export function setup() { return prepare(); }
export default function (s) { browse(s.customer); }
