const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'zamzam_secret_jwt_key_2026_super_secure';

/**
 * Generate a JWT token for a user
 * @param {Object} user
 * @returns {string}
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id || user._id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * Authentication middleware to verify JWT token
 */
async function protect(req, res, next) {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Authorization middleware for Admin-only routes
 */
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
}

module.exports = {
  generateToken,
  protect,
  requireAdmin
};
