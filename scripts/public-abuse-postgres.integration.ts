import assert from "node:assert/strict";
import { Pool } from "pg";
import { evaluatePublicAbuse } from "../src/lib/public-abuse-control";
import { PostgresPublicAbuseCounterStore } from "../src/lib/public-abuse-postgres";

async function main() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  assert.ok(connectionString, "NORAUTO_CRM_DATABASE_URL is required for the distributed abuse integration challenge");

  const pool = new Pool({ connectionString, max: 10 });
  try {
    await pool.query("DELETE FROM public_abuse_buckets WHERE bucket_key IN ($1, $2, $3)", ["integration-public-abuse", "integration-public-abuse-stale", "integration-public-abuse-rotation"]);
    const store = new PostgresPublicAbuseCounterStore(pool);
    const now = new Date("2026-09-11T23:00:00.000Z");
    const subjectHash = "a".repeat(64);

    const concurrent = await Promise.all(
      Array.from({ length: 20 }, () => store.consume({
        bucketKey: "integration-public-abuse",
        subjectHash,
        now,
        windowSeconds: 600,
      })),
    );
    assert.deepEqual(
      concurrent.map((result) => result.count).sort((a, b) => a - b),
      Array.from({ length: 20 }, (_, index) => index + 1),
      "atomic upsert must serialize concurrent increments without lost updates",
    );

    const persisted = await pool.query<{
      bucket_key: string;
      subject_hash: string;
      request_count: number;
      window_expires_at: Date;
    }>(
      `SELECT bucket_key, subject_hash, request_count, window_expires_at
       FROM public_abuse_buckets
       WHERE bucket_key = $1 AND subject_hash = $2`,
      ["integration-public-abuse", subjectHash],
    );
    assert.equal(persisted.rowCount, 1);
    assert.equal(Number(persisted.rows[0]?.request_count), 20);
    assert.equal(persisted.rows[0]?.subject_hash.trim(), subjectHash);

    const reset = await store.consume({
      bucketKey: "integration-public-abuse",
      subjectHash,
      now: new Date(now.getTime() + 601_000),
      windowSeconds: 600,
    });
    assert.equal(reset.count, 1, "expired windows must reset atomically to one");
    assert.equal(reset.resetAt.toISOString(), new Date(now.getTime() + 1_201_000).toISOString());

    const oldHmacSecret = "public-abuse-old-hmac-secret-abcdefghijklmnopqrstuvwxyz-123456";
    const newHmacSecret = "public-abuse-new-hmac-secret-abcdefghijklmnopqrstuvwxyz-123456";
    const rotationSubject = "203.0.113.77";
    for (let count = 1; count <= 5; count += 1) {
      const beforeRotation = await evaluatePublicAbuse({
        store,
        bucketKey: "integration-public-abuse-rotation",
        networkSubject: rotationSubject,
        hmacSecret: oldHmacSecret,
        now: new Date(now.getTime() + count * 1000),
        limit: 5,
        windowSeconds: 600,
      });
      assert.equal(beforeRotation.allowed, true);
      assert.equal(beforeRotation.count, count);
    }

    const duringRotation = await evaluatePublicAbuse({
      store,
      bucketKey: "integration-public-abuse-rotation",
      networkSubject: rotationSubject,
      hmacSecret: newHmacSecret,
      previousHmacSecret: oldHmacSecret,
      now: new Date(now.getTime() + 6_000),
      limit: 5,
      windowSeconds: 600,
    });
    assert.equal(duringRotation.allowed, false, "real Postgres rollover must not grant a fresh abuse budget");
    assert.equal(duringRotation.count, 6, "the stricter old-key Postgres counter must continue governing during rollover");

    const rotationRows = await pool.query<{ request_count: number }>(
      `SELECT request_count
         FROM public_abuse_buckets
        WHERE bucket_key = $1
        ORDER BY request_count DESC`,
      ["integration-public-abuse-rotation"],
    );
    assert.equal(rotationRows.rowCount, 2, "dual-key rollover must maintain separate pseudonymous current and previous counters");
    assert.deepEqual(rotationRows.rows.map((row) => Number(row.request_count)).sort((a, b) => a - b), [1, 6]);

    await pool.query(
      `INSERT INTO public_abuse_buckets (
         bucket_key, subject_hash, window_started_at, window_expires_at, request_count, updated_at
       ) VALUES ($1, $2, $3::timestamptz, $4::timestamptz, 1, $3::timestamptz)`,
      [
        "integration-public-abuse-stale",
        "b".repeat(64),
        "2026-09-11T20:00:00.000Z",
        "2026-09-11T20:10:00.000Z",
      ],
    );

    const cleanupCutoff = "2026-09-11T22:00:00.000Z";
    const cleanup = await pool.query<{ deleted_count: number }>(
      `SELECT norautomatch_cleanup_expired_public_abuse_buckets($1::timestamptz) AS deleted_count`,
      [cleanupCutoff],
    );
    assert.equal(Number(cleanup.rows[0]?.deleted_count), 1, "explicit-cutoff cleanup must remove only stale pseudonymous buckets");
    const staleAfterCleanup = await pool.query(
      `SELECT 1 FROM public_abuse_buckets WHERE bucket_key = $1`,
      ["integration-public-abuse-stale"],
    );
    assert.equal(staleAfterCleanup.rowCount, 0, "stale pseudonymous abuse bucket must be removed by explicit-cutoff cleanup");
    const activeAfterCleanup = await pool.query(
      `SELECT request_count FROM public_abuse_buckets WHERE bucket_key = $1 AND subject_hash = $2`,
      ["integration-public-abuse", subjectHash],
    );
    assert.equal(activeAfterCleanup.rowCount, 1, "cleanup cutoff must not delete a newer active/reset abuse bucket");

    await assert.rejects(
      pool.query(`SELECT norautomatch_cleanup_expired_public_abuse_buckets(NULL::timestamptz)`),
      /PUBLIC_ABUSE_CLEANUP_CUTOFF_REQUIRED/,
    );

    const rawLeak = await pool.query(
      `SELECT 1
       FROM public_abuse_buckets
       WHERE subject_hash LIKE '%203.0.113.%'`,
    );
    assert.equal(rawLeak.rowCount, 0, "distributed store must not persist raw network identifiers");

    console.log("public abuse postgres integration with HMAC rollover continuity: PASS");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
