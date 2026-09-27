const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { io: ioClient } = require('socket.io-client');
const app = require('../src/app');
const { initSocket } = require('../src/utils/socket');
const connectDB = require('../src/config/db');
const seedData = require('../src/utils/seedAdmin');
const {
  calculateHaversineDistance,
  computeDeliveryFee,
  calculateDelivery
} = require('../src/utils/distance');

async function runFeatureTests() {
  console.log('🚀 Starting Verification of Feature 1 (Delivery Fee) & Feature 2 (Socket.io)...\n');

  // 1. Test Unit Formulas
  console.log('--- TEST 1: Distance & Fee Computation Formula ---');
  // Nia Lahore coordinates: ~31.4289, 72.7758
  const cafeLat = 31.4289;
  const cafeLng = 72.7758;

  // Exact same spot -> 0km, free
  const dist0 = calculateHaversineDistance(cafeLat, cafeLng, cafeLat, cafeLng);
  const fee0 = computeDeliveryFee(dist0);
  console.log(`[Formula] Distance 0 km -> Fee: Rs. ${fee0.deliveryFee} (Free: ${fee0.isFree})`);
  if (fee0.deliveryFee !== 0) throw new Error('Distance 0 should be free');

  // 2.5 km -> free
  const fee2_5 = computeDeliveryFee(2.5);
  console.log(`[Formula] Distance 2.5 km -> Fee: Rs. ${fee2_5.deliveryFee} (Free: ${fee2_5.isFree})`);
  if (fee2_5.deliveryFee !== 0) throw new Error('Distance 2.5 km should be free');

  // 3.0 km -> free
  const fee3_0 = computeDeliveryFee(3.0);
  console.log(`[Formula] Distance 3.0 km -> Fee: Rs. ${fee3_0.deliveryFee} (Free: ${fee3_0.isFree})`);
  if (fee3_0.deliveryFee !== 0) throw new Error('Distance 3.0 km should be free');

  // 3.1 km -> 0.1 over -> 1 chargeable km -> Rs. 100
  const fee3_1 = computeDeliveryFee(3.1);
  console.log(`[Formula] Distance 3.1 km -> Extra: ${fee3_1.extraKm}km, Chargeable: ${fee3_1.chargeableKm}km -> Fee: Rs. ${fee3_1.deliveryFee}`);
  if (fee3_1.deliveryFee !== 100) throw new Error('Distance 3.1 km should be Rs. 100');

  // 6.4 km -> 3.4 over -> 4 chargeable km -> Rs. 400 (per prompt example!)
  const fee6_4 = computeDeliveryFee(6.4);
  console.log(`[Formula] Distance 6.4 km -> Extra: ${fee6_4.extraKm}km, Chargeable: ${fee6_4.chargeableKm}km -> Fee: Rs. ${fee6_4.deliveryFee}`);
  if (fee6_4.deliveryFee !== 400) throw new Error('Distance 6.4 km (3.4 km over free) should be Rs. 400');

  console.log('✅ Formula unit tests passed!\n');

  // 2. Start HTTP & Socket Server on test port
  await connectDB();
  await seedData();

  const TEST_PORT = 5088;
  const httpServer = http.createServer(app);
  initSocket(httpServer);

  await new Promise((resolve) => httpServer.listen(TEST_PORT, resolve));
  const baseUrl = `http://localhost:${TEST_PORT}/api`;
  const socketUrl = `http://localhost:${TEST_PORT}`;

  function fetchJson(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${baseUrl}${endpoint}`);
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      const req = http.request(
        url,
        {
          method: options.method || 'GET',
          headers
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            let body = null;
            try {
              body = data ? JSON.parse(data) : null;
            } catch {
              body = data;
            }
            resolve({ status: res.statusCode, body });
          });
        }
      );
      req.on('error', reject);
      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
  }

  // Connect Socket Client 1 (Admin) and Socket Client 2 (Customer)
  console.log('--- TEST 2: Socket.io Connection ---');
  const adminSocket = ioClient(socketUrl, { transports: ['websocket'] });
  const customerSocket = ioClient(socketUrl, { transports: ['websocket'] });

  await new Promise((resolve) => {
    let count = 0;
    const check = () => {
      count++;
      if (count === 2) resolve();
    };
    adminSocket.on('connect', () => {
      console.log('⚡ Admin test socket connected:', adminSocket.id);
      check();
    });
    customerSocket.on('connect', () => {
      console.log('⚡ Customer test socket connected:', customerSocket.id);
      check();
    });
  });

  // Test POST /api/delivery-fee endpoint
  console.log('\n--- TEST 3: POST /api/delivery-fee Endpoint ---');
  // (a) Within 3km using close coordinates
  const resClose = await fetchJson('/delivery-fee', {
    method: 'POST',
    body: { lat: 31.4310, lng: 72.7760 }
  });
  console.log('   Close coordinates (within 3km):', resClose.body);
  if (resClose.body.deliveryFee !== 0) throw new Error('Close coordinates should be free delivery');

  // (b) Far coordinates (> 3km away, e.g. 7.5km away)
  // 31.4889 is ~6.6km away
  const resFar = await fetchJson('/delivery-fee', {
    method: 'POST',
    body: { lat: 31.4889, lng: 72.7758 }
  });
  console.log('   Far coordinates (> 3km):', resFar.body);
  if (resFar.body.deliveryFee <= 0) throw new Error('Far coordinates should have delivery fee');

  // (c) Manual distance (e.g. 6.4 km -> Rs. 400)
  const resManual = await fetchJson('/delivery-fee', {
    method: 'POST',
    body: { manualDistance: 6.4 }
  });
  console.log('   Manual distance (6.4 km):', resManual.body);
  if (resManual.body.deliveryFee !== 400 || resManual.body.distanceKm !== 6.4) {
    throw new Error('Manual distance 6.4 km must return deliveryFee: 400');
  }
  console.log('✅ POST /api/delivery-fee endpoint verified successfully!\n');

  // Admin login to get JWT
  const loginRes = await fetchJson('/auth/login', {
    method: 'POST',
    body: { email: 'admin@zamzamcafe.com', password: 'admin123' }
  });
  const adminToken = loginRes.body.token;

  // Test Product Creation & Customer Socket Event
  console.log('--- TEST 4: Product Creation & Real-Time Customer Notification ---');
  const productPromise = new Promise((resolve) => {
    customerSocket.once('new_product', (data) => {
      console.log('🎉 Customer socket received "new_product" event:', data.name, 'Price:', data.price);
      resolve(data);
    });
  });

  const prodRes = await fetchJson('/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      name: 'Special BBQ Pizza',
      description: 'Smoky BBQ chicken with mozzarella cheese and olives.',
      price: 1550,
      category: 'Pizza',
      available: true
    }
  });

  if (prodRes.status !== 201) throw new Error('Product creation failed');
  const receivedProduct = await productPromise;
  if (receivedProduct.name !== 'Special BBQ Pizza') throw new Error('Socket product mismatch');
  console.log('✅ "new_product" socket broadcast verified!\n');

  // Test Order Creation (> 3km away) & Admin Socket Event
  console.log('--- TEST 5: Order Creation (> 3km away) & Real-Time Admin Notification ---');
  const orderPromise = new Promise((resolve) => {
    adminSocket.once('new_order', (data) => {
      console.log('🔔 Admin socket received "new_order" event:', data.customerName, 'Total:', data.total, 'Distance:', data.distanceKm, 'DeliveryFee:', data.deliveryFee);
      resolve(data);
    });
  });

  // Customer places order from 6.4 km away
  const orderRes = await fetchJson('/orders', {
    method: 'POST',
    body: {
      customerName: 'Ahmad Ali',
      phone: '03001234567',
      address: 'House #45, Sector B, Nia Lahore Outer',
      manualDistance: 6.4,
      paymentMethod: 'COD',
      items: [
        {
          productId: prodRes.body.id,
          productName: 'Special BBQ Pizza',
          quantity: 2,
          unitPrice: 1550
        }
      ]
    }
  });

  if (orderRes.status !== 201) throw new Error('Order creation failed');
  console.log('   Order created in DB:', {
    id: orderRes.body.id,
    subtotal: orderRes.body.subtotal,
    distanceKm: orderRes.body.distanceKm,
    deliveryFee: orderRes.body.deliveryFee,
    total: orderRes.body.total
  });

  // Subtotal = 2 * 1550 = 3100. DeliveryFee = 400 (for 6.4 km). Total = 3500.
  if (orderRes.body.subtotal !== 3100) throw new Error(`Expected subtotal 3100, got ${orderRes.body.subtotal}`);
  if (orderRes.body.distanceKm !== 6.4) throw new Error(`Expected distanceKm 6.4, got ${orderRes.body.distanceKm}`);
  if (orderRes.body.deliveryFee !== 400) throw new Error(`Expected deliveryFee 400, got ${orderRes.body.deliveryFee}`);
  if (orderRes.body.total !== 3500) throw new Error(`Expected total 3500, got ${orderRes.body.total}`);

  const receivedOrder = await orderPromise;
  if (receivedOrder.customerName !== 'Ahmad Ali' || receivedOrder.total !== 3500) {
    throw new Error('Socket order summary mismatch');
  }
  console.log('✅ "new_order" socket broadcast and server-side fee calculation verified!\n');

  // Clean up
  adminSocket.disconnect();
  customerSocket.disconnect();
  httpServer.close();

  console.log('🎉 ALL FEATURE TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runFeatureTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
