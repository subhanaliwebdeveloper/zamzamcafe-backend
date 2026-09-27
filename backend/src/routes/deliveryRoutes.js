const express = require('express');
const router = express.Router();
const { getDeliveryFee, getCafeLocation } = require('../controllers/deliveryController');

router.post('/', getDeliveryFee);
router.get('/cafe-location', getCafeLocation);

module.exports = router;
