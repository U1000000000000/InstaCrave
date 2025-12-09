const express = require('express');
const { createOrder, getUserOrders, getPartnerOrders, updateOrderStatus } = require('../controllers/order.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', authMiddleware.authUserMiddleware, createOrder);
router.get('/', authMiddleware.authUserMiddleware, getUserOrders);
router.get('/partner', authMiddleware.authFoodPartnerMiddleware, getPartnerOrders);
router.put('/:id/status', authMiddleware.authFoodPartnerMiddleware, updateOrderStatus);

module.exports = router;