import type { Pool } from "pg";
import type {
  PublicAbuseCounterInput,
  PublicAbuseCounterResult,
  PublicAbuseCounterStore,
} from "./public-abuse-control";

export class PostgresPublicAbuseCounterStore implements PublicAbuseCounterStore {
  constructor(private readonly pool: Pool) {}

  async consume(input: PublicAbuseCounterInput): Promise<PublicAbuseCounterResult> {
    const result = await this.pool.query<{ request_count: number; window_expires_at: Date }>(
      `INSERT INTO public_abuse_buckets (
         bucket_key,
         subject_hash,
         window_started_at,
         window_expires_at,
         request_count,
         updated_at
       ) VALUES (
         $1,
         $2,
         $3::timestamptz,
         $3::timestamptz + ($4 * interval '1 second'),
         1,
         $3::timestamptz
       )
       ON CONFLICT (bucket_key, subject_hash) DO UPDATE
       SET
         window_started_at = CASE
           WHEN public_abuse_buckets.window_expires_at <= EXCLUDED.updated_at
             THEN EXCLUDED.window_started_at
           ELSE public_abuse_buckets.window_started_at
         END,
         window_expires_at = CASE
           WHEN public_abuse_buckets.window_expires_at <= EXCLUDED.updated_at
             THEN EXCLUDED.window_expires_at
           ELSE public_abuse_buckets.window_expires_at
         END,
         request_count = CASE
           WHEN public_abuse_buckets.window_expires_at <= EXCLUDED.updated_at
             THEN 1
           ELSE public_abuse_buckets.request_count + 1
         END,
         updated_at = EXCLUDED.updated_at
       RETURNING request_count, window_expires_at`,
      [input.bucketKey, input.subjectHash, input.now.toISOString(), input.windowSeconds],
    );

    const row = result.rows[0];
    if (!row) throw new Error("Public abuse counter update returned no row.");

    return {
      count: Number(row.request_count),
      resetAt: new Date(row.window_expires_at),
    };
  }
}
