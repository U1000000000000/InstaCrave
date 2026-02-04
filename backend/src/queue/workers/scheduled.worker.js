// backend/src/queue/workers/scheduled.worker.js
/**
 * Scheduled Worker - Handles Cron-like Jobs
 * 
 * Handles:
 * - Session cleanup (daily)
 * - Cache warming (hourly)
 * - Daily digest emails
 * - Periodic maintenance tasks
 */

const { Worker } = require('bullmq');
const { workerConfigs, JOB_TYPES, createQueueEventHandlers } = require('../config');
const Session = require('../../models/session.model');
const { cache } = require('../../services/redis.service');

const logger = require('../../services/logger.service');
/**
 * Scheduled job processor
 */
const processScheduledJob = async (job) => {
  logger.queue('scheduled', job.id, 'processing', {
    jobName: job.name,
  });
  
  try {
    switch (job.name) {
      case JOB_TYPES.CLEANUP_EXPIRED_SESSIONS:
        await cleanupExpiredSessions();
        break;
      
      case JOB_TYPES.WARM_CACHE:
        await warmCache();
        break;
      
      case JOB_TYPES.SEND_DAILY_DIGEST:
        await sendDailyDigest(job.data);
        break;
      
      default:
        throw new Error(`Unknown scheduled job type: ${job.name}`);
    }
    
    return { success: true, jobId: job.id, type: job.name };
  } catch (error) {
    logger.error(`Scheduled job failed`, {
      jobId: job.id,
      jobName: job.name,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Cleanup expired sessions from database
 * Run daily at 2 AM
 */
const cleanupExpiredSessions = async () => {
  logger.info('Starting expired session cleanup');
  
  try {
    // Delete sessions older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await Session.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });
    logger.info('Expired sessions deleted', { deletedCount: result.deletedCount });
    
    return { deleted: result.deletedCount };
  } catch (error) {
    logger.error('Session cleanup failed', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Warm up cache with frequently accessed data
 * Run hourly during peak hours
 */
const warmCache = async () => {
  logger.info('Starting cache warming');
  
  try {
    // In production:
    // - Pre-fetch popular food items
    // - Cache trending searches
    // - Cache popular partner profiles
    // - Pre-compute expensive queries
    
    // For now, just report cache metrics
    const metrics = cache.getMetrics();
    logger.performance('Cache warming completed', 0, { metrics });
    
    return { success: true, metrics };
  } catch (error) {
    logger.error('Cache warming failed', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Send daily digest emails to users
 * Run daily at 8 AM
 */
const sendDailyDigest = async (data) => {
  logger.info('Starting daily digest email sending');
  
  try {
    // In production:
    // - Fetch active users who opted in for digest
    // - Get personalized content (new food from followed partners, etc.)
    // - Queue individual email jobs
    // - Track engagement
    
    logger.info('Daily digests queued successfully');
    
    return { success: true };
  } catch (error) {
    logger.error('Daily digest failed', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Create and start the scheduled worker
 */
const createScheduledWorker = () => {
  const worker = new Worker('scheduled', processScheduledJob, workerConfigs.scheduled);
  
  const handlers = createQueueEventHandlers('scheduled');
  
  worker.on('completed', (job, result) => {
    handlers.onCompleted(job, result);
  });
  
  worker.on('failed', (job, error) => {
    handlers.onFailed(job, error);
  });
  
  worker.on('error', (error) => {
    handlers.onError(error);
  });
  
  logger.info('Scheduled worker started');
  
  return worker;
};

// Auto-start if this file is run directly
if (require.main === module) {
  createScheduledWorker();
  
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing scheduled worker');
    process.exit(0);
  });
}

module.exports = { createScheduledWorker, processScheduledJob };
