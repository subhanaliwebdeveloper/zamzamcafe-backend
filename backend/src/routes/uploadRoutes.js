const express = require('express');

const router = express.Router();

const upload = require('../middleware/upload');
const { uploadImage } = require('../controllers/uploadController');
const { protect, requireAdmin } = require('../middleware/auth');

router.post(
  '/',
  protect,
  requireAdmin,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        return upload.single('image')(req, res, (err2) => {
          if (err2) {
            return res.status(400).json({
              error: err2.message || 'File upload failed'
            });
          }

          next();
        });
      }

      next();
    });
  },
  uploadImage
);

module.exports = router;