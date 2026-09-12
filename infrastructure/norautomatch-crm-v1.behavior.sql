\set ON_ERROR_STOP on

TRUNCATE TABLE crm_data_lifecycle_legal_holds, crm_data_lifecycle_redaction_receipts, crm_data_lifecycle_conversation_targets, crm_data_lifecycle, crm_follow_up_obligations, crm_outbox, crm_manager_review_receipts, crm_manager_handoffs, crm_evidence, crm_opportunities RESTART IDENTITY;

INSERT INTO crm_opportunities (
    opportunity_id, workspace_id, intake_idempotency_key, pipeline, stage, desk_state,
    customer, buying_intent, inventory_evidence, attribution, latest_handoff_id,
    created_at, updated_at
) VALUES (
    'namo_111111111111111111111111',
    'norautomatch',
    repeat('1', 64),
    'Standard Retail',
    'NEW',
    'MANAGER_REVIEW_PENDING',
    '{"firstName":"Test","lastName":"Buyer","email":"test@example.com","phone":"4055550101","consent":true}'::jsonb,
    '{"budgetRange":"30000-35000","paymentMethod":"Financing","notes":"postgres validation"}'::jsonb,
    '{"state":"NO_SHORTLIST","requestedVehicleIds":[],"verifiedVehicleIds":[],"unverifiedVehicleIds":[]}'::jsonb,
    '{"source":"CI"}'::jsonb,
    'namh_111111111111111111111111',
    '2026-09-09T03:30:00Z',
    '2026-09-09T03:30:00Z'
);

INSERT INTO crm_evidence (
    workspace_id, opportunity_id, kind, evidence_ref, authority, observed_at
) VALUES (
    'norautomatch',
    'namo_111111111111111111111111',
    'LEAD_SUBMISSION',
    'namh_111111111111111111111111',
    'CUSTOMER',
    '2026-09-09T03:30:00Z'
);

INSERT INTO crm_outbox (
    event_id, workspace_id, aggregate_id, event_idempotency_key, event_type,
    pipeline, payload, occurred_at
) VALUES (
    'name_111111111111111111111111',
    'norautomatch',
    'namo_111111111111111111111111',
    repeat('2', 64),
    'CRM_OPPORTUNITY_CREATED',
    'Standard Retail',
    '{"opportunityId":"namo_111111111111111111111111"}'::jsonb,
    '2026-09-09T03:30:00Z'
);

DO $$
BEGIN
    BEGIN
        INSERT INTO crm_opportunities (
            opportunity_id, workspace_id, intake_idempotency_key, pipeline, stage, desk_state,
            customer, buying_intent, inventory_evidence, attribution, latest_handoff_id,
            created_at, updated_at
        ) VALUES (
            'namo_222222222222222222222222', 'norautomatch', repeat('1', 64),
            'Standard Retail', 'NEW', 'MANAGER_REVIEW_PENDING', '{}'::jsonb, '{}'::jsonb,
            '{}'::jsonb, '{}'::jsonb, 'namh_222222222222222222222222', now(), now()
        );
        RAISE EXCEPTION 'duplicate intake idempotency key was accepted';
    EXCEPTION WHEN unique_violation THEN
        NULL;
    END;
END $$;

DO $$
BEGIN
    BEGIN
        INSERT INTO crm_opportunities (
            opportunity_id, workspace_id, intake_idempotency_key, pipeline, stage, desk_state,
            customer, buying_intent, inventory_evidence, attribution, latest_handoff_id,
            created_at, updated_at
        ) VALUES (
            'namo_333333333333333333333333', 'norautomatch', repeat('3', 64),
            'Silently Merged Pipeline', 'NEW', 'MANAGER_REVIEW_PENDING', '{}'::jsonb, '{}'::jsonb,
            '{}'::jsonb, '{}'::jsonb, 'namh_333333333333333333333333', now(), now()
        );
        RAISE EXCEPTION 'invalid CRM pipeline was accepted';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;
END $$;

DO $$
BEGIN
    BEGIN
        INSERT INTO crm_opportunities (
            opportunity_id, workspace_id, intake_idempotency_key, pipeline, stage, desk_state,
            customer, buying_intent, inventory_evidence, attribution, latest_handoff_id,
            outcome_type, outcome_evidence_ref, created_at, updated_at
        ) VALUES (
            'namo_444444444444444444444444', 'norautomatch', repeat('4', 64),
            'Standard Retail', 'SOLD', 'MANAGER_ACKNOWLEDGED', '{}'::jsonb, '{}'::jsonb,
            '{}'::jsonb, '{}'::jsonb, 'namh_444444444444444444444444',
            'SOLD', NULL, now(), now()
        );
        RAISE EXCEPTION 'sold state without outcome evidence was accepted';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;
