const http = require('http');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const app = require('../src/app');
const connectDB = require('../src/config/db');
const seedData = require('../src/utils/seedAdmin');

async function testAdminLogin() {
  console.log('🚀 Connecting to Database and seeding admin account...');
  await connectDB();
  await seedData();

  const server = app.listen(5001);
  console.log('📡 Test server listening on http://localhost:5001');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@zamzamcafe.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  console.log(`🔐 Testing POST /api/auth/login with ${adminEmail}...`);

  const payload = JSON.stringify({ email: adminEmail, password: adminPassword });

  const req = http.request(
    {
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    },
    (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`📥 Status: ${res.statusCode}`);
        const parsed = JSON.parse(data);
        console.log('📦 Response Data:', {
          user: parsed.user,
          hasToken: Boolean(parsed.token)
        });
        if (res.statusCode === 200 && parsed.user?.role === 'ADMIN' && parsed.token) {
          console.log('\n✅ Admin authentication verified successfully end-to-end!');
        } else {
          console.error('\n❌ Admin login test failed!');
        }
        server.close();
        process.exit(0);
      });
    }
  );

  req.on('error', (err) => {
    console.error('Request error:', err);
    server.close();
    process.exit(1);
  });

  req.write(payload);
  req.end();
}

testAdminLogin();
