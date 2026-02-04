/**
 * Food Partner Pool Registration Script
 * Creates 50 food partners for load testing (test1@p.com to test50@p.com)
 * 
 * Usage: node load-tests/scripts/register-partners.js
 */

import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ORIGIN = __ENV.ORIGIN || 'http://localhost:5173';

export let options = {
  iterations: 50,
  vus: 1, // Sequential registration to avoid race conditions
};

export default function () {
  const partnerId = __ITER + 1; // 1 to 50
  
  const partnerData = {
    name: `test${partnerId}bites`,
    contactName: `Test ${partnerId}`,
    phone: `000000${String(partnerId).padStart(4, '0')}`, // e.g., 0000000001
    address: `${partnerId} Test Street, Test City, TC ${String(partnerId).padStart(5, '0')}`,
    email: `test${partnerId}@p.com`,
    password: 'test12',
  };

  const response = http.post(
    `${BASE_URL}/api/v1/auth/food-partner/register`,
    JSON.stringify(partnerData),
    {
      headers: {
        'Content-Type': 'application/json',
        'Origin': ORIGIN,
      },
    }
  );

  const success = check(response, {
    'partner registered successfully': (r) => r.status === 201 || r.status === 200,
    'received partner data': (r) => {
      try {
        const body = r.json();
        return body && body.data;
      } catch (e) {
        return false;
      }
    },
  });

  if (success) {
    console.log(`✅ Registered: ${partnerData.email}`);
  } else {
    console.log(`❌ Failed to register: ${partnerData.email} - Status: ${response.status}`);
    if (response.body) {
      console.log(`   Response: ${response.body}`);
    }
  }
}
