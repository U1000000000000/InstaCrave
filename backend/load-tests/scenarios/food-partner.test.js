/**
 * Food Partner Endpoints Load Test
 * Tests: Dashboard, Profile, Follow/Unfollow
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, SCENARIOS, THRESHOLDS } from '../config/constants.js';
import { loginUser, loginFoodPartner, getAuthHeaders, getCsrfToken } from '../utils/helpers.js';

export let options = {
  ...SCENARIOS.smoke,
  thresholds: THRESHOLDS,
};

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
  
  // Login as food partner - k6 automatically stores cookies in cookie jar
  const partnerLoginRes = loginFoodPartner(partner.email, partner.password);

  // Test 1: Get food partner profile
  const profileRes = http.get(`${BASE_URL}/api/v1/food-partner`, {
    headers: getAuthHeaders(),
    tags: { name: 'GetFoodPartnerProfile' },
  });

  check(profileRes, {
    'get food partner profile status is 200': (r) => r.status === 200,
    'get food partner profile returns data': (r) => r.json() && r.json().data,
  });

  let partnerId = null;
  if (profileRes.status === 200) {
    partnerId = profileRes.json().data?._id;
  }

  sleep(1);

  // Login as user to test follow functionality - k6 automatically replaces cookies in jar
  const userLoginRes = loginUser(user.email, user.password);
  
  // Get CSRF token for follow request
  const csrfToken = getCsrfToken();

  // Test 2: Get food partner by ID (as user)
  if (partnerId) {
    const partnerByIdRes = http.get(`${BASE_URL}/api/v1/food-partner/${partnerId}`, {
      headers: getAuthHeaders(),
      tags: { name: 'GetFoodPartnerById' },
    });

    check(partnerByIdRes, {
      'get food partner by id status is 200': (r) => r.status === 200,
    });

    sleep(1);

    // Test 3: Follow food partner
    const followRes = http.post(
      `${BASE_URL}/api/v1/food-partner/follow`,
      JSON.stringify({ foodpartner: partnerId }),
      {
        headers: getAuthHeaders(csrfToken),
        tags: { name: 'FollowFoodPartner' },
      }
    );

    check(followRes, {
      'follow food partner status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    });

    sleep(1);
  }

  sleep(1);
}
