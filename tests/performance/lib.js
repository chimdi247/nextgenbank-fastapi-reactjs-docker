// Shared helpers for every k6 script.
// Login is two-step (password -> OTP e-mailed to Mailpit), so the OTP is read back through Mailpit's API.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

export const API = __ENV.API_URL || 'http://localhost:8000/api/v1';
export const MAILPIT = __ENV.MAILPIT_URL || 'http://localhost:8025';
export const PASSWORD = __ENV.TEST_PASSWORD || 'password123';

export const transfersDone = new Counter('bank_transfers_completed');
export const flowSuccess = new Rate('bank_flow_success');
export const otpWait = new Trend('bank_otp_delivery_ms', true);

function latestOtp(email, afterIds) {
  for (let i = 0; i < 40; i++) {
    const list = http.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent('to:' + email)}&limit=10`, { tags: { name: 'mailpit search' } });
    const msgs = (list.json('messages') || []).filter((m) => !afterIds.includes(m.ID));
    for (const m of msgs) {
      const body = http.get(`${MAILPIT}/api/v1/message/${m.ID}`, { tags: { name: 'mailpit message' } }).json();
      const text = String(body.Text || '') + ' ' + String(body.HTML || '').replace(/<[^>]+>/g, ' ');
      const hit = text.match(/(?:^|\D)(\d{6})(?:\D|$)/);
      if (hit) return hit[1];
    }
    sleep(0.5);
  }
  return null;
}

function mailIds(email) {
  const list = http.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent('to:' + email)}&limit=50`, { tags: { name: 'mailpit search' } });
  return (list.json('messages') || []).map((m) => m.ID);
}

/** Returns a Cookie header value for an authenticated session, or null. */
export function login(email, password = PASSWORD) {
  const before = mailIds(email);
  const t0 = Date.now();
  const r1 = http.post(`${API}/auth/login/request-otp`, JSON.stringify({ email, password }), { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /auth/login/request-otp' } });
  if (!check(r1, { 'request-otp 200': (r) => r.status === 200 })) return null;
  const otp = latestOtp(email, before);
  otpWait.add(Date.now() - t0);
  if (!otp) return null;
  const r2 = http.post(`${API}/auth/login/verify-otp`, JSON.stringify({ email, otp }), { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /auth/login/verify-otp' } });
  if (!check(r2, { 'verify-otp 200': (r) => r.status === 200 })) return null;
  const jar = http.cookieJar();
  const cookies = jar.cookiesForURL(API);
  return Object.keys(cookies).map((k) => `${k}=${cookies[k][0]}`).join('; ');
}

export function params(cookie, name, extra = {}) {
  return { headers: { 'Content-Type': 'application/json', Cookie: cookie, ...(extra.headers || {}) }, tags: { name } };
}

export function uuid4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}

/** Read-only browsing traffic of a typical customer. */
export function browse(cookie) {
  const calls = [
    ['GET /profile/me', `${API}/profile/me`],
    ['GET /bank-account/all', `${API}/bank-account/all`],
    ['GET /transactions/history', `${API}/transactions/history?skip=0&limit=15`],
    ['GET /virtual-card/all', `${API}/virtual-card/all`],
  ];
  for (const [name, url] of calls) {
    const r = http.get(url, params(cookie, name));
    check(r, { [`${name} 2xx`]: (x) => x.status >= 200 && x.status < 300 });
  }
}

/** Teller deposit: a write path through PgBouncer, the fraud model and the audit trail. */
export function deposit(tellerCookie, accountId, amount = 5) {
  const r = http.post(`${API}/bank-account/deposit`, JSON.stringify({ account_id: accountId, amount, description: 'k6 deposit' }),
    params(tellerCookie, 'POST /bank-account/deposit', { headers: { 'Idempotency-Key': uuid4() } }));
  const ok = check(r, { 'deposit 2xx': (x) => x.status >= 200 && x.status < 300 });
  flowSuccess.add(ok);
  return ok;
}

export const stdThresholds = {
  http_req_failed: ['rate<0.02'],
  'http_req_duration{name:GET /bank-account/all}': ['p(95)<800'],
  'http_req_duration{name:GET /profile/me}': ['p(95)<800'],
  checks: ['rate>0.98'],
};

/** setup(): one customer + one teller session, reused by every VU (OTP login is rate limited by design). */
export function prepare() {
  const customer = login('alice@example.com');
  const teller = login('teller@example.com');
  if (!customer || !teller) throw new Error('login failed - is the stack up and the demo data loaded?');
  const acc = http.get(`${API}/bank-account/all`, params(teller, 'GET /bank-account/all')).json('items').find((a) => a.account_number === '4200000000000001');
  return { customer, teller, accountId: acc.id };
}
