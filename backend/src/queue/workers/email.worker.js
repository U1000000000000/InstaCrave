// backend/src/queue/workers/email.worker.js
/**
 * Email Worker - Processes Email Queue Jobs
 * 
 * This worker:
 * - Processes all email-related jobs (welcome, order confirmations, etc.)
 * - Handles retries automatically via BullMQ config
 * - Logs success/failure for monitoring
 * - Reports progress for long-running jobs
 * 
 * TODO: Email retry config is too aggressive (3 attempts). Should back off exponentially
 * and maybe alert after 2nd failure instead of silently retrying
 */

const { Worker } = require('bullmq');
const { workerConfigs, JOB_TYPES, createQueueEventHandlers } = require('../config');
const emailService = require('../../services/email.service');
const logger = require('../../services/logger.service');

/**
 * Email job processor
 * Handles all email job types
 */
const processEmailJob = async (job) => {
  logger.queue('email', job.id, 'processing', {
    jobName: job.name,
    email: job.data?.email,
  });
  
  try {
    switch (job.name) {
      case JOB_TYPES.SEND_WELCOME_EMAIL:
        await emailService.sendWelcomeEmail(job.data);
        break;
      
      case JOB_TYPES.SEND_ORDER_CONFIRMATION:
        await emailService.sendOrderConfirmation(job.data);
        break;
      
      case JOB_TYPES.SEND_ORDER_STATUS_UPDATE:
        await emailService.sendOrderStatusUpdate(job.data);
        break;
      
      default:
        throw new Error(`Unknown email job type: ${job.name}`);
    }
    
    return { success: true, jobId: job.id, type: job.name };
  } catch (error) {
    logger.error(`Email job failed`, {
      jobId: job.id,
      jobName: job.name,
      error: error.message,
      stack: error.stack,
      email: job.data?.email,
    });
    throw error; // BullMQ will handle retries
  }
};

/**
 * Create and start the email worker
 */
const createEmailWorker = () => {
  const worker = new Worker('email', processEmailJob, workerConfigs.email);
  
  // Attach event handlers
  const handlers = createQueueEventHandlers('email');
  
  worker.on('completed', (job, result) => {
    handlers.onCompleted(job, result);
  });
  
  worker.on('failed', (job, error) => {
    handlers.onFailed(job, error);
  });
  
  worker.on('progress', (job, progress) => {
    handlers.onProgress(job, progress);
  });
  
  worker.on('error', (error) => {
    handlers.onError(error);
  });
  
  logger.info('Email worker started');
  
  return worker;
};

// Auto-start if this file is run directly
if (require.main === module) {
  createEmailWorker();
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing email worker');
    process.exit(0);
  });
}

module.exports = { createEmailWorker, processEmailJob };
