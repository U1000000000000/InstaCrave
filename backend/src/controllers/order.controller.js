const orderModel = require('../models/order.model');
const foodModel = require('../models/food.model');
const userModel = require('../models/user.model');

const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const responseUtil = require("../utils/response");

const sanitizeHtml = require('sanitize-html');

const createOrder = catchAsync(async (req, res) => {
  const { foodId, quantity, deliveryAddress } = req.body;
  const userId = req.user.id; // From auth middleware
  const food = await foodModel.findById(foodId).populate('foodPartner');
  if (!food || !food.isOrderable) throw new AppError('Food item is not available for ordering', 400);
  const user = await userModel.findById(userId);
  if (!user) throw new AppError('User not found', 400);
  const totalPrice = food.price * quantity;
  const cleanAddress = sanitizeHtml(deliveryAddress, { allowedTags: [], allowedAttributes: {} });
  const order = await orderModel.create({
    user: userId,
    userName: user.fullName,
    food: foodId,
    foodName: food.name,
    foodPartner: food.foodPartner._id,
    foodPartnerName: food.foodPartner.name,
    quantity,
    totalPrice,
    deliveryAddress: cleanAddress,
    status: 'pending',
  });
  responseUtil.sendItemResponse(res, {
    data: order,
    message: 'Order placed successfully',
  });
});


const getUserOrders = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const orders = await orderModel.find({ user: userId })
    .populate('food')
    .populate('foodPartner');
  const ordersWithDetails = orders.map(order => ({
    ...order.toObject(),
    foodPartnerId: order.foodPartner?._id?.toString() || order.foodPartner?.toString(),
    foodId: order.food?._id?.toString() || order.food?.toString(),
    foodPartnerProfileImage: order.foodPartner?.profileImage || '',
    foodPartnerAddress: order.foodPartner?.address || '',
  }));
  responseUtil.sendListResponse(res, {
    data: ordersWithDetails,
    message: 'User orders fetched successfully',
    // Optionally add pagination, filters, sort if implemented
  });
});


const getPartnerOrders = catchAsync(async (req, res) => {
  const partnerId = req.foodPartner.id;
  const orders = await orderModel.find()
    .populate({
      path: 'food',
      match: { foodPartner: partnerId },
    })
    .exec();
  const filteredOrders = orders.filter(order => order.food);
  responseUtil.sendListResponse(res, {
    data: filteredOrders,
    message: 'Partner orders fetched successfully',
    // Optionally add pagination, filters, sort if implemented
  });
});

const updateOrderStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const partnerId = req.foodPartner.id;
  const order = await orderModel.findById(id).populate('food');
  if (!order || order.food.foodPartner.toString() !== partnerId) {
    throw new AppError('Unauthorized', 403);
  }
  // Prevent changing status of orders in final states
  const FINAL_STATES = ['delivered', 'cancelled'];
  if (FINAL_STATES.includes(order.status)) {
    throw new AppError(`Cannot change status of ${order.status} orders`, 400, { currentStatus: order.status });
  }
  order.status = status;
  await order.save();
  responseUtil.sendItemResponse(res, {
    data: order,
    message: 'Order status updated',
  });
});

module.exports = {
  createOrder,
  getUserOrders,
  getPartnerOrders,
  updateOrderStatus,
};