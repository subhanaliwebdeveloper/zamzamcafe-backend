const Order = require('../models/Order');
const { calculateDelivery } = require('../utils/distance');
const { getIO } = require('../utils/socket');

/**
 * @route   POST /api/orders
 * @desc    Create a new customer order
 * @access  Public
 */
async function createOrder(req, res) {
  try {
    const {
      customerName,
      name,
      phone,
      address,
      notes,
      paymentMethod,
      subtotal,
      lat,
      lng,
      latitude,
      longitude,
      manualDistance,
      distanceKm,
      items
    } = req.body;

    const finalCustomerName = (customerName || name || '').trim();
    if (!finalCustomerName) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    if (!phone || !address) {
      return res.status(400).json({ error: 'Phone number and address are required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Format and sanitize items
    const formattedItems = items.map(item => ({
      productId: item.productId ? String(item.productId) : (item.id ? String(item.id) : ''),
      productName: item.productName || item.name || 'Unnamed Item',
      quantity: Number(item.quantity || item.qty || 1),
      unitPrice: Number(item.unitPrice || item.price || 0)
    }));

    // Calculate subtotal from items
    const calculatedSubtotal = formattedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    // Calculate distance and delivery fee securely on the server
    const customerLat = lat !== undefined ? lat : latitude;
    const customerLng = lng !== undefined ? lng : longitude;

    const deliveryInfo = calculateDelivery({
      lat: customerLat,
      lng: customerLng,
      manualDistance,
      distanceKm
    });

    const calculatedDeliveryFee = deliveryInfo.deliveryFee;
    const calculatedDistanceKm = deliveryInfo.distanceKm;
    const calculatedTotal = calculatedSubtotal + calculatedDeliveryFee;

    const customerLocation =
      customerLat !== undefined && customerLng !== undefined && !isNaN(parseFloat(customerLat)) && !isNaN(parseFloat(customerLng))
        ? { lat: parseFloat(customerLat), lng: parseFloat(customerLng) }
        : undefined;

    const order = await Order.create({
      customerName: finalCustomerName,
      phone: phone.trim(),
      address: address.trim(),
      notes: notes ? notes.trim() : '',
      paymentMethod: paymentMethod || 'COD',
      status: 'NEW',
      subtotal: calculatedSubtotal,
      distanceKm: calculatedDistanceKm,
      customerLocation,
      deliveryFee: calculatedDeliveryFee,
      total: calculatedTotal,
      items: formattedItems
    });

    // Emit real-time socket event for Admin Notification
    try {
      const io = getIO();
      if (io) {
        const orderSummary = {
          id: order.id || order._id,
          orderId: order.id || order._id,
          customerName: order.customerName,
          total: order.total,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          distanceKm: order.distanceKm,
          itemsCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
          items: order.items,
          phone: order.phone,
          address: order.address,
          status: order.status,
          createdAt: order.createdAt
        };
        io.emit('new_order', orderSummary);
      }
    } catch (socketErr) {
      console.warn('Socket emit error on new order:', socketErr.message);
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
}

/**
 * @route   GET /api/orders
 * @desc    Get orders (if phone query param: customer orders; otherwise admin all orders)
 * @access  Public (with phone query) / Admin (without phone query)
 */
async function getOrders(req, res) {
  try {
    const { phone } = req.query;

    if (phone && phone.trim() !== '') {
      // Customer querying their own orders
      const orders = await Order.find({ phone: phone.trim() }).sort({ createdAt: -1 });
      return res.json(orders);
    }

    // If no phone query, this route is for admin to view all orders
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required to view all orders' });
    }

    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status
 * @access  Private/Admin
 */
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const status = req.query.status || req.body.status;

    const validStatuses = ['NEW', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'];

    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        error: `Invalid status. Allowed values: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status: status.toUpperCase() },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: error.message || 'Failed to update order status' });
  }
}

/**
 * @route   DELETE /api/orders/:id
 * @desc    Delete an order
 * @access  Private/Admin
 */
async function deleteOrder(req, res) {
  try {
    const { id } = req.params;
    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully', id });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete order' });
  }
}

module.exports = {
  createOrder,
  getOrders,
  updateOrderStatus,
  deleteOrder
};