END $$;

DO $$
DECLARE
    blocked BOOLEAN := FALSE;
BEGIN
    BEGIN
        UPDATE crm_evidence
        SET evidence_ref = 'rewritten-history'
        WHERE opportunity_id = 'namo_111111111111111111111111';
    EXCEPTION WHEN raise_exception THEN
        blocked := TRUE;
    END;
    IF NOT blocked THEN
        RAISE EXCEPTION 'append-only CRM evidence was mutable';
    END IF;
END $$;

DO $$
BEGIN
    BEGIN
        INSERT INTO crm_evidence (
            workspace_id, opportunity_id, kind, evidence_ref, authority, observed_at
        ) VALUES (
            'other-workspace',
            'namo_111111111111111111111111',
            'CONTACT_CONFIRMED',
            'cross-workspace-proof',
            'MANAGER',
            now()
        );
        RAISE EXCEPTION 'cross-workspace evidence linkage was accepted';
    EXCEPTION WHEN foreign_key_violation THEN
        NULL;
    END;
END $$;

DO $$
BEGIN
    BEGIN
        INSERT INTO crm_manager_review_receipts (
            receipt_id, workspace_id, opportunity_id, handoff_id, receipt_idempotency_key,
            decision, actor_subject_id, actor_verifier, truth_state, recorded_at
        ) VALUES (
            'namr_111111111111111111111111',
            'norautomatch',
            'namo_111111111111111111111111',
            'namh_111111111111111111111111',
            repeat('5', 64),
            'ACKNOWLEDGED',
            'unverified-actor',
            'none',
            'UNVERIFIED_ACTOR',
            now()
        );
        RAISE EXCEPTION 'unverified manager receipt was persisted as actionable receipt';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;
END $$;

DO $$
BEGIN
    BEGIN
        INSERT INTO crm_opportunities (
            opportunity_id, workspace_id, intake_idempotency_key, pipeline, stage, desk_state,
            customer, buying_intent, inventory_evidence, attribution, latest_handoff_id,
            created_at, updated_at
        ) VALUES (
            'namo_666666666666666666666666', 'norautomatch', repeat('6', 64),
            'Vehicle Sourcing', 'NEW', 'MANAGER_REVIEW_PENDING', '{}'::jsonb, '{}'::jsonb,
            '{}'::jsonb, '{}'::jsonb, 'namh_666666666666666666666666', now(), now()
        );

        INSERT INTO crm_outbox (
            event_id, workspace_id, aggregate_id, event_idempotency_key, event_type,
            pipeline, payload, occurred_at, delivery_state, delivered_at
        ) VALUES (
            'name_666666666666666666666666',
            'norautomatch',
            'namo_666666666666666666666666',
            repeat('6', 64),
            'CRM_OPPORTUNITY_CREATED',
            'Vehicle Sourcing',
            '{}'::jsonb,
            now(),
            'DELIVERED',
            NULL
        );
        RAISE EXCEPTION 'invalid outbox delivery state was accepted';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    IF EXISTS (
        SELECT 1 FROM crm_opportunities
        WHERE opportunity_id = 'namo_666666666666666666666666'
    ) THEN
        RAISE EXCEPTION 'failed opportunity + outbox unit left a partial opportunity row';
    END IF;
END $$;

DO $$
DECLARE
    opportunity_count INTEGER;
    evidence_count INTEGER;
    outbox_count INTEGER;
BEGIN
    SELECT count(*) INTO opportunity_count FROM crm_opportunities;
    SELECT count(*) INTO evidence_count FROM crm_evidence;
    SELECT count(*) INTO outbox_count FROM crm_outbox;

    IF opportunity_count <> 1 THEN
        RAISE EXCEPTION 'expected one valid opportunity, got %', opportunity_count;
    END IF;
    IF evidence_count <> 1 THEN
        RAISE EXCEPTION 'expected one valid evidence row, got %', evidence_count;
    END IF;
    IF outbox_count <> 1 THEN
        RAISE EXCEPTION 'expected one valid outbox row, got %', outbox_count;
    END IF;
END $$;

SELECT 'PASS_POSTGRES_CRM_V1_BEHAVIOR' AS verdict;
