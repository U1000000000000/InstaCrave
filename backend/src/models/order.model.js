const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  foodName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  foodPartnerName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  foodPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'foodpartner',
    required: true,
  },
  userName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  food: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'food',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryAddress: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

const orderModel = mongoose.model('order', orderSchema);

module.exports = orderModel;