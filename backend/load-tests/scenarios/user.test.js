/**
 * User Endpoints Load Test
 * Tests: Get user profile, Update profile, Get follows, Get likes, Get comments, Sessions
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, SCENARIOS, THRESHOLDS } from '../config/constants.js';
import { loginUser, getAuthHeaders, getCsrfToken } from '../utils/helpers.js';

export let options = {
  ...SCENARIOS.smoke,
  thresholds: THRESHOLDS,
};

// User pool: test1@u.com to test50@u.com
const USER_POOL = Array.from({ length: 50 }, (_, i) => ({
  email: `test${i + 1}@u.com`,
  password: 'test12',
}));

export default function () {
  // Assign a unique user to each VU
  const user = USER_POOL[(__VU - 1) % USER_POOL.length];
  
  // Login as user - k6 automatically stores cookies in cookie jar
  const loginRes = loginUser(user.email, user.password);

  // Test 1: Get user profile
  const profileRes = http.get(`${BASE_URL}/api/v1/user`, {
    headers: getAuthHeaders(),
    tags: { name: 'GetUserProfile' },
  });

  // Get CSRF token for state-changing requests
  const csrfToken = getCsrfToken();

  check(profileRes, {
    'get user profile status is 200': (r) => r.status === 200,
    'get user profile returns data': (r) => r.json() && r.json().data,
  });

  sleep(1);

  // Test 2: Get user comments
  const commentsRes = http.get(`${BASE_URL}/api/v1/user/comments`, {
    headers: getAuthHeaders(),
    tags: { name: 'GetUserComments' },
  });

  check(commentsRes, {
    'get user comments status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // Test 3: Get user follows
  const followsRes = http.get(`${BASE_URL}/api/v1/user/follows`, {
    headers: getAuthHeaders(),
    tags: { name: 'GetUserFollows' },
  });

  check(followsRes, {
    'get user follows status is 200': (r) => {
      if (r.status !== 200) {
        console.log(`Get user follows failed: ${r.status} - ${r.body}`);
      }
      return r.status === 200;
    },
  });

  sleep(1);

  // Test 4: Get user likes
  const likesRes = http.get(`${BASE_URL}/api/v1/user/likes`, {
    headers: getAuthHeaders(),
    tags: { name: 'GetUserLikes' },
  });

  check(likesRes, {
    'get user likes status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // Test 5: Get user sessions
  const sessionsRes = http.get(`${BASE_URL}/api/v1/auth/sessions`, {
    headers: getAuthHeaders(),
    tags: { name: 'GetUserSessions' },
  });

  check(sessionsRes, {
    'get user sessions status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // Test 6: Update user profile (fullName)
  // First, get the current user profile to fetch the name
  const userProfile = profileRes.json() && profileRes.json().data;
  let currentName = userProfile && userProfile.fullName ? userProfile.fullName : 'Test User';
  const updateRes = http.patch(
    `${BASE_URL}/api/v1/user`,
    JSON.stringify({ fullName: currentName }),
    {
      headers: getAuthHeaders(csrfToken),
      tags: { name: 'UpdateUserProfile' },
    }
  );

  check(updateRes, {
    'update user profile status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // Test 7: Update user password (should be last, as it changes login state)
  const updatePasswordRes = http.patch(
    `${BASE_URL}/api/v1/user`,
    JSON.stringify({ password: 'test12' }),
    {
      headers: getAuthHeaders(csrfToken),
      tags: { name: 'UpdateUserPassword' },
    }
  );

  check(updatePasswordRes, {
    'update user password status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
