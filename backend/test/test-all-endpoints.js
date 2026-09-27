const http = require('http');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const app = require('../src/app');
const connectDB = require('../src/config/db');
const seedData = require('../src/utils/seedAdmin');

async function runTests() {
  console.log('🧪 Starting Zam Zam Cafe API Endpoint Verification Suite...\n');

  // Connect DB & Seed
  await connectDB();
  await seedData();

  const server = app.listen(5099);
  const baseUrl = 'http://localhost:5099/api';

  function fetchJson(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${baseUrl}${path}`);
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
            resolve({ status: res.statusCode, headers: res.headers, body });
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

  function uploadMultipart(path, fieldName, filename, fileBuffer, mimeType, headers = {}) {
    return new Promise((resolve, reject) => {
      const boundary = '----ZamZamTestBoundary' + Date.now();
      const url = new URL(`${baseUrl}${path}`);

      const headerPart = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
      const footerPart = `\r\n--${boundary}--\r\n`;

      const bodyBuffer = Buffer.concat([
        Buffer.from(headerPart, 'utf8'),
        fileBuffer,
        Buffer.from(footerPart, 'utf8')
      ]);

      const reqHeaders = {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length,
        ...headers
      };

      const req = http.request(url, { method: 'POST', headers: reqHeaders }, (res) => {
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
      });
      req.on('error', reject);
      req.write(bodyBuffer);
      req.end();
    });
  }

  let testAdminToken = '';
  let testCustomerToken = '';
  let createdProductId = '';
  let createdOrderId = '';

  try {
    // 1. Health check
    console.log('1️⃣ Testing Health Check...');
    const health = await fetchJson('/health');
    console.log(`   Status: ${health.status}, Response:`, health.body);
    if (health.status !== 200) throw new Error('Health check failed');

    // 2. Admin Login
    console.log('\n2️⃣ Testing Admin Login (/api/auth/login)...');
    const adminLogin = await fetchJson('/auth/login', {
      method: 'POST',
      body: {
        email: process.env.ADMIN_EMAIL || 'admin@zamzamcafe.com',
        password: process.env.ADMIN_PASSWORD || 'admin123'
      }
    });
    console.log(`   Status: ${adminLogin.status}, User:`, adminLogin.body?.user?.name, 'Role:', adminLogin.body?.user?.role);
    if (adminLogin.status !== 200 || !adminLogin.body?.token) throw new Error('Admin login failed');
    testAdminToken = adminLogin.body.token;

    // 3. Customer Registration
    console.log('\n3️⃣ Testing Customer Registration (/api/auth/register)...');
    const testEmail = `testuser_${Date.now()}@example.com`;
    const customerReg = await fetchJson('/auth/register', {
      method: 'POST',
      body: {
        name: 'Ali Test',
        email: testEmail,
        password: 'password123',
        phone: '03123456789',
        address: 'Nia Lahore, Street 5'
      }
    });
    console.log(`   Status: ${customerReg.status}, User ID:`, customerReg.body?.user?.id, 'Role:', customerReg.body?.user?.role);
    if (customerReg.status !== 201 || !customerReg.body?.token) throw new Error('Registration failed');
    testCustomerToken = customerReg.body.token;

    // 4. Customer Login
    console.log('\n4️⃣ Testing Customer Login (/api/auth/login)...');
    const customerLogin = await fetchJson('/auth/login', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'password123'
      }
    });
    console.log(`   Status: ${customerLogin.status}, Logged In User:`, customerLogin.body?.user?.name);
    if (customerLogin.status !== 200) throw new Error('Customer login failed');

    // 5. Test Image Upload (/api/upload)
    console.log('\n5️⃣ Testing Image Upload (/api/upload)...');
    const fakePixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    const uploadRes = await uploadMultipart('/upload', 'file', 'test-pizza.png', fakePixel, 'image/png');
    console.log(`   Status: ${uploadRes.status}, Image URL:`, uploadRes.body?.imageUrl);
    if (uploadRes.status !== 200 || !uploadRes.body?.imageUrl) throw new Error('Upload failed');
    const uploadedImageUrl = uploadRes.body.imageUrl;

    // 6. Test Create Product (Admin Only)
    console.log('\n6️⃣ Testing Create Product (/api/products)...');
    const createProd = await fetchJson('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${testAdminToken}` },
      body: {
        name: 'Special Zam Zam Supreme Pizza',
        description: 'Loaded with beef, pepperoni, cheese, and olives.',
        price: 1650,
        category: 'Pizza',
        imageUrl: uploadedImageUrl,
        available: true
      }
    });
    console.log(`   Status: ${createProd.status}, Created Product ID:`, createProd.body?.id, 'Name:', createProd.body?.name);
    if (createProd.status !== 201 || !createProd.body?.id) throw new Error('Create product failed');
    createdProductId = createProd.body.id;

    // 7. Test Non-Admin blocked from Product creation
    console.log('\n7️⃣ Testing Role Protection (Customer trying Admin endpoint)...');
    const forbiddenProd = await fetchJson('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${testCustomerToken}` },
      body: { name: 'Hacked Item', price: 10 }
    });
    console.log(`   Status: ${forbiddenProd.status}, Response:`, forbiddenProd.body);
    if (forbiddenProd.status !== 403) throw new Error('Role check failed, should have returned 403');

    // 8. Test Get Products (Public)
    console.log('\n8️⃣ Testing Get All Products (/api/products)...');
    const getProds = await fetchJson('/products');
    console.log(`   Status: ${getProds.status}, Total Products:`, getProds.body?.length);
    if (getProds.status !== 200 || !Array.isArray(getProds.body)) throw new Error('Get products failed');

    // 9. Test Update Product (Admin)
    console.log('\n9️⃣ Testing Update Product (/api/products/:id)...');
    const updateProd = await fetchJson(`/products/${createdProductId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${testAdminToken}` },
      body: {
        price: 1750,
        description: 'Updated description: Extra cheese crust!'
      }
    });
    console.log(`   Status: ${updateProd.status}, Updated Price:`, updateProd.body?.price);
    if (updateProd.status !== 200 || updateProd.body?.price !== 1750) throw new Error('Update product failed');

    // 10. Test Create Order (Public Checkout)
    console.log('\n🔟 Testing Create Order (/api/orders)...');
    const newOrder = await fetchJson('/orders', {
      method: 'POST',
      body: {
        customerName: 'Ali Test',
        phone: '03123456789',
        address: 'Nia Lahore, Street 5',
        notes: 'Please bring extra ketchup',
        paymentMethod: 'COD',
        subtotal: 1750,
        deliveryFee: 0,
        total: 1750,
        items: [
          {
            productId: createdProductId,
            productName: 'Special Zam Zam Supreme Pizza',
            quantity: 1,
            unitPrice: 1750
          }
        ]
      }
    });
    console.log(`   Status: ${newOrder.status}, Created Order ID:`, newOrder.body?.id, 'Status:', newOrder.body?.status);
    if (newOrder.status !== 201 || !newOrder.body?.id) throw new Error('Create order failed');
    createdOrderId = newOrder.body.id;

    // 11. Test Get Orders By Phone (Customer tracking)
    console.log('\n1️⃣1️⃣ Testing Get Customer Orders By Phone (/api/orders?phone=03123456789)...');
    const phoneOrders = await fetchJson('/orders?phone=03123456789');
    console.log(`   Status: ${phoneOrders.status}, Orders found for phone:`, phoneOrders.body?.length);
    if (phoneOrders.status !== 200 || !Array.isArray(phoneOrders.body) || phoneOrders.body.length === 0) {
      throw new Error('Get orders by phone failed');
    }

    // 12. Test Get All Orders (Admin)
    console.log('\n1️⃣2️⃣ Testing Get All Orders as Admin (/api/orders)...');
    const allOrders = await fetchJson('/orders', {
      headers: { Authorization: `Bearer ${testAdminToken}` }
    });
    console.log(`   Status: ${allOrders.status}, Total Orders in system:`, allOrders.body?.length);
    if (allOrders.status !== 200) throw new Error('Admin get all orders failed');

    // 13. Test Update Order Status (Admin)
    console.log('\n1️⃣3️⃣ Testing Update Order Status (/api/orders/:id/status?status=PREPARING)...');
    const updatedStatus = await fetchJson(`/orders/${createdOrderId}/status?status=PREPARING`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${testAdminToken}` }
    });
    console.log(`   Status: ${updatedStatus.status}, New Order Status:`, updatedStatus.body?.status);
    if (updatedStatus.status !== 200 || updatedStatus.body?.status !== 'PREPARING') {
      throw new Error('Update order status failed');
    }

    // 14. Test Delete Order (Admin)
    console.log('\n1️⃣4️⃣ Testing Delete Order (/api/orders/:id)...');
    const delOrder = await fetchJson(`/orders/${createdOrderId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${testAdminToken}` }
    });
    console.log(`   Status: ${delOrder.status}, Result:`, delOrder.body);
    if (delOrder.status !== 200) throw new Error('Delete order failed');

    // 15. Test Delete Product (Admin)
    console.log('\n1️⃣5️⃣ Testing Delete Product (/api/products/:id)...');
    const delProd = await fetchJson(`/products/${createdProductId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${testAdminToken}` }
    });
    console.log(`   Status: ${delProd.status}, Result:`, delProd.body);
    if (delProd.status !== 200) throw new Error('Delete product failed');

    console.log('\n🎉 ALL 15 API ENDPOINTS & AUTHENTICATION TESTS PASSED SUCCESSFULLY! ✅');
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
