/**
 * Distance and delivery fee calculation utilities
 */

// Default Cafe Coordinates (Nia Lahore, Jhang Road)
const DEFAULT_CAFE_LAT = 31.4289;
const DEFAULT_CAFE_LNG = 72.7758;

function getCafeCoordinates() {
  const lat = process.env.CAFE_LAT ? parseFloat(process.env.CAFE_LAT) : DEFAULT_CAFE_LAT;
  const lng = process.env.CAFE_LNG ? parseFloat(process.env.CAFE_LNG) : DEFAULT_CAFE_LNG;
  return {
    lat: isNaN(lat) ? DEFAULT_CAFE_LAT : lat,
    lng: isNaN(lng) ? DEFAULT_CAFE_LNG : lng
  };
}

/**
 * Calculates the great-circle distance between two points in kilometers using the Haversine formula.
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const toRad = (angle) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // 2 decimal places
}

/**
 * Computes delivery fee based on distance:
 * - First 3 km: FREE (Rs. 0)
 * - Beyond 3 km: Rs. 100 per additional km (rounded UP to the nearest km)
 *   e.g. 3.4 km over free distance (6.4 km total) => 4 chargeable km => Rs. 400
 */
function computeDeliveryFee(distanceKm) {
  const dist = Math.max(0, parseFloat(distanceKm) || 0);
  const roundedDist = Math.round(dist * 100) / 100;

  if (dist <= 3) {
    return {
      distanceKm: roundedDist,
      isFree: true,
      extraKm: 0,
      chargeableKm: 0,
      deliveryFee: 0
    };
  }

  const extraKm = Math.round((dist - 3) * 100) / 100;
  const chargeableKm = Math.ceil(extraKm);
  const deliveryFee = chargeableKm * 100;

  return {
    distanceKm: roundedDist,
    isFree: false,
    extraKm,
    chargeableKm,
    deliveryFee
  };
}

/**
 * Compute delivery fee from customer lat/lng coordinates or manual distance
 */
function calculateDelivery(params = {}) {
  const { lat, lng, manualDistance, distanceKm } = params;
  const cafe = getCafeCoordinates();

  let distance = null;

  if (lat !== undefined && lng !== undefined && lat !== null && lng !== null && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
    const customerLat = parseFloat(lat);
    const customerLng = parseFloat(lng);
    distance = calculateHaversineDistance(cafe.lat, cafe.lng, customerLat, customerLng);
  } else if (manualDistance !== undefined && manualDistance !== null && !isNaN(parseFloat(manualDistance))) {
    distance = Math.max(0, parseFloat(manualDistance));
  } else if (distanceKm !== undefined && distanceKm !== null && !isNaN(parseFloat(distanceKm))) {
    distance = Math.max(0, parseFloat(distanceKm));
  }

  if (distance === null) {
    // Default fallback to 0 km / free
    distance = 0;
  }

  const result = computeDeliveryFee(distance);
  return {
    ...result,
    cafeLocation: cafe
  };
}

module.exports = {
  getCafeCoordinates,
  calculateHaversineDistance,
  computeDeliveryFee,
  calculateDelivery
};
