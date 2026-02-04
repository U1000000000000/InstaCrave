/**
 * End-to-End Food Partner Journey Load Test
 * Simulates a realistic food partner flow: Login → Dashboard → Manage Orders → Logout
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, SCENARIOS, THRESHOLDS } from '../config/constants.js';
import { loginFoodPartner, getAuthHeaders, getCsrfToken, randomInt } from '../utils/helpers.js';

export let options = {
  ...SCENARIOS.load,
  thresholds: THRESHOLDS,
};

// Partner pool: test1@p.com to test50@p.com
const PARTNER_POOL = Array.from({ length: 50 }, (_, i) => ({
  email: `test${i + 1}@p.com`,
  password: 'test12',
}));

export default function () {
  // Assign a unique partner to each VU
  const partner = PARTNER_POOL[(__VU - 1) % PARTNER_POOL.length];
  
  // Step 1: Food partner login - k6 automatically stores cookies in cookie jar
  const loginRes = loginFoodPartner(partner.email, partner.password);

  check(loginRes, {
    'partner logged in successfully': (r) => r.status === 200,
  });
  
  // Get CSRF token for state-changing requests
  const csrfToken = getCsrfToken();

  sleep(randomInt(1, 3));

  // Step 2: View partner profile
  const profileRes = http.get(`${BASE_URL}/api/v1/food-partner`, {
    headers: getAuthHeaders(),
    tags: { name: 'ViewPartnerProfile' },
  });

  check(profileRes, {
    'partner profile loaded': (r) => r.status === 200,
  });

  sleep(randomInt(2, 4));

  // Step 3: Check partner orders
  const ordersRes = http.get(`${BASE_URL}/api/v1/orders/partner`, {
    headers: getAuthHeaders(),
    tags: { name: 'ViewPartnerOrders' },
  });

  check(ordersRes, {
    'partner orders loaded': (r) => r.status === 200,
  });

  let orders = [];
  if (ordersRes.status === 200) {
    const data = ordersRes.json().data;
    if (data && data.length > 0) {
      orders = data;
    }
  }

  sleep(randomInt(2, 5));

  // Step 4: Update order status (if there are orders not in a final state)
  if (orders.length > 0) {
    // Filter orders that are not in a final state
    const updatableOrders = orders.filter(
      (order) => order.status !== 'delivered' && order.status !== 'cancelled'
    );
    if (updatableOrders.length > 0) {
      const randomOrder = updatableOrders[randomInt(0, updatableOrders.length - 1)];
      const statuses = ['confirmed', 'preparing', 'ready'];
      const randomStatus = statuses[randomInt(0, statuses.length - 1)];

      const updateRes = http.patch(
        `${BASE_URL}/api/v1/orders/${randomOrder._id}/status`,
        JSON.stringify({ status: randomStatus }),
        {
          headers: getAuthHeaders(csrfToken),
          tags: { name: 'UpdateOrderStatus' },
        }
      );

      check(updateRes, {
        'order status updated': (r) => r.status === 200,
      });

      sleep(randomInt(1, 3));
    }
  }

  // Step 5: View partner sessions
  const sessionsRes = http.get(`${BASE_URL}/api/v1/auth/sessions`, {
    headers: getAuthHeaders(),
    tags: { name: 'ViewPartnerSessions' },
  });

  check(sessionsRes, {
    'partner sessions loaded': (r) => r.status === 200,
  });

  sleep(randomInt(1, 2));

  // Step 6: Logout
  const logoutRes = http.post(`${BASE_URL}/api/v1/auth/food-partner/logout`, null, {
    headers: getAuthHeaders(),
    tags: { name: 'PartnerLogout' },
  });

  check(logoutRes, {
    'partner logged out': (r) => r.status === 200,
  });

  sleep(1);
}
