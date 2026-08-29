// FileVault — k6 read-path load test
//
// Usage:
//   k6 run \
//     -e BASE_URL=http://EC2_IP \
//     -e LOGIN_EMAIL=admin@filevault.local \
//     -e LOGIN_PASSWORD='Admin@12345' \
//     --out json=k6-core.json \
//     deploy/ec2/../../k6/loadtest-core.js
//
// Numbers to report: RPS, p50/p95/p99 latency per endpoint, error rate.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const EMAIL = __ENV.LOGIN_EMAIL || 'admin@filevault.local';
const PASSWORD = __ENV.LOGIN_PASSWORD || 'Admin@12345';

export const options = {
  stages: [
    { duration: '15s', target: 20 },   // ramp up
    { duration: '30s', target: 20 },   // steady
    { duration: '10s', target: 60 },   // spike
    { duration: '20s', target: 60 },   // hold
    { duration: '10s', target: 0 },    // drain
  ],
  thresholds: {
    http_req_duration: ['p(95)<600'],
    'http_req_duration{name:list_files}': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const failRate = new Rate('filevault_failed');
const listTrend = new Trend('filevault_list_ms');
const statsTrend = new Trend('filevault_stats_ms');

// One shared token; login itself is not load-tested (cheap, rate-limited)
let token = null;
export function setup() {
  const r = http.post(`${BASE}/api/v1/auth/login`, JSON.stringify({
    email: EMAIL, password: PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });
  check(r, { 'login ok': (res) => res.status === 200 });
  return r.json().token;
}

export default function (data) {
  token = token || data;
  const headers = { Authorization: `Bearer ${token}` };

  // Health (unauthenticated)
  const h = http.get(`${BASE}/api/v1/test`);
  check(h, { 'health 200': (r) => r.status === 200 });
  failRate.add(h.status !== 200);

  // Get user files (the heavy read op)
  const l = http.get(`${BASE}/api/v1/files`, { headers });
  check(l, { 'files 200': (r) => r.status === 200 });
  listTrend.add(l.timings.duration);
  failRate.add(l.status !== 200);

  // Stats (aggregation query)
  const s = http.get(`${BASE}/api/v1/stats`, { headers });
  check(s, { 'stats 200': (r) => r.status === 200 });
  statsTrend.add(s.timings.duration);
  failRate.add(s.status !== 200);

  sleep(Math.random() * 0.3);
}