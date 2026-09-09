-- NorAutoMatch CRM v4 — Follow-up satisfaction integrity
-- Follow-up obligations are immutable except for a single evidence-backed transition
-- from unsatisfied -> satisfied. They never grant customer-contact authority.

CREATE OR REPLACE FUNCTION norautomatch_guard_follow_up_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'NorAutoMatch follow-up obligations cannot be deleted';
    END IF;

    IF NEW.obligation_id IS DISTINCT FROM OLD.obligation_id
       OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
       OR NEW.opportunity_id IS DISTINCT FROM OLD.opportunity_id
       OR NEW.obligation_type IS DISTINCT FROM OLD.obligation_type
       OR NEW.due_at IS DISTINCT FROM OLD.due_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'NorAutoMatch follow-up obligation identity and due facts are immutable';
    END IF;

    IF OLD.satisfied_at IS NOT NULL OR OLD.satisfaction_evidence_ref IS NOT NULL THEN
        RAISE EXCEPTION 'NorAutoMatch satisfied follow-up obligations are immutable';
    END IF;

    IF NEW.satisfied_at IS NULL OR NEW.satisfaction_evidence_ref IS NULL THEN
        RAISE EXCEPTION 'Follow-up satisfaction requires both timestamp and evidence reference';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_follow_up_guard_mutation ON crm_follow_up_obligations;
CREATE TRIGGER crm_follow_up_guard_mutation
BEFORE UPDATE OR DELETE ON crm_follow_up_obligations
FOR EACH ROW EXECUTE FUNCTION norautomatch_guard_follow_up_mutation();

COMMENT ON FUNCTION norautomatch_guard_follow_up_mutation() IS
'Allows exactly one null->evidence-backed satisfaction transition; blocks due-date/history rewriting and deletion.';
