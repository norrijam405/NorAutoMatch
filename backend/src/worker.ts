import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

// Dedicated connection instances: BullMQ requires blocking-capable connections
// isolated from the idempotency lock layer's request/response connection.
const workerConnection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null, // Critical requirement for BullMQ durability
});

const lockConnection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

const IDEMPOTENCY_TTL_SECONDS = parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '86400');
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5');

/**
 * Idempotency Lock Layer.
 *
 * Acquires a distributed lock via a single atomic Redis command:
 *   SET key value NX EX ttl
 *
 * NX — only set if the key does not already exist (atomic test-and-set)
 * EX — expire automatically so crashed workers cannot poison the keyspace forever
 *
 * Returns true when this worker owns exclusive processing rights for the event.
 */
async function acquireIdempotencyLock(eventId: string): Promise<boolean> {
  const key = `idempotency:product-sync:${eventId}`;
  const acquired = await lockConnection.set(key, '1', 'EX', IDEMPOTENCY_TTL_SECONDS, 'NX');
  return acquired === 'OK';
}

async function releaseIdempotencyLock(eventId: string): Promise<void> {
  await lockConnection.del(`idempotency:product-sync:${eventId}`);
}

/**
 * Core background sync logic. Replace the body with real side effects:
 * search-index updates, webhook fan-out, cache warming, ERP sync, etc.
 */
async function executeProductSync(payload: { id: string; title: string; price: string }): Promise<void> {
  console.log(`[worker] Executing core sync for product ${payload.id} ("${payload.title}" @ ${payload.price})`);
  // Simulated downstream side effect latency
  await new Promise((resolve) => setTimeout(resolve, 250));
  console.log(`[worker] Sync complete for product ${payload.id}`);
}

const worker = new Worker(
  'ProductSyncQueue',
  async (job: Job) => {
    const payload = job.data;
    const eventId = payload?.id ?? job.id;

    // 1. Check the Idempotency Lock Layer via atomic SET NX EX
    const lockAcquired = await acquireIdempotencyLock(String(eventId));

    if (!lockAcquired) {
      // 2. Abort duplicates safely — another worker already owns (or completed) this event.
      console.warn(`[worker] Duplicate detected for event ${eventId} — aborting safely.`);
      return { skipped: true, reason: 'duplicate-event' };
    }

    try {
      // 3. Execute core background sync logic under exclusive ownership.
      await executeProductSync(payload);
      return { skipped: false };
    } catch (error) {
      // Release the lock on failure so BullMQ's exponential backoff retry
      // (configured in queue.ts) can legitimately re-attempt this event.
      await releaseIdempotencyLock(String(eventId));
      throw error;
    }
  },
  {
    connection: workerConnection,
    concurrency: WORKER_CONCURRENCY,
  },
);

worker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`[worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, error.message);
});

console.log(`[worker] BullMQ worker pool online (concurrency ${WORKER_CONCURRENCY})`);

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] ${signal} received — draining worker pool`);
  await worker.close();
  await workerConnection.quit();
  await lockConnection.quit();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
