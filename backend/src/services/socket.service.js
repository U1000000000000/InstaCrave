/**
 * WebSocket Service (Socket.IO)
 * 
 * Features:
 * - JWT authentication for connections
 * - Room-based broadcasting (user rooms, partner rooms)
 * - Redis adapter for multi-instance deployments
 * 
 * Events:
 * - order:created - New order notification to food partner
 * - order:statusUpdated - Order status change to user
 */

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
const logger = require('./logger.service');
const userModel = require('../models/user.model');
const foodPartnerModel = require('../models/foodpartner.model');

let io = null;
let pubClient = null;
let subClient = null;

/**
 * Initialize Socket.IO server with Redis adapter for horizontal scaling
 * 
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Socket.IO server instance
 */
const initializeSocketServer = async (httpServer) => {
  try {
    // Create Socket.IO server with CORS configuration
    io = new Server(httpServer, {
      cors: {
        origin: [process.env.FRONTEND_URL || 'http://localhost:5173', process.env.FRONTEND_URL_LOCAL || 'http://localhost:5173'],
        credentials: true,
        methods: ['GET', 'POST'],
      },
      allowEIO3: true, // Enable compatibility with Engine.IO v3 clients
      pingTimeout: 60000, // 60 seconds
      pingInterval: 25000, // 25 seconds
      connectTimeout: 45000, // 45 seconds
      transports: ['websocket', 'polling'], // WebSocket preferred, polling fallback
    });

    // Setup Redis adapter for horizontal scaling (optional but recommended for production)
    if (process.env.REDIS_URL) {
      try {
        pubClient = createClient({ url: process.env.REDIS_URL });
        subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);
        
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.IO Redis adapter initialized for horizontal scaling', {
          redisUrl: process.env.REDIS_URL,
        });
      } catch (redisError) {
        logger.warn('Redis adapter initialization failed, running in single-instance mode', {
          error: redisError.message,
        });
      }
    } else {
      logger.info('Socket.IO running in single-instance mode (no Redis configured)');
    }

    // Authentication middleware - verify JWT token from cookies
    io.use(async (socket, next) => {
      try {
        // Extract token from cookies (sent automatically with withCredentials: true)
        const cookies = socket.handshake.headers.cookie;
        let token = null;
        
        if (cookies) {
          // Parse cookies manually (simple cookie parser)
          const cookieArray = cookies.split(';').map(c => c.trim());
          const accessTokenCookie = cookieArray.find(c => c.startsWith('accessToken='));
          if (accessTokenCookie) {
            token = accessTokenCookie.split('=')[1];
          }
        }
        
        // Fallback: check auth.token or Authorization header (for non-browser clients)
        if (!token) {
          token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        }
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token using ACCESS_TOKEN_SECRET
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        // Only id is present in payload
        const userId = decoded.id;
        // Try to find user
        let user = await userModel.findById(userId).select('_id');
        if (user) {
          socket.userId = user._id.toString();
          socket.userType = 'user';
        } else {
          // Try food partner
          const foodPartner = await foodPartnerModel.findById(userId).select('_id');
          if (foodPartner) {
            socket.userId = foodPartner._id.toString();
            socket.userType = 'food-partner';
          } else {
            return next(new Error('User not found'));
          }
        }
        logger.debug('Socket authenticated', {
          socketId: socket.id,
          userId: socket.userId,
          userType: socket.userType,
        });
        next();
      } catch (error) {
        logger.warn('Socket authentication failed', {
          error: error.message,
          socketId: socket.id,
        });
        next(new Error('Invalid authentication token'));
      }
    });

    // Connection event handler
    io.on('connection', (socket) => {
      logger.info('Client connected', {
        socketId: socket.id,
        userId: socket.userId,
        userType: socket.userType,
        transport: socket.conn.transport.name,
      });

      // Join user-specific room for targeted notifications
      const roomName = `${socket.userType}:${socket.userId}`;
      socket.join(roomName);
      
      logger.debug('Socket joined room', {
        socketId: socket.id,
        room: roomName,
      });

      // Emit connection confirmation
      socket.emit('connected', {
        message: 'Connected to real-time service',
        timestamp: new Date().toISOString(),
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info('Client disconnected', {
          socketId: socket.id,
          userId: socket.userId,
          userType: socket.userType,
          reason,
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('Socket error', {
          socketId: socket.id,
          userId: socket.userId,
          error: error.message,
        });
      });

      // Heartbeat/ping for connection health monitoring
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
    });

    logger.info('Socket.IO server initialized successfully');
    return io;
  } catch (error) {
    logger.error('Failed to initialize Socket.IO server', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Emit order created event to food partner
 * 
 * @param {Object} order - Order object with populated fields
 */
const emitOrderCreated = (order) => {
  if (!io) {
    logger.warn('Socket.IO not initialized, cannot emit order:created event');
    return;
  }

  try {
    const partnerId = order.foodPartner?._id?.toString() 
      || order.foodPartner?.toString() 
      || order.restaurant?._id?.toString() 
      || order.restaurant?.toString();
    
    if (!partnerId) {
      logger.warn('Cannot emit order:created - no partner ID found', { orderId: order._id });
      return;
    }

    const roomName = `food-partner:${partnerId}`;
    
    // Build order data based on order type (single-item vs cart-based)
    const orderData = {
      orderId: order._id,
      userId: order.user,
      status: order.status,
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      timestamp: new Date().toISOString(),
    };

    // Add order-specific fields
    if (order.items && order.items.length > 0) {
      // Cart-based order
      orderData.items = order.items.map(item => ({
        foodId: item.food?._id || item.food,
        foodName: item.foodName,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      }));
      orderData.total = order.total;
      orderData.subtotal = order.subtotal;
      orderData.isCartOrder = true;
    } else {
      // Single-item order
      orderData.foodId = order.food?._id || order.food;
      orderData.foodName = order.food?.name || order.foodName;
      orderData.quantity = order.quantity;
      orderData.totalPrice = order.totalPrice;
      orderData.isCartOrder = false;
    }
    
    // Emit to food partner's room
    io.to(roomName).emit('order:created', orderData);

    logger.info('Emitted order:created event', {
      orderId: order._id,
      partnerId,
      room: roomName,
      isCartOrder: orderData.isCartOrder,
    });
  } catch (error) {
    logger.error('Failed to emit order:created event', {
      error: error.message,
      orderId: order._id,
    });
  }
};

/**
 * Emit order status updated event to user
 * 
 * @param {Object} order - Order object with updated status
 * @param {String} oldStatus - Previous order status
 */
const emitOrderStatusUpdated = (order, oldStatus) => {
  if (!io) {
    logger.warn('Socket.IO not initialized, cannot emit order:statusUpdated event');
    return;
  }

  try {
    const userId = order.user?._id?.toString() || order.user?.toString();
    
    if (!userId) {
      logger.warn('Cannot emit order:statusUpdated - no user ID found', { orderId: order._id });
      return;
    }

    const roomName = `user:${userId}`;
    
    // Emit to user's room
    io.to(roomName).emit('order:statusUpdated', {
      orderId: order._id,
      foodId: order.food?._id || order.food,
      foodName: order.food?.name,
      oldStatus,
      newStatus: order.status,
      quantity: order.quantity,
      totalPrice: order.totalPrice,
      deliveryAddress: order.deliveryAddress,
      updatedAt: order.updatedAt,
      timestamp: new Date().toISOString(),
    });

    logger.info('Emitted order:statusUpdated event', {
      orderId: order._id,
      userId,
      room: roomName,
      oldStatus,
      newStatus: order.status,
    });
  } catch (error) {
    logger.error('Failed to emit order:statusUpdated event', {
      error: error.message,
      orderId: order._id,
    });
  }
};

/**
 * Get Socket.IO server instance
 * 
 * @returns {Server|null} Socket.IO server instance
 */
const getIO = () => io;

/**
 * Graceful shutdown - close all connections and Redis clients
 */
const shutdownSocketServer = async () => {
  try {
    if (io) {
      // Close all socket connections
      io.disconnectSockets(true);
      io.close();
      logger.info('Socket.IO server closed');
    }

    // Close Redis clients
    if (pubClient) {
      await pubClient.quit();
      logger.info('Redis pub client closed');
    }
    if (subClient) {
      await subClient.quit();
      logger.info('Redis sub client closed');
    }
  } catch (error) {
    logger.error('Error during Socket.IO shutdown', {
      error: error.message,
    });
  }
};

module.exports = {
  initializeSocketServer,
  emitOrderCreated,
  emitOrderStatusUpdated,
  getIO,
  shutdownSocketServer,
};
