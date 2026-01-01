const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  video: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  foodPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "foodpartner",
    required: true
  },
  likeCount: {
    type: Number,
    default: 0,
    min: 0
  },
  savesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  commentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  shareCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isOrderable: {
    type: Boolean,
    default: false,
  },
  price: {
    type: Number,
    min: 0,
    required: function() { return this.isOrderable; }
  },
}, { 
    timestamps: true 
});

const foodModel = mongoose.model("food", foodSchema);

module.exports = foodModel;
