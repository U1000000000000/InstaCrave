import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10,
  duration: '30s',
};

const BASE_URL = 'http://localhost:3000';
const ORIGIN = 'http://localhost:5173';
const FOOD_PARTNER_EMAIL = 'test2@p.com';
const FOOD_PARTNER_PASSWORD = 'test12';

export default function () {
  // Login as food partner
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/food-partner/login`,
    JSON.stringify({ email: FOOD_PARTNER_EMAIL, password: FOOD_PARTNER_PASSWORD }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Origin': ORIGIN,
      },
    }
  );

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'received set-cookie': (r) => r.cookies && Object.keys(r.cookies).length > 0,
  });

  const cookies = loginRes.cookies;
  let cookieHeader = '';
  for (const name in cookies) {
    cookieHeader += `${name}=${cookies[name][0].value}; `;
  }

  // Fetch food partner dashboard (authenticated)
  const dashboardRes = http.get(`${BASE_URL}/api/v1/food-partner/dashboard`, {
    headers: {
      'Cookie': cookieHeader,
      'Origin': ORIGIN,
    },
  });

  check(dashboardRes, {
    'dashboard status is 200': (r) => r.status === 200,
    'body is not empty': (r) => r.body && r.body.length > 0,
  });

  sleep(1);
}
