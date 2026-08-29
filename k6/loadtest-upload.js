// FileVault — k6 upload throughput test (direct /api/v1/upload, multipart)
//
// Measures sustained write throughput (MB/s), p95 latency, error rate.
// NOTE: every iteration persists a file to R2 + DB. Keep iterations low
//       (e.g. 5 VU x 2 iters x 5MB = 50MB) unless you want 6 events of cleanup.
//
// Usage:
//   k6 run -e BASE_URL=http://EC2_IP -e UP_BYTES=5242880 \
//          -e LOGIN_EMAIL=... -e LOGIN_PASSWORD=... k6/loadtest-upload.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const EMAIL = __ENV.LOGIN_EMAIL || 'admin@filevault.local';
const PASSWORD = __ENV.LOGIN_PASSWORD || 'Admin@12345';
const UP_BYTES = parseInt(__ENV.UP_BYTES || (5 * 1024 * 1024), 10);
const FILE_NAME = `k6-${__ENV.PORT || 'upload'}.bin`;

const outputTag = 'k6_upload';
const uploadSize = new Rate('filevault_upload_bytes_total');

export const options = {
  scenarios: {
    upload: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 2,
      maxDuration: '120s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
  },
};

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
  const payload = http.file(new Uint8Array(UP_BYTES), FILE_NAME, 'application/octet-stream');
  const body = { file: payload };

  const started = Date.now();
  const r = http.post(`${BASE}/api/v1/upload`, body, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: outputTag },
  });
  const elapsedSec = (Date.now() - started) / 1000;

  check(r, { 'upload 201': (res) => res.status === 201 });
  if (r.status === 201) {
    uploadSize.add(UP_BYTES);
    console.log(
      `upload ok ${(UP_BYTES / 1024 / 1024).toFixed(2)}MB in ${elapsedSec.toFixed(2)}s ` +
      `= ${(UP_BYTES / 1024 / 1024 / elapsedSec).toFixed(2)} MB/s (http ${r.status})`
    );
  } else {
    console.log(`upload FAILED http ${r.status}`);
  }
  sleep(1);
}