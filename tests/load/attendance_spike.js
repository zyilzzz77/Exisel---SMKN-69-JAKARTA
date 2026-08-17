import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    qr_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },  // Ramp up
        { duration: '1m', target: 200 },  // Peak school attendance surge
        { duration: '30s', target: 300 },  // Concurrency stress test
        { duration: '30s', target: 0 },    // Cool down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<600'], // P95 < 300ms, P99 < 600ms
    http_req_failed: ['rate<0.01'],                 // Error rate < 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const payload = JSON.stringify({
    token: `https://exisel.school/attendance?e=eskul-basket&d=2026-08-17&sig=mock-signature-test`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': `k6-${__VU}-${__ITER}-${Date.now()}`,
      'Cookie': 'exisel_session=mock-token-sample',
    },
  };

  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  // 2. Attendance QR check-in
  const scanRes = http.post(`${BASE_URL}/api/core/v1/attendance/scan`, payload, params);
  check(scanRes, {
    'attendance status is 200, 400, 401, 403, or 410': (r) => [200, 400, 401, 403, 410].includes(r.status),
  });

  sleep(0.5);
}
