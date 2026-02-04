// backend/src/queue/workers/index.js
/**
 * Worker Manager - Starts All Workers
 * 
 * This file:
 * - Imports all worker modules
 * - Starts all workers simultaneously
 * - Handles graceful shutdown
 * - Provides health checks
 */

const { createEmailWorker } = require('./email.worker');
const { createOrderWorker } = require('./order.worker');
const { createAnalyticsWorker } = require('./analytics.worker');
const { createScheduledWorker } = require('./scheduled.worker');

const logger = require('../../services/logger.service');
// Store active workers
const activeWorkers = [];

/**
 * Start all workers
 */
const startAllWorkers = () => {
  logger.info('Starting all queue workers');
  
  try {
    // Start each worker and store reference
    activeWorkers.push(createEmailWorker());
    activeWorkers.push(createOrderWorker());
    activeWorkers.push(createAnalyticsWorker());
    activeWorkers.push(createScheduledWorker());
    
    logger.info(`All queue workers started`, { workerCount: activeWorkers.length });
    
    return activeWorkers;
  } catch (error) {
    logger.error('Failed to start workers', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Stop all workers gracefully
 */
const stopAllWorkers = async () => {
  logger.info('Stopping all workers');
  
  try {
    // Close all workers
    await Promise.all(activeWorkers.map(worker => worker.close()));
    
    logger.info('All workers stopped successfully');
  } catch (error) {
    logger.error('Error stopping workers', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Get health status of all workers
 */
const getWorkersHealth = () => {
  return activeWorkers.map(worker => ({
    name: worker.name,
    isRunning: worker.isRunning(),
    isPaused: worker.isPaused(),
  }));
};

// Auto-start if this file is run directly
if (require.main === module) {
  startAllWorkers();
  
  // Graceful shutdown handlers
  const shutdown = async (signal) => {
    logger.info(`Shutdown signal received, stopping workers`, { signal });
    await stopAllWorkers();
    process.exit(0);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  logger.info('Worker process active - Press Ctrl+C to stop');
}

module.exports = {
  startAllWorkers,
  stopAllWorkers,
  getWorkersHealth,
  activeWorkers,
};
