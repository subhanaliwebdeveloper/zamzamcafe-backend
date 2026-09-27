const { uploadToCloudinary } = require('../config/cloudinary');

/**
 * @route   POST /api/upload
 * @desc    Upload an image file to Cloudinary
 * @access  Private/Admin or Public
 */
async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      mimetype: req.file.mimetype,
      folder: 'zamzam_cafe/products'
    });

    res.json({
      imageUrl: result.secure_url || result.url
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: error.message || 'Image upload failed' });
  }
}

module.exports = {
  uploadImage
};
