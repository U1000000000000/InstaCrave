// backend/src/queue/index.js
/**
 * Queue Registry and Central Export
 * 
 * This file provides:
 * - Centralized access to all queues
 * - Queue initialization and lifecycle management
 * - Helper functions for adding jobs
 * - Graceful shutdown handling
 */

const { queueConfigs, JOB_TYPES } = require('./config');
const logger = require('../services/logger.service');

// In tests we avoid connecting to Redis/BullMQ. Controllers still import these helpers.
if (process.env.NODE_ENV === 'test') {
  const noopJob = async () => null;
  const noopScheduledJob = async () => null;
  const noopClose = async () => {};

  module.exports = {
    JOB_TYPES,
    queues: {},
    addEmailJob: noopJob,
    addOrderJob: noopJob,
    addAnalyticsJob: noopJob,
    addScheduledJob: noopScheduledJob,
    closeAllQueues: noopClose,
  };
} else {
  const { Queue } = require('bullmq');

/**
 * Initialize all queues
 */
const emailQueue = new Queue('email', queueConfigs.email);
const orderQueue = new Queue('order', queueConfigs.order);
const analyticsQueue = new Queue('analytics', queueConfigs.analytics);
const scheduledQueue = new Queue('scheduled', queueConfigs.scheduled);

/**
 * Queue registry for easy access
 */
const queues = {
  email: emailQueue,
  order: orderQueue,
  analytics: analyticsQueue,
  scheduled: scheduledQueue,
};

/**
 * Helper: Add job to email queue
 * @param {string} jobType - Type of email job (from JOB_TYPES)
 * @param {object} data - Job data
 * @param {object} options - Optional job options (priority, delay, etc.)
 */
const addEmailJob = async (jobType, data, options = {}) => {
  try {
    const job = await emailQueue.add(jobType, data, options);
    logger.queue('email', job.id, 'added', { jobType, data });
    return job;
  } catch (error) {
    logger.error(`Failed to add email job ${jobType}`, { error: error.message, stack: error.stack, data });
    throw error;
  }
};

/**
 * Helper: Add job to order queue
 */
const addOrderJob = async (jobType, data, options = {}) => {
  try {
    const job = await orderQueue.add(jobType, data, options);
    logger.queue('order', job.id, 'added', { jobType, data });
    return job;
  } catch (error) {
    logger.error(`Failed to add order job ${jobType}`, { error: error.message, stack: error.stack, data });
    throw error;
  }
};

/**
 * Helper: Add job to analytics queue
 */
const addAnalyticsJob = async (jobType, data, options = {}) => {
  try {
    const job = await analyticsQueue.add(jobType, data, options);
    logger.queue('analytics', job.id, 'added', { jobType, data });
    return job;
  } catch (error) {
    logger.error(`Failed to add analytics job ${jobType}`, { error: error.message, stack: error.stack, data });
    // Don't throw - analytics failures shouldn't break the app
    return null;
  }
};

/**
 * Helper: Add scheduled/recurring job
 * @param {string} jobType - Type of scheduled job
 * @param {object} data - Job data
 * @param {object} repeatOptions - Cron or repeat options
 * 
 * Example:
 * addScheduledJob('cleanup-sessions', {}, { 
 *   pattern: '0 2 * * *' // Every day at 2 AM
 * })
 */
const addScheduledJob = async (jobType, data, repeatOptions = {}) => {
  try {
    const job = await scheduledQueue.add(jobType, data, {
      repeat: repeatOptions,
    });
    logger.queue('scheduled', job.id, 'added', { jobType, repeatOptions });
    return job;
  } catch (error) {
    logger.error(`Failed to add scheduled job ${jobType}`, { error: error.message, stack: error.stack, repeatOptions });
    throw error;
  }
};

/**
 * Get queue health status
 * Returns metrics for all queues
 */
const getQueueHealth = async () => {
  const health = {};
  
  for (const [name, queue] of Object.entries(queues)) {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);
      
      health[name] = {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    } catch (error) {
      health[name] = { error: error.message };
    }
  }
  
  return health;
};

/**
 * Pause all queues (useful for maintenance)
 */
const pauseAllQueues = async () => {
  logger.info('Pausing all queues');
  await Promise.all(Object.values(queues).map(q => q.pause()));
  logger.info('All queues paused successfully');
};

/**
 * Resume all queues
 */
const resumeAllQueues = async () => {
  logger.info('Resuming all queues');
  await Promise.all(Object.values(queues).map(q => q.resume()));
  logger.info('All queues resumed successfully');
};

/**
 * Graceful shutdown: Close all queue connections
 * Call this on SIGTERM/SIGINT
 */
const closeAllQueues = async () => {
  logger.info('Closing all queue connections');
  try {
    await Promise.all(Object.values(queues).map(q => q.close()));
    logger.info('All queues closed gracefully');
  } catch (error) {
    logger.error('Error closing queues', { error: error.message, stack: error.stack });
  }
};

/**
 * Clear all jobs from a specific queue
 * WARNING: Use with caution - deletes all jobs
 */
const clearQueue = async (queueName) => {
  const queue = queues[queueName];
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }
  
  logger.warn(`Clearing queue: ${queueName}`, { queueName });
  await queue.obliterate({ force: true });
  logger.info(`Queue ${queueName} cleared successfully`, { queueName });
};

/**
 * Get failed jobs from a queue for debugging
 */
const getFailedJobs = async (queueName, limit = 10) => {
  const queue = queues[queueName];
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }
  
  const failed = await queue.getFailed(0, limit);
  return failed.map(job => ({
    id: job.id,
    name: job.name,
    data: job.data,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
  }));
};

/**
 * Retry all failed jobs in a queue
 */
const retryFailedJobs = async (queueName) => {
  const queue = queues[queueName];
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }
  
  logger.info(`Retrying failed jobs in queue: ${queueName}`);
  const failed = await queue.getFailed();
  
  let retried = 0;
  for (const job of failed) {
    await job.retry();
    retried++;
  }
  
  logger.info(`Retried failed jobs in ${queueName}`, { queueName, retriedCount: retried });
  return retried;
};

// Export everything
module.exports = {
  // Queue instances
  queues,
  emailQueue,
  orderQueue,
  analyticsQueue,
  scheduledQueue,
  
  // Helper functions
  addEmailJob,
  addOrderJob,
  addAnalyticsJob,
  addScheduledJob,
  
  // Management functions
  getQueueHealth,
  pauseAllQueues,
  resumeAllQueues,
  closeAllQueues,
  clearQueue,
  getFailedJobs,
  retryFailedJobs,
  
  // Constants
  JOB_TYPES,
};

}
