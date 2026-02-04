// Quick test to verify CSRF token functionality
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ORIGIN = __ENV.ORIGIN || 'http://localhost:5173';

export default function () {
  console.log('Step 1: Login');
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/user/login`,
    JSON.stringify({ email: 'test1@u.com', password: 'test12' }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Origin': ORIGIN,
      },
    }
  );

  console.log('Login status:', loginRes.status);
  console.log('Login body:', loginRes.body);
  
  if (loginRes.status !== 200) {
    console.error('Login failed!');
    return;
  }

  console.log('\nStep 2: Get CSRF token');
  const csrfRes = http.get(`${BASE_URL}/api/v1/csrf-token`, {
    headers: {
      'Origin': ORIGIN,
    },
  });

  console.log('CSRF status:', csrfRes.status);
  console.log('CSRF body:', csrfRes.body);
  
  if (csrfRes.status !== 200) {
    console.error('CSRF token fetch failed!');
    return;
  }

  const csrfData = JSON.parse(csrfRes.body);
  const csrfToken = csrfData.csrfToken;
  console.log('CSRF token:', csrfToken);

  console.log('\nStep 3: Get food list');
  const foodListRes = http.get(`${BASE_URL}/api/v1/food?skip=0&limit=5`, {
    headers: {
      'Origin': ORIGIN,
    },
  });

  console.log('Food list status:', foodListRes.status);
  
  if (foodListRes.status !== 200) {
    console.error('Food list failed:', foodListRes.body);
    return;
  }

  const foodData = JSON.parse(foodListRes.body);
  if (!foodData.data || foodData.data.length === 0) {
    console.log('No food items found');
    return;
  }

  const foodId = foodData.data[0]._id;
  console.log('Food ID:', foodId);

  console.log('\nStep 4: Like food (with CSRF token)');
  const likeRes = http.post(
    `${BASE_URL}/api/v1/food/like`,
    JSON.stringify({ foodId }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Origin': ORIGIN,
        'x-csrf-token': csrfToken,
      },
    }
  );

  console.log('Like status:', likeRes.status);
  console.log('Like body:', likeRes.body);

  check(likeRes, {
    'like successful': (r) => r.status === 200 || r.status === 201,
  });
}
