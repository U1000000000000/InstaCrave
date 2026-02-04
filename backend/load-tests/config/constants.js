// Load Testing Configuration Constants

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const ORIGIN = __ENV.ORIGIN || 'http://localhost:5173';

// Test user credentials
export const TEST_USERS = {
  user1: { email: 'test1@p.com', password: 'test12' },
  user2: { email: 'test2@p.com', password: 'test12' },
  user3: { email: 'test3@p.com', password: 'test12' },
};

export const TEST_FOOD_PARTNERS = {
  partner1: { email: 'test2@p.com', password: 'test12' },
};

// Load test scenarios
export const SCENARIOS = {
  smoke: {
    vus: 10,
    duration: '30s',
  },
  load: {
    vus: 50,
    duration: '5m',
  },
  stress: {
    stages: [
      { duration: '2m', target: 50 },  // Ramp up
      { duration: '5m', target: 100 }, // Steady load
      { duration: '2m', target: 200 }, // Peak load
      { duration: '2m', target: 0 },   // Ramp down
    ],
  },
  spike: {
    stages: [
      { duration: '10s', target: 10 },
      { duration: '1m', target: 200 },  // Spike
      { duration: '10s', target: 10 },
    ],
  },
  soak: {
    vus: 50,
    duration: '30m',
  },
};

// Thresholds for performance
// Note: Local development thresholds are more lenient than production
// Adjust p(95) and p(99) based on your environment
export const THRESHOLDS = {
  http_req_duration: ['p(95)<3000', 'p(99)<8000'], // 95% under 3s, 99% under 8s (local dev)
  http_req_failed: ['rate<0.05'],                   // Less than 5% failures
  http_reqs: ['rate>5'],                            // At least 5 req/s (local dev)
};

// Production thresholds (use when testing production-like environment)
export const PRODUCTION_THRESHOLDS = {
  http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% under 2s, 99% under 5s
  http_req_failed: ['rate<0.01'],                   // Less than 1% failures
  http_reqs: ['rate>10'],                           // At least 10 req/s
};
