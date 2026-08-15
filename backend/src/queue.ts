import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Initialize highly resilient, isolated Redis connection instances
export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null, // Critical requirement for BullMQ durability
});

// Define the core distribution queue configuration
export const productQueue = new Queue('ProductSyncQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5, // Automatically retry failed jobs up to 5 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Wait 2s, 4s, 8s, 16s... preventing systemic thundering herd issues
    },
    removeOnComplete: { age: 3600 }, // Auto-prune memory footprint logs after 1 hour
    removeOnFail: { age: 86400 }, // Keep failure traces for 24 hours of debugging lookup
  },
});
