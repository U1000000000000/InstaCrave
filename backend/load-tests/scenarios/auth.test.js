/**
 * Authentication Endpoints Load Test
 * Tests: User/Food Partner Registration, Login, Logout
 * 
 * IMPORTANT: We test user and partner in separate iterations to avoid
 * cookie jar conflicts (k6 uses one global jar per VU)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, SCENARIOS, THRESHOLDS } from '../config/constants.js';
import { getAuthHeaders, getCsrfToken } from '../utils/helpers.js';

export let options = {
  ...SCENARIOS.smoke,
  thresholds: THRESHOLDS,
};

const ORIGIN = 'http://localhost:5173';

// User pool: test1@u.com to test50@u.com
const USER_POOL = Array.from({ length: 50 }, (_, i) => ({
  email: `test${i + 1}@u.com`,
  password: 'test12',
}));

// Partner pool: test1@p.com to test50@p.com
const PARTNER_POOL = Array.from({ length: 50 }, (_, i) => ({
  email: `test${i + 1}@p.com`,
  password: 'test12',
}));

export default function () {
  // Assign unique user and partner to each VU
  const user = USER_POOL[(__VU - 1) % USER_POOL.length];
  const partner = PARTNER_POOL[(__VU - 1) % PARTNER_POOL.length];
  
  // Alternate between user and partner tests to avoid cookie jar collisions
  const iteration = __ITER % 2;
  
  if (iteration === 0) {
    // Test User Authentication Flow
    testUserAuth(user);
  } else {
    // Test Food Partner Authentication Flow
    testPartnerAuth(partner);
  }
}

function testUserAuth(user) {
  // Get CSRF token first
  const csrfToken = getCsrfToken();
  
  if (!csrfToken) {
    console.error('Failed to get CSRF token!');
    return;
  }
  
  // Test 1: User Login
  const userLoginRes = http.post(
    `${BASE_URL}/api/v1/auth/user/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Origin': ORIGIN,
        'x-csrf-token': csrfToken,
      },
      tags: { name: 'UserLogin' },
    }
  );

  check(userLoginRes, {
    'user login status is 200': (r) => {
      if (r.status !== 200) {
        console.log(`User login failed: ${r.status} - ${r.body}`);
      }
      return r.status === 200;
    },
    'user login returns cookies': (r) => r.cookies && Object.keys(r.cookies).length > 0,
  });

  sleep(1);

  // Test 2: Get current user (k6 auto-sends cookies)
  const meRes = http.get(`${BASE_URL}/api/v1/auth/me`, {
    headers: getAuthHeaders(),
    tags: { name: 'GetCurrentUser' },
  });

  check(meRes, {
    'get current user status is 200': (r) => r.status === 200,
    'get current user returns data': (r) => r.json() && r.json().data,
  });

  sleep(1);

  // Test 3: User Logout (k6 auto-sends cookies)
  const logoutRes = http.post(`${BASE_URL}/api/v1/auth/user/logout`, null, {
    headers: getAuthHeaders(csrfToken),
    tags: { name: 'UserLogout' },
  });

  check(logoutRes, {
    'user logout status is 200': (r) => r.status === 200,
  });

  sleep(1);
}

function testPartnerAuth(partner) {
  // Get CSRF token first
  const csrfToken = getCsrfToken();
  
  // Test 1: Food Partner Login
  const partnerLoginRes = http.post(
    `${BASE_URL}/api/v1/auth/food-partner/login`,
    JSON.stringify({ email: partner.email, password: partner.password }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Origin': ORIGIN,
        'x-csrf-token': csrfToken,
      },
      tags: { name: 'FoodPartnerLogin' },
    }
  );

  check(partnerLoginRes, {
    'partner login status is 200': (r) => r.status === 200,
    'partner login returns cookies': (r) => r.cookies && Object.keys(r.cookies).length > 0,
  });

  sleep(1);

  // Test 2: Get current partner (k6 auto-sends cookies)
  const meRes = http.get(`${BASE_URL}/api/v1/auth/me`, {
    headers: getAuthHeaders(),
    tags: { name: 'GetCurrentPartner' },
  });

  check(meRes, {
    'get current partner status is 200': (r) => r.status === 200,
    'get current partner returns data': (r) => r.json() && r.json().data,
  });

  sleep(1);

  // Test 3: Partner Logout (k6 auto-sends cookies)
  const partnerLogoutRes = http.post(`${BASE_URL}/api/v1/auth/food-partner/logout`, null, {
    headers: getAuthHeaders(csrfToken),
    tags: { name: 'PartnerLogout' },
  });

  check(partnerLogoutRes, {
    'partner logout status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
