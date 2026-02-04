// start server
require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/db/db');
const logger = require('./src/services/logger.service');
const { startAllWorkers, stopAllWorkers } = require('./src/queue/workers/index');
const { addScheduledJob, JOB_TYPES, closeAllQueues } = require('./src/queue/index');
const { initializeSocketServer, shutdownSocketServer } = require('./src/services/socket.service');
let server;

// Setup recurring scheduled jobs
// These jobs will run automatically on a schedule
const setupScheduledJobs = async () => {
  try {
    // Cleanup expired sessions daily at 2 AM
    await addScheduledJob(JOB_TYPES.CLEANUP_EXPIRED_SESSIONS, {}, {
      pattern: '0 2 * * *', // Cron: Every day at 2 AM
    });
    logger.info('Scheduled job configured', { jobType: 'Session cleanup', schedule: 'daily at 2 AM' });

    // Warm cache every hour during peak hours (9 AM - 9 PM)
    await addScheduledJob(JOB_TYPES.WARM_CACHE, {}, {
      pattern: '0 9-21 * * *', // Cron: Every hour from 9 AM to 9 PM
    });
    logger.info('Scheduled job configured', { jobType: 'Cache warming', schedule: 'hourly 9 AM - 9 PM' });

    logger.info('All scheduled jobs configured');
  } catch (error) {
    logger.error('Failed to setup scheduled jobs', { error: error.message, stack: error.stack });
  }
};

const startServer = async () => {
  await connectDB();

  // Start background job workers
  logger.info('Starting background job workers');
  startAllWorkers();

  // Setup scheduled jobs after a short delay to ensure workers are ready
  setTimeout(setupScheduledJobs, 2000);

  server = app.listen(3000, async () => {
    logger.info('Server started successfully', {
      port: 3000,
      queueDashboard: 'http://localhost:3000/admin/queues',
      apiDocs: 'http://localhost:3000/api/v1/docs',
    });

    // Initialize Socket.IO for real-time communication
    try {
      await initializeSocketServer(server);
      logger.info('Real-time WebSocket service initialized');
    } catch (error) {
      logger.error('Failed to initialize WebSocket service', { error: error.message });
    }
  });
};

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`Graceful shutdown initiated`, { signal });
  
  // Shutdown WebSocket connections
  await shutdownSocketServer();
  
  // Stop accepting new connections
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }
  
  // Stop all workers
  await stopAllWorkers();
  
  // Close queue connections
  await closeAllQueues();
  
  logger.info('Graceful shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer().catch((error) => {
  logger.error('Fatal startup error', { error: error.message, stack: error.stack });
  process.exit(1);
});