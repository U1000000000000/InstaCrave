// backend/src/queue/monitoring/bull-board.setup.js
/**
 * Bull Board Setup - Queue Monitoring Dashboard
 * 
 * Provides a web UI to:
 * - View all queues and their status
 * - Monitor job progress
 * - Inspect failed jobs
 * - Retry failed jobs
 * - View job details and logs
 */

const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const logger = require('../../services/logger.service');
const { 
  emailQueue, 
  orderQueue, 
  analyticsQueue, 
  scheduledQueue 
} = require('../index');

/**
 * Create Bull Board instance
 */
const setupBullBoard = (app) => {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [
      new BullMQAdapter(emailQueue),
      new BullMQAdapter(orderQueue),
      new BullMQAdapter(analyticsQueue),
      new BullMQAdapter(scheduledQueue),
    ],
    serverAdapter: serverAdapter,
  });

  // Mount Bull Board UI
  // In production, protect this route with authentication
  app.use('/admin/queues', serverAdapter.getRouter());

  logger.info('Bull Board dashboard initialized', {
    path: '/admin/queues',
    url: 'http://localhost:3000/admin/queues',
  });
  
  return serverAdapter;
};

module.exports = { setupBullBoard };
