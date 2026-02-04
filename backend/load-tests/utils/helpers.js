// Utility functions for load tests
import http from 'k6/http';
import { BASE_URL, ORIGIN } from '../config/constants.js';

/**
 * Login as a user and return response
 * Cookies are automatically stored in k6's cookie jar
 */
const FIXED_USER_AGENT = 'k6-loadtest-agent/1.0';

export function loginUser(email, password) {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/user/login`,
    JSON.stringify({ email, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Origin': ORIGIN,
        'User-Agent': FIXED_USER_AGENT,
      },
    }
  );
  // k6 automatically stores cookies from Set-Cookie headers in the cookie jar
  return loginRes;
}

/**
 * Login as a food partner and return response
 * Cookies are automatically stored in k6's cookie jar
 */
export function loginFoodPartner(email, password) {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/food-partner/login`,
    JSON.stringify({ email, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Origin': ORIGIN,
        'User-Agent': FIXED_USER_AGENT,
      },
    }
  );
  // k6 automatically stores cookies from Set-Cookie headers in the cookie jar
  return loginRes;
}

/**
 * Get CSRF token from the server
 * Must be called after login to get a valid CSRF token
 */
export function getCsrfToken() {
  const csrfRes = http.get(`${BASE_URL}/api/v1/csrf-token`, {
    headers: {
      'Origin': ORIGIN,
      'User-Agent': FIXED_USER_AGENT,
    },
  });
  if (csrfRes.status === 200) {
    const body = JSON.parse(csrfRes.body);
    return body.csrfToken;
  }
  console.error('Failed to get CSRF token:', csrfRes.status, csrfRes.body);
  return null;
}

/**
 * Get standard headers with authentication
 * Note: Cookies are automatically sent by k6's cookie jar
 */
export function getAuthHeaders(csrfToken = null, contentType = 'application/json') {
  const headers = {
    'Origin': ORIGIN,
    'User-Agent': FIXED_USER_AGENT,
  };
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }
  return headers;
}

/**
 * Random element from array
 */
export function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Random integer between min and max
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
