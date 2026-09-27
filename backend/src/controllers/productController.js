const Product = require('../models/Product');
const { getIO } = require('../utils/socket');

/**
 * @route   GET /api/products
 * @desc    Get all products
 * @access  Public
 */
async function getProducts(req, res) {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Private/Admin
 */
async function createProduct(req, res) {
  try {
    const {
      name,
      description,
      price,
      category,
      imageUrl,
      available
    } = req.body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({
        error: 'Name and price are required'
      });
    }

    const product = await Product.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      price: Number(price),
      category: category ? category.trim() : 'General',
      imageUrl: imageUrl || '',
      available:
        available !== undefined
          ? Boolean(available)
          : true
    });

    // Broadcast normalized product data to all connected clients
    try {
      const io = getIO();

      if (io) {
        io.emit('new_product', product.toJSON());
      }
    } catch (socketErr) {
      console.warn(
        'Socket emit error on new product:',
        socketErr.message
      );
    }

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);

    res.status(500).json({
      error:
        error.message || 'Failed to create product'
    });
  }
}

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product
 * @access  Private/Admin
 */
async function updateProduct(req, res) {
  try {
    const { id } = req.params;

    const {
      name,
      description,
      price,
      category,
      imageUrl,
      available
    } = req.body;

    const updateData = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    if (price !== undefined) {
      updateData.price = Number(price);
    }

    if (category !== undefined) {
      updateData.category = category.trim();
    }

    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl;
    }

    if (available !== undefined) {
      updateData.available = Boolean(available);
    }

    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!product) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);

    res.status(500).json({
      error:
        error.message || 'Failed to update product'
    });
  }
}

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product
 * @access  Private/Admin
 */
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    const product =
      await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    res.json({
      message: 'Product deleted successfully',
      id
    });
  } catch (error) {
    console.error('Delete product error:', error);

    res.status(500).json({
      error:
        error.message || 'Failed to delete product'
    });
  }
}

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
};