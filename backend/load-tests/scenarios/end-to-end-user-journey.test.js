/**
 * End-to-End User Journey Load Test
 * Simulates a realistic user flow: Login → Browse → Like → Order → Logout
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, SCENARIOS, THRESHOLDS } from '../config/constants.js';
import { loginUser, getAuthHeaders, getCsrfToken, randomInt } from '../utils/helpers.js';

export let options = {
  ...SCENARIOS.load,
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
  // Step 1: User login - k6 automatically stores cookies in cookie jar
  const loginRes = loginUser(user.email, user.password);

  check(loginRes, {
    'user logged in successfully': (r) => r.status === 200,
  });
  
  // Get CSRF token for state-changing requests
  const csrfToken = getCsrfToken();

  sleep(randomInt(1, 3));

  // Step 2: Browse food items
  const browseRes = http.get(`${BASE_URL}/api/v1/food`, {
    headers: getAuthHeaders(),
    tags: { name: 'BrowseFood' },
  });

  check(browseRes, {
    'food list loaded': (r) => r.status === 200,
  });

  let foodItems = [];
  if (browseRes.status === 200) {
    const data = browseRes.json().data;
    if (data && data.length > 0) {
      foodItems = data;
    }
  }

  sleep(randomInt(2, 5));

  // Step 3: Search for specific food
  const searchRes = http.get(`${BASE_URL}/api/v1/search?query=pizza&type=food`, {
    headers: getAuthHeaders(),
    tags: { name: 'SearchFood' },
  });

  check(searchRes, {
    'search completed': (r) => r.status === 200,
  });

  sleep(randomInt(1, 3));

  // Step 4: Like a food item
  // Only interact with orderable foods for like, comment, and order
  const orderableFoods = foodItems.filter(f => f.isOrderable);
  if (orderableFoods.length > 0) {
    const randomFood = orderableFoods[randomInt(0, orderableFoods.length - 1)];
    const likeRes = http.post(
      `${BASE_URL}/api/v1/food/like`,
      JSON.stringify({ foodId: randomFood._id }),
      {
        headers: getAuthHeaders(csrfToken),
        tags: { name: 'LikeFood' },
      }
    );

    check(likeRes, {
      'food liked': (r) => r.status === 200 || r.status === 201,
    });

    sleep(randomInt(1, 2));

    // Step 5: Comment on food
    const commentRes = http.post(
      `${BASE_URL}/api/v1/food/comment`,
      JSON.stringify({ 
        foodId: randomFood._id, 
        comment: `Great food! - k6 test ${Date.now()}` 
      }),
      {
        headers: getAuthHeaders(csrfToken),
        tags: { name: 'CommentOnFood' },
      }
    );

    check(commentRes, {
      'comment added': (r) => r.status === 200 || r.status === 201,
    });

    sleep(randomInt(2, 4));

    // Step 6: Place order (only for orderable foods)
    // Generate unique idempotency key to avoid duplicate key errors
    const idempotencyKey = `order-${__VU}-${__ITER}-${Date.now()}-${randomInt(1000, 9999)}`;
    
    const orderRes = http.post(
      `${BASE_URL}/api/v1/orders`,
      JSON.stringify({ 
        foodId: randomFood._id, 
        quantity: randomInt(1, 3),
        deliveryAddress: '123 Test Street, Test City, Test State - 123456',
        idempotencyKey
      }),
      {
        headers: getAuthHeaders(csrfToken),
        tags: { name: 'PlaceOrder' },
      }
    );

    check(orderRes, {
      'order placed': (r) => r.status === 200 || r.status === 201,
    });

    sleep(randomInt(1, 3));
  }

  // Step 7: Check user profile
  const profileRes = http.get(`${BASE_URL}/api/v1/user`, {
    headers: getAuthHeaders(),
    tags: { name: 'ViewProfile' },
  });

  check(profileRes, {
    'profile loaded': (r) => r.status === 200,
  });

  sleep(randomInt(1, 2));

  // Step 8: Logout
  const logoutRes = http.post(`${BASE_URL}/api/v1/auth/user/logout`, null, {
    headers: getAuthHeaders(),
    tags: { name: 'UserLogout' },
  });

  check(logoutRes, {
    'user logged out': (r) => r.status === 200,
  });

  sleep(1);
}
