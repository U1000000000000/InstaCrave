// backend/src/queue/workers/analytics.worker.js
/**
 * Analytics Worker - Processes Analytics and Tracking Jobs
 * 
 * Handles:
 * - User action tracking
 */

const { Worker } = require('bullmq');
const { workerConfigs, JOB_TYPES, createQueueEventHandlers } = require('../config');
const logger = require('../../services/logger.service');
const analyticsService = require('../../services/analytics.service');

/**
 * Analytics job processor
 */
const processAnalyticsJob = async (job) => {
  logger.queue('analytics', job.id, 'processing', {
    jobName: job.name,
    userId: job.data?.userId,
  });
  
  try {
    switch (job.name) {
      case JOB_TYPES.TRACK_USER_ACTION:
        await trackUserAction(job.data);
        break;
      
      default:
        throw new Error(`Unknown analytics job type: ${job.name}`);
    }
    
    return { success: true, jobId: job.id, type: job.name };
  } catch (error) {
    logger.error(`Analytics job failed`, {
      jobId: job.id,
      jobName: job.name,
      error: error.message,
      stack: error.stack,
    });
    // Don't throw - analytics failures shouldn't retry aggressively
    return { success: false, error: error.message };
  }
};

/**
 * Track user action for analytics
 */
const trackUserAction = async (data) => {
  const { userId, action, metadata } = data;
  
  logger.business(`User action tracked`, { userId, action, ...metadata });
  
  // Store in analytics service (AnalyticsEvent model)
  await analyticsService.trackEvent({
    eventType: action,
    userId,
    userType: metadata?.userType || 'User',
    data: metadata || {},
  });

  
  return { success: true };
};

/**
 * Create and start the analytics worker
 */
const createAnalyticsWorker = () => {
  const worker = new Worker('analytics', processAnalyticsJob, workerConfigs.analytics);
  
  const handlers = createQueueEventHandlers('analytics');
  
  worker.on('completed', (job, result) => {
    handlers.onCompleted(job, result);
  });
  
  worker.on('failed', (job, error) => {
    handlers.onFailed(job, error);
  });
  
  worker.on('error', (error) => {
    handlers.onError(error);
  });
  
  logger.info('Analytics worker started');
  
  return worker;
};

// Auto-start if this file is run directly
if (require.main === module) {
  createAnalyticsWorker();
  
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing analytics worker');
    process.exit(0);
  });
}

module.exports = { createAnalyticsWorker, processAnalyticsJob };
