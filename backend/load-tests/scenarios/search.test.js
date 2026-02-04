/**
 * Search Endpoints Load Test
 * Tests: Search food/partners, Explore
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, SCENARIOS, THRESHOLDS } from '../config/constants.js';
import { loginUser, getAuthHeaders } from '../utils/helpers.js';

export let options = {
  ...SCENARIOS.smoke,
  thresholds: THRESHOLDS,
};

const searchQueries = ['pizza', 'burger', 'pasta', 'sushi', 'salad'];

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

  // Test 1: Search for food
  const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  const searchRes = http.get(`${BASE_URL}/api/v1/search?query=${randomQuery}&type=food`, {
    headers: getAuthHeaders(),
    tags: { name: 'SearchFood' },
  });

  check(searchRes, {
    'search food status is 200': (r) => r.status === 200,
    'search food returns data': (r) => r.json() && r.json().data,
  });

  sleep(1);

  // Test 2: Search for partners
  const searchPartnersRes = http.get(`${BASE_URL}/api/v1/search?query=${randomQuery}&type=partner`, {
    headers: getAuthHeaders(),
    tags: { name: 'SearchPartners' },
  });

  check(searchPartnersRes, {
    'search partners status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // Test 3: Search all (food + partners)
  const searchAllRes = http.get(`${BASE_URL}/api/v1/search?query=${randomQuery}&type=all`, {
    headers: getAuthHeaders(),
    tags: { name: 'SearchAll' },
  });

  check(searchAllRes, {
    'search all status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // Test 4: Explore
  const exploreRes = http.get(`${BASE_URL}/api/v1/search/explore`, {
    headers: getAuthHeaders(),
    tags: { name: 'Explore' },
  });

  check(exploreRes, {
    'explore status is 200': (r) => r.status === 200,
    'explore returns data': (r) => r.json() && r.json().data,
  });

  sleep(1);
}
