const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      default: ''
    },
    productName: {
      type: String,
      required: [true, 'Product name is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative']
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Delivery address is required'],
      trim: true
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    paymentMethod: {
      type: String,
      default: 'COD'
    },
    status: {
      type: String,
      enum: ['NEW', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
      default: 'NEW'
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    distanceKm: {
      type: Number,
      default: 0
    },
    customerLocation: {
      lat: { type: Number },
      lng: { type: Number }
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      default: 0
    },
    items: {
      type: [orderItemSchema],
      required: true,
      default: []
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model('Order', orderSchema);
