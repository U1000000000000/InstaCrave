import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10,
  duration: '30s',
};

const BASE_URL = 'http://localhost:3000';
const ORIGIN = 'http://localhost:5173';
const USER_EMAIL = 'test1@p.com';
const USER_PASSWORD = 'test12';

export default function () {
  // Login as user
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/user/login`,
    JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD }),
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

  // Fetch food list (authenticated)
  const foodRes = http.get(`${BASE_URL}/api/v1/food`, {
    headers: {
      'Cookie': cookieHeader,
      'Origin': ORIGIN,
    },
  });

  check(foodRes, {
    'food status is 200': (r) => r.status === 200,
    'body is not empty': (r) => r.body && r.body.length > 0,
  });

  // Place an order (authenticated)
  const orderRes = http.post(
    `${BASE_URL}/api/v1/orders`,
    JSON.stringify({ foodId: 'SOME_FOOD_ID', quantity: 1 }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'Origin': ORIGIN,
      },
    }
  );

  check(orderRes, {
    'order status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  sleep(1);
}
