// backend/src/queue/workers/order.worker.js
/**
 * Order Worker - Processes Order-Related Jobs
 * 
 * Handles:
 * - Payment processing simulation
 * - Partner notifications
 * - Order analytics
 */

const { Worker } = require('bullmq');
const { workerConfigs, JOB_TYPES, createQueueEventHandlers } = require('../config');
const emailService = require('../../services/email.service');
const logger = require('../../services/logger.service');

/**
 * Order job processor
 */
const processOrderJob = async (job) => {
  logger.queue('order', job.id, 'processing', {
    jobName: job.name,
    orderId: job.data?.orderId,
  });
  
  try {
    switch (job.name) {
      case JOB_TYPES.PROCESS_ORDER_PAYMENT:
        // Simulate payment processing
        await processPayment(job.data);
        break;
      
      case JOB_TYPES.NOTIFY_PARTNER_NEW_ORDER:
        // Notify food partner about new order
        await notifyPartner(job.data);
        break;
      
      default:
        throw new Error(`Unknown order job type: ${job.name}`);
    }
    
    return { success: true, jobId: job.id, type: job.name };
  } catch (error) {
    logger.error(`Order job failed`, {
      jobId: job.id,
      jobName: job.name,
      error: error.message,
      stack: error.stack,
      orderId: job.data?.orderId,
    });
    throw error;
  }
};

/**
 * Simulate payment processing
 * In production, this would integrate with Stripe/PayPal/etc.
 */
const processPayment = async (data) => {
  const { orderId, amount, userId } = data;
  
  logger.business(`Processing payment for order`, { orderId, amount, userId });
  
  // Simulate external API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // In production:
  // - Call payment gateway API
  // - Handle webhooks
  // - Update order status
  // - Send confirmation
  
  logger.info(`Payment processed successfully`, { orderId, amount, transactionId: `txn_${Date.now()}` });
  
  return { success: true, transactionId: `txn_${Date.now()}` };
};

/**
 * Notify food partner about new order
 */
const notifyPartner = async (data) => {
  const { partnerEmail, partnerName, orderDetails } = data;
  
  logger.info(`Notifying partner about new order`, { partnerName, partnerEmail, orderId: orderDetails?.orderId });
  
  // In production, send email or push notification to partner
  if (partnerEmail) {
    // For now, just log (could send email via emailService)
    logger.debug(`Partner notification would be sent`, { partnerEmail, orderId: orderDetails?.orderId });
  }
  
  return { success: true };
};

/**
 * Create and start the order worker
 */
const createOrderWorker = () => {
  const worker = new Worker('order', processOrderJob, workerConfigs.order);
  
  // Attach event handlers
  const handlers = createQueueEventHandlers('order');
  
  worker.on('completed', (job, result) => {
    handlers.onCompleted(job, result);
  });
  
  worker.on('failed', (job, error) => {
    handlers.onFailed(job, error);
  });
  
  worker.on('error', (error) => {
    handlers.onError(error);
  });
  
  logger.info('Order worker started');
  
  return worker;
};

// Auto-start if this file is run directly
if (require.main === module) {
  createOrderWorker();
  
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing order worker');
    process.exit(0);
  });
}

module.exports = { createOrderWorker, processOrderJob };
