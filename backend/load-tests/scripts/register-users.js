// Bulk register users test7@u.com to test50@u.com
import http from 'k6/http';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ORIGIN = __ENV.ORIGIN || 'http://localhost:5173';
const PASSWORD = 'test12';

export default function () {
  for (let i = 7; i <= 50; i++) {
    const email = `test${i}@u.com`;
    const payload = JSON.stringify({
      fullName: `Test ${i}`,
      email,
      password: PASSWORD,
    });
    const res = http.post(`${BASE_URL}/api/v1/auth/user/register`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': ORIGIN,
      },
    });
    if (res.status === 200 || res.status === 201) {
      console.log(`Registered: ${email}`);
    } else if (res.status === 400 && res.body && res.body.includes('already exists')) {
      console.log(`Already exists: ${email}`);
    } else {
      console.error(`Failed: ${email} - ${res.status} - ${res.body}`);
    }
  }
}
