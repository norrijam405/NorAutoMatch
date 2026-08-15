import { Pool } from 'pg';
import { productQueue } from './queue';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Lower connection footprint needed for daemon sweeps
});

const POLL_INTERVAL_MS = parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '1000');
const MAX_ATTEMPTS = parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '5');

async function processOutboxQueue(): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Select oldest pending task, lock row for processing, and bypass any rows already locked (FOR UPDATE SKIP LOCKED)
    const selectQuery = `
      SELECT id, event_type, payload
      FROM outbox_tasks
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
    `;

    const result = await client.query(selectQuery);

    if (result.rows.length === 0) {
      await client.query('COMMIT');
      return false; // Queue drained — caller backs off to the polling interval
    }

    const task = result.rows[0];

    // Mark task as 'processing' instantly to claim exclusive processing ownership
    await client.query(
      "UPDATE outbox_tasks SET status = 'processing', attempts = attempts + 1 WHERE id = $1",
      [task.id],
    );

    try {
      // Relay the event payload into the Redis-backed distribution queue.
      // The outbox task UUID doubles as the BullMQ jobId, giving us broker-level
      // deduplication: if this row is ever swept twice (e.g. after a crash between
      // queue.add and COMMIT), Redis silently ignores the duplicate enqueue.
      await productQueue.add(task.event_type, task.payload, {
        jobId: task.id,
      });

      // Successfully handed off to Redis — permanently mark as completed.
      await client.query(
        "UPDATE outbox_tasks SET status = 'completed', error_log = NULL WHERE id = $1",
        [task.id],
      );
    } catch (relayError) {
      // Redis hand-off failed: record the fault and return the task to the pool.
      // Tasks that exhaust MAX_ATTEMPTS are parked as 'failed' for operator review.
      const message = relayError instanceof Error ? relayError.message : String(relayError);
      await client.query(
        `UPDATE outbox_tasks
         SET status = CASE WHEN attempts >= $2 THEN 'failed'::task_status ELSE 'pending'::task_status END,
             error_log = $3
         WHERE id = $1`,
        [task.id, MAX_ATTEMPTS, message],
      );
      console.error(`[relay] Redis hand-off fault for task ${task.id}:`, message);
    }

    await client.query('COMMIT');
    return true; // A row was processed — sweep again immediately without sleeping
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[relay] Outbox sweep transaction fault:', error);
    return false;
  } finally {
    client.release();
  }
}

async function runDaemon(): Promise<void> {
  console.log(`[relay] Outbox daemon relay online (poll interval ${POLL_INTERVAL_MS}ms)`);
  // Continuous sweep loop: drain aggressively while work exists, back off when idle.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const processed = await processOutboxQueue();
    if (!processed) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

// Graceful shutdown: let in-flight transactions settle before the pool closes.
async function shutdown(signal: string): Promise<void> {
  console.log(`[relay] ${signal} received — shutting down outbox daemon`);
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

runDaemon().catch((error) => {
  console.error('[relay] Fatal daemon fault:', error);
  process.exit(1);
});
