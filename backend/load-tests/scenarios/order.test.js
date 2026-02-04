/**
 * Order Endpoints Load Test
 * Tests: Create order, Get user orders, Get partner orders, Update order status
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
  // Assign a unique user to each VU
  const user = USER_POOL[(__VU - 1) % USER_POOL.length];
  const partner = PARTNER_POOL[(__VU - 1) % PARTNER_POOL.length];
  
  // Login as user - k6 automatically stores cookies in cookie jar
  const loginRes = loginUser(user.email, user.password);
  
  // Get CSRF token for order creation
  const csrfToken = getCsrfToken();

  // Get a food item to order
  const foodListRes = http.get(`${BASE_URL}/api/v1/food?skip=0&limit=10`, {
    headers: getAuthHeaders(),
    tags: { name: 'GetFoodForOrder' },
  });

  let foodId = null;
  if (foodListRes.status === 200) {
    const foodData = foodListRes.json().data;
    if (foodData && foodData.length > 0) {
      foodId = foodData[0]._id;
    }
  }

  sleep(1);

  // Test 1: Create order
  if (foodId) {
    // Generate unique idempotency key to avoid duplicate key errors
    const idempotencyKey = `order-${__VU}-${__ITER}-${Date.now()}`;
    
    const createOrderRes = http.post(
      `${BASE_URL}/api/v1/orders`,
      JSON.stringify({ 
        foodId, 
        quantity: 1,
        deliveryAddress: '123 Test Street, Test City, Test State - 123456',
        idempotencyKey
      }),
      {
        headers: getAuthHeaders(csrfToken),
        tags: { name: 'CreateOrder' },
      }
    );

    check(createOrderRes, {
      'create order status is 200 or 201': (r) => {
        if (r.status !== 200 && r.status !== 201) {
          console.log(`Create order failed: ${r.status} - ${r.body}`);
        }
        return r.status === 200 || r.status === 201;
      },
    });

    sleep(1);
  } else {
    console.log('No food items found to create order');
  }

  // Test 2: Get user orders
  const userOrdersRes = http.get(`${BASE_URL}/api/v1/orders`, {
    headers: getAuthHeaders(),
    tags: { name: 'GetUserOrders' },
  });

  check(userOrdersRes, {
    'get user orders status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // Login as food partner to test partner orders
  const { cookies: partnerCookies } = loginFoodPartner(partner.email, partner.password);
  
  // Get CSRF token for partner operations
  const partnerCsrfToken = getCsrfToken();

  // Test 3: Get partner orders
  const partnerOrdersRes = http.get(`${BASE_URL}/api/v1/orders/partner`, {
    headers: getAuthHeaders(),
    tags: { name: 'GetPartnerOrders' },
  });

  check(partnerOrdersRes, {
    'get partner orders status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // Test 4: Update order status (if there are orders not in a final state)
  if (partnerOrdersRes.status === 200) {
    const ordersData = partnerOrdersRes.json().data;
    if (ordersData && ordersData.length > 0) {
      // Find an order that is not in a final state
      const updatableOrder = ordersData.find(
        (order) => order.status !== 'delivered' && order.status !== 'cancelled'
      );
      if (updatableOrder) {
        const orderId = updatableOrder._id;
        const updateStatusRes = http.patch(
          `${BASE_URL}/api/v1/orders/${orderId}/status`,
          JSON.stringify({ status: 'preparing' }),
          {
            headers: getAuthHeaders(partnerCsrfToken),
            tags: { name: 'UpdateOrderStatus' },
          }
        );
        check(updateStatusRes, {
          'update order status is 200': (r) => r.status === 200,
        });
      }
    }
  }

  sleep(1);
}
