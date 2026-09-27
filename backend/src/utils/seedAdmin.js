const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');

const defaultProducts = [
  {
    name: 'Chicken Burger',
    description: 'Juicy chicken burger with fresh salad.',
    price: 650,
    category: 'Burgers',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
    available: true
  },
  {
    name: 'Zinger Burger',
    description: 'Crispy zinger chicken burger.',
    price: 750,
    category: 'Burgers',
    imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433a?auto=format&fit=crop&w=900&q=80',
    available: true
  },
  {
    name: 'Chicken Pizza',
    description: 'Cheesy chicken pizza.',
    price: 1400,
    category: 'Pizza',
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80',
    available: true
  },
  {
    name: 'Fries',
    description: 'Crispy golden fries.',
    price: 300,
    category: 'Sides',
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80',
    available: true
  },
  {
    name: 'Chicken Roll',
    description: 'Fresh chicken roll.',
    price: 450,
    category: 'Rolls',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=900&q=80',
    available: true
  },
  {
    name: 'Cold Drink',
    description: 'Chilled soft drink.',
    price: 150,
    category: 'Drinks',
    imageUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80',
    available: true
  }
];

async function seedData() {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@zamzamcafe.com').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // 1. Seed default Admin account if not existing
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      await User.create({
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        phone: '03001234567',
        address: 'Zam Zam Cafe, Nia Lahore',
        role: 'ADMIN'
      });
      console.log(`✅ Default admin account created with email: ${adminEmail}`);
    } else {
      if (existingAdmin.role !== 'ADMIN') {
        existingAdmin.role = 'ADMIN';
        await existingAdmin.save();
        console.log(`✅ Updated account (${adminEmail}) role to ADMIN.`);
      } else {
        console.log(`ℹ️  Admin account (${adminEmail}) verified with ADMIN role.`);
      }
    }

    // 2. Seed default products if database has 0 products
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      await Product.insertMany(defaultProducts);
      console.log(`✅ Seeded ${defaultProducts.length} default menu products into MongoDB.`);
    }
  } catch (error) {
    console.error('⚠️  Seed error:', error.message);
  }
}

module.exports = seedData;
