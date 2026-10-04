-- NorAutoMatch CRM v8: bounded cleanup primitive for expired pseudonymous abuse-control buckets.
-- This is technical minimization, not a legal retention schedule. Callers must supply an explicit cutoff.

CREATE OR REPLACE FUNCTION norautomatch_cleanup_expired_public_abuse_buckets(
    p_expired_before TIMESTAMPTZ
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    IF p_expired_before IS NULL THEN
        RAISE EXCEPTION 'PUBLIC_ABUSE_CLEANUP_CUTOFF_REQUIRED';
    END IF;

    DELETE FROM public_abuse_buckets
     WHERE window_expires_at < p_expired_before;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION norautomatch_cleanup_expired_public_abuse_buckets(TIMESTAMPTZ) IS
    'Deletes only pseudonymous abuse buckets with window_expires_at before an explicit caller-supplied cutoff. Does not establish a legal retention period or scheduling policy.';
