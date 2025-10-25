const mongoose = require("mongoose");

const foodPartnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  contactName: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  profileImage: {
    type: String,
    default: "https://ik.imagekit.io/u1000/Food%20Vector%20Icon.svg?updatedAt=1759741838210",
  },
  password: {
    type: String,
    required: true,
  },
  followCount: {
    type: Number,
    default: 0,
  },
}, { 
    timestamps: true
})

const foodPartnerModel = mongoose.model("foodpartner", foodPartnerSchema);

module.exports = foodPartnerModel;
