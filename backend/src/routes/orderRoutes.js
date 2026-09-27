const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  updateOrderStatus,
  deleteOrder
} = require('../controllers/orderController');
const { protect, requireAdmin } = require('../middleware/auth');

// Middleware for GET /orders: public if ?phone=XXX is provided, otherwise admin required
function orderAccessMiddleware(req, res, next) {
  if (req.query.phone && req.query.phone.trim() !== '') {
    return next();
  }
  // Otherwise require admin authentication
  protect(req, res, () => {
    requireAdmin(req, res, next);
  });
}

router.post('/', createOrder);
router.get('/', orderAccessMiddleware, getOrders);
router.put('/:id/status', protect, requireAdmin, updateOrderStatus);
router.delete('/:id', protect, requireAdmin, deleteOrder);

module.exports = router;
