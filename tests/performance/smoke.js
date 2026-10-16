// SMOKE: 1 VU, ~1 min. "Does every layer work at all?" Run after each deploy.
//   docker compose -f local.yml --profile tests run --rm k6 run /scripts/smoke.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { API, browse, deposit, prepare, params, stdThresholds, flowSuccess } from './lib.js';

export const options = { vus: 1, duration: '45s', thresholds: { ...stdThresholds, bank_flow_success: ['rate==1'] } };

export function setup() { return prepare(); }

export default function (s) {
  const base = API.replace('/api/v1', '');
  check(http.get(`${base}/livez`), { 'livez 200': (r) => r.status === 200 });
  check(http.get(`${API}/profile/me`), { 'anonymous -> 401': (r) => r.status === 401 });
  browse(s.customer);
  deposit(s.teller, s.accountId, 1);
  check(http.get(`${API}/transaction/flagged`, params(s.customer, 'GET /transaction/flagged')), { 'customer cannot see flagged': (r) => r.status === 403 });
  sleep(1);
}
