// backend/src/queue/config.js
/**
 * Queue Configuration (BullMQ)
 * 
 * Configures Redis-backed job queues for background processing.
 * 
 * Features:
 * - Redis connection with retry logic
 * - Exponential backoff for failed jobs
 * - Priority queue support
 * - Rate limiting per queue
 * - Job persistence and monitoring
 */

const Redis = require('ioredis');
const logger = require('../services/logger.service');

/**
 * Redis connection configuration
 * Reuses the same Redis instance as caching for cost efficiency
 */
let redisConnection = null;

// During Jest/unit tests, avoid opening external Redis connections.
if (process.env.NODE_ENV !== 'test') {
  redisConnection = new Redis(process.env.REDIS_URL || {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // BullMQ requirement: null for blocking commands
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    connectTimeout: 10000,
    lazyConnect: false,
    keepAlive: 30000,
    ...(process.env.REDIS_TLS === 'true' && {
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    })
  });

  redisConnection.on('connect', () => {
    logger.info('Queue Redis connection established');
  });

  redisConnection.on('error', (err) => {
    logger.error('Queue Redis connection error', { error: err.message, stack: err.stack });
  });
}

/**
 * Default queue options applied to all queues
 */
const defaultQueueOptions = {
  connection: redisConnection || undefined,
  
  // Default job options
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential', // Exponential backoff: 1s, 2s, 4s
      delay: 1000, // Initial delay: 1 second
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      count: 5000, // Keep max 5000 failed jobs for debugging
    },
  },
  
  // Job processing settings
  settings: {
    lockDuration: 30000, // Job lock expires after 30s (prevent stuck jobs)
    stalledInterval: 5000, // Check for stalled jobs every 5s
    maxStalledCount: 2, // Max times a job can be marked as stalled before failing
  },
};

/**
 * Worker options for job processors
 */
const defaultWorkerOptions = {
  connection: redisConnection || undefined,
  
  // Concurrency: How many jobs to process simultaneously per worker
  // Tune based on job type:
  // - I/O bound (emails, API calls): higher concurrency (10-50)
  // - CPU bound (image processing): lower concurrency (1-5)  // TODO: Concurrency set to 5 arbitrarily - should benchmark to find optimal value
  // Tried 10 but email service started rate limiting us  concurrency: 5,
  
  // Rate limiting to prevent overwhelming external services
  limiter: {
    max: 100, // Max 100 jobs
    duration: 60000, // Per 60 seconds (1 minute)
  },
  
  // Automatic extension of job locks for long-running jobs
  autorun: true,
  
  // Remove dependencies on complete
  removeOnComplete: { count: 0 },
  removeOnFail: { count: 0 },
};

/**
 * Priority levels for jobs
 * Lower number = higher priority
 */
const PRIORITY = {
  CRITICAL: 1,  // Payment confirmations, security alerts
  HIGH: 2,      // Order notifications, welcome emails
  MEDIUM: 3,    // User activity tracking, cache warming
  LOW: 4,       // Reports, background tasks
};

/**
 * Queue-specific configurations
 * Allows customization per queue type
 */
const queueConfigs = {
  // Email queue: High priority, aggressive retries
  email: {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      priority: PRIORITY.HIGH,
      attempts: 5, // Emails are critical - retry 5 times
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s, 16s, 32s
      },
    },
  },
  
  // Order processing queue: Critical priority
  order: {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      priority: PRIORITY.CRITICAL,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  },
  
  // Analytics queue: Low priority, can fail gracefully
  analytics: {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      priority: PRIORITY.LOW,
      attempts: 2, // Don't retry analytics too much
      removeOnComplete: {
        age: 3600, // Clean up after 1 hour
        count: 500,
      },
    },
  },
  
  // Scheduled jobs queue: For cron-like tasks
  scheduled: {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      priority: PRIORITY.LOW,
      attempts: 2,
    },
  },
};

/**
 * Worker-specific configurations
 */
const workerConfigs = {
  email: {
    ...defaultWorkerOptions,
    concurrency: 10, // I/O bound - can handle many concurrent emails
    limiter: {
      max: 50, // Max 50 emails
      duration: 60000, // Per minute (respect email provider limits)
    },
  },
  
  order: {
    ...defaultWorkerOptions,
    concurrency: 5, // Moderate concurrency for order processing
  },
  
  analytics: {
    ...defaultWorkerOptions,
    concurrency: 3, // Lower concurrency for heavy queries
  },
  
  scheduled: {
    ...defaultWorkerOptions,
    concurrency: 1, // Sequential processing for scheduled tasks
  },
};

/**
 * Job types enumeration
 * Centralized definition of all job types in the system
 */
const JOB_TYPES = {
  // Email jobs
  SEND_WELCOME_EMAIL: 'email:welcome',
  SEND_ORDER_CONFIRMATION: 'email:order-confirmation',
  SEND_ORDER_STATUS_UPDATE: 'email:order-status',
  
  // Order processing jobs
  PROCESS_ORDER_PAYMENT: 'order:process-payment',
  NOTIFY_PARTNER_NEW_ORDER: 'order:notify-partner',
  
  // Analytics jobs
  TRACK_USER_ACTION: 'analytics:track-action',
  
  // Scheduled jobs
  CLEANUP_EXPIRED_SESSIONS: 'scheduled:cleanup-sessions',
  WARM_CACHE: 'scheduled:warm-cache',
  SEND_DAILY_DIGEST: 'scheduled:daily-digest',
};

/**
 * Queue event handlers for monitoring and logging
 */
const createQueueEventHandlers = (queueName) => ({
  // Job lifecycle events
  onCompleted: (job, result) => {
    logger.queue(queueName, job.id, 'completed', {
      jobName: job.name,
      duration: job.finishedOn - job.processedOn,
    });
  },
  
  onFailed: (job, error) => {
    logger.queue(queueName, job?.id, 'failed', {
      jobName: job?.name,
      error: error.message,
      stack: error.stack,
      attempts: job?.attemptsMade,
      maxAttempts: job?.opts?.attempts,
      data: job?.data,
    });
  },
  
  onProgress: (job, progress) => {
    logger.debug(`Queue ${queueName}: Job progress`, {
      queueName,
      jobId: job.id,
      jobName: job.name,
      progress,
    });
  },
  
  onStalled: (jobId) => {
    logger.warn(`Queue ${queueName}: Job stalled`, {
      queueName,
      jobId,
    });
  },
  
  onError: (error) => {
    logger.error(`Queue ${queueName}: Queue error`, {
      queueName,
      error: error.message,
      stack: error.stack,
    });
  },
});

module.exports = {
  redisConnection,
  defaultQueueOptions,
  defaultWorkerOptions,
  queueConfigs,
  workerConfigs,
  PRIORITY,
  JOB_TYPES,
  createQueueEventHandlers,
};
