/**
 * Food Endpoints Load Test
 * Tests: Get food list, Like, Save, Comment, Delete
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
  
  // Login first - k6 automatically stores cookies in cookie jar
  const loginRes = loginUser(user.email, user.password);
  
  // Get CSRF token for state-changing requests
  const csrfToken = getCsrfToken();

  // Test 1: Get food list (paginated)
  const foodListRes = http.get(`${BASE_URL}/api/v1/food?skip=0&limit=10`, {
    headers: getAuthHeaders(),
    tags: { name: 'GetFoodList' },
  });

  check(foodListRes, {
    'get food list status is 200': (r) => r.status === 200,
    'get food list returns data': (r) => r.json() && r.json().data,
  });

  let foodId = null;
  if (foodListRes.status === 200) {
    const foodData = foodListRes.json().data;
    if (foodData && foodData.length > 0) {
      foodId = foodData[0]._id;
    }
  }

  sleep(1);

  // Test 2: Like food (if we have one)
  if (foodId) {
    const likeRes = http.post(
      `${BASE_URL}/api/v1/food/like`,
      JSON.stringify({ foodId }),
      {
        headers: getAuthHeaders(csrfToken),
        tags: { name: 'LikeFood' },
      }
    );

    check(likeRes, {
      'like food status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    });

    sleep(1);

    // Test 3: Save food
    const saveRes = http.post(
      `${BASE_URL}/api/v1/food/save`,
      JSON.stringify({ foodId }),
      {
        headers: getAuthHeaders(csrfToken),
        tags: { name: 'SaveFood' },
      }
    );

    check(saveRes, {
      'save food status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    });

    sleep(1);

    // Test 4: Comment on food
    const commentRes = http.post(
      `${BASE_URL}/api/v1/food/comment`,
      JSON.stringify({ foodId, comment: 'Great food! (k6 test)' }),
      {
        headers: getAuthHeaders(csrfToken),
        tags: { name: 'CommentOnFood' },
      }
    );

    check(commentRes, {
      'comment on food status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    });
  }

  sleep(1);
}
