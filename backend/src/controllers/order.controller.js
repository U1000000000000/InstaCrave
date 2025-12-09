const orderModel = require('../models/order.model');
const foodModel = require('../models/food.model');
const userModel = require('../models/user.model');

async function createOrder(req, res) {
  const { foodId, quantity, deliveryAddress } = req.body;
  const userId = req.user.id; // From auth middleware

  try {
    const food = await foodModel.findById(foodId).populate('foodPartner');
    if (!food || !food.isOrderable) {
      return res.status(400).json({ message: 'Food item is not available for ordering' });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const totalPrice = food.price * quantity;

    // Mock payment: Always succeed
    const order = await orderModel.create({
      user: userId,
      userName: user.fullName,
      food: foodId,
      foodName: food.name,
      foodPartner: food.foodPartner._id,
      foodPartnerName: food.foodPartner.name,
      quantity,
      totalPrice,
      deliveryAddress,
      status: 'pending',
    });

    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Error creating order', error });
  }
}

async function getUserOrders(req, res) {
  const userId = req.user.id;

  try {
    const orders = await orderModel.find({ user: userId })
      .populate('food')
      .populate('foodPartner');
    // Map orders to include foodPartnerId, foodId, and foodPartner details for frontend
    const ordersWithDetails = orders.map(order => ({
      ...order.toObject(),
      foodPartnerId: order.foodPartner?._id?.toString() || order.foodPartner?.toString(),
      foodId: order.food?._id?.toString() || order.food?.toString(),
      foodPartnerProfileImage: order.foodPartner?.profileImage || '',
      foodPartnerAddress: order.foodPartner?.address || '',
    }));
    res.json({ orders: ordersWithDetails });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error });
  }
}

async function getPartnerOrders(req, res) {
  const partnerId = req.foodPartner.id;

  try {
    const orders = await orderModel.find()
      .populate({
        path: 'food',
        match: { foodPartner: partnerId },
      })
      .exec();
    const filteredOrders = orders.filter(order => order.food);
    res.json({ orders: filteredOrders });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching partner orders', error });
  }
}

async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const partnerId = req.foodPartner.id;

  try {
    const order = await orderModel.findById(id).populate('food');
    if (!order || order.food.foodPartner.toString() !== partnerId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Prevent changing status of orders in final states
    const FINAL_STATES = ['delivered', 'cancelled'];
    if (FINAL_STATES.includes(order.status)) {
      return res.status(400).json({ 
        message: `Cannot change status of ${order.status} orders`,
        currentStatus: order.status 
      });
    }

    order.status = status;
    await order.save();
    res.json({ message: 'Order status updated', order });
  } catch (error) {
    res.status(500).json({ message: 'Error updating status', error });
  }
}

module.exports = {
  createOrder,
  getUserOrders,
  getPartnerOrders,
  updateOrderStatus,
};