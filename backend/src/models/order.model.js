const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    foodName: {
      type: String,
      required: true,
    },
    foodPartnerName: {
      type: String,
      required: true,
    },
      foodPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'foodpartner',
        required: true,
      },
  userName: {
    type: String,
    required: true,
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
  },
  deliveryAddress: {
    type: String,
    required: true,
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