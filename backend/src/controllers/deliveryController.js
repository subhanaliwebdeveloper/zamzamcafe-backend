const { calculateDelivery, getCafeCoordinates } = require('../utils/distance');

/**
 * @route   POST /api/delivery-fee
 * @desc    Calculate distance and delivery fee from coordinates or manual distance
 * @access  Public
 */
async function getDeliveryFee(req, res) {
  try {
    const { lat, lng, latitude, longitude, manualDistance, distanceKm } = req.body;

    const result = calculateDelivery({
      lat: lat !== undefined ? lat : latitude,
      lng: lng !== undefined ? lng : longitude,
      manualDistance,
      distanceKm
    });

    res.json({
      distanceKm: result.distanceKm,
      deliveryFee: result.deliveryFee,
      isFree: result.isFree,
      extraKm: result.extraKm,
      chargeableKm: result.chargeableKm,
      cafeLocation: result.cafeLocation
    });
  } catch (error) {
    console.error('Calculate delivery fee error:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate delivery fee' });
  }
}

/**
 * @route   GET /api/delivery-fee/cafe-location
 * @desc    Get cafe location coordinates
 * @access  Public
 */
async function getCafeLocation(req, res) {
  try {
    const cafe = getCafeCoordinates();
    res.json(cafe);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cafe location' });
  }
}

module.exports = {
  getDeliveryFee,
  getCafeLocation
};
