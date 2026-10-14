import assert from "node:assert/strict";
import { Pool } from "pg";
import { parseTorqueSalesInventorySpec } from "../src/lib/torque-sales-inventory-spec";
import { createVehicleHunt } from "../src/lib/vehicle-hunt";
import {
  persistVehicleHunt,
  readVehicleHunt,
  readActiveVehicleHunts,
  persistIndustryScoutObservation,
  persistScoutOpportunityMatch,
  readWatchtowerOpportunityQueue,
} from "../src/lib/watchtower-persistence";
import { matchScoutObservationToHunt } from "../src/lib/scout-opportunity-matcher";
import { buildSalespersonDailyBrief } from "../src/lib/salesperson-daily-brief";
import type { IndustryScoutObservation } from "../src/lib/industry-scout";

async function main() {
  const connectionString = process.env.NORAUTO_CI_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CI_DATABASE_URL_REQUIRED");

  const pool = new Pool({ connectionString, max: 2 });

  try {
    const opportunityId = "namo_0123456789abcdef01234567";
    await pool.query(
      `INSERT INTO crm_opportunities (
        opportunity_id, workspace_id, intake_idempotency_key, pipeline, stage,
        desk_state, customer, buying_intent, inventory_evidence, attribution,
        latest_handoff_id, created_at, updated_at
      ) VALUES (
        $1, 'norautomatch', $2, 'Vehicle Sourcing', 'NEW',
        'MANAGER_REVIEW_PENDING', $3::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
        'namh_0123456789abcdef01234567', $4::timestamptz, $4::timestamptz
      )`,
      [
        opportunityId,
        "a".repeat(64),
        JSON.stringify({
          firstName: "Synthetic",
          lastName: "Customer",
          email: "synthetic@example.com",
          phone: "4055550101",
          consent: true,
        }),
        "2026-10-13T21:30:00.000Z",
      ],
    );

    const hunt = createVehicleHunt({
      workspaceId: "norautomatch",
      opportunityId,
      origin: "TORQUE_CHAT",
      requirements: parseTorqueSalesInventorySpec(
        "New 2026 Pathfinder Baltic green brown seats 4WD",
      ),
      explicitCustomerText: "New 2026 Pathfinder Baltic green brown seats 4WD",
      consentToContact: true,
      createdAt: "2026-10-13T21:31:00.000Z",
      salespersonOwner: "synthetic-operator",
    });

    const persisted = await persistVehicleHunt({ pool, hunt });
    assert.equal(persisted.hunt_id, hunt.huntId);

    const readBack = await readVehicleHunt({
      pool,
      workspaceId: "norautomatch",
      huntId: hunt.huntId,
    });
    assert.equal(readBack?.huntId, hunt.huntId);
    assert.equal(readBack?.opportunityId, opportunityId);

    const active = await readActiveVehicleHunts({
      pool,
      workspaceId: "norautomatch",
    });
    assert.equal(active.some((item) => item.huntId === hunt.huntId), true);
    assert.deepEqual(active.find((item) => item.huntId === hunt.huntId)?.truth, hunt.truth);

    const observation: IndustryScoutObservation = {
      observationId: "ci_pathfinder_incentive",
      topic: "INCENTIVE",
      headline: "Synthetic Pathfinder incentive",
      summary: "Synthetic primary-source observation for CI only.",
      affectedMakes: ["Nissan"],
      affectedModels: ["Pathfinder"],
      observedAt: "2026-10-13T21:32:00.000Z",
      sourceId: "nissan-usa",
      sourceUrl: "https://www.nissanusa.com/",
      sourceClass: "OEM_OFFICIAL",
      evidenceState: "PRIMARY_VERIFIED",
      salesImpact: "HIGH_OPPORTUNITY",
      torqueUse: "CUSTOMER_SAFE",
    };

    const observationResult = await persistIndustryScoutObservation({
      pool,
      observation,
    });
    assert.equal(observationResult.inserted, true);

    const match = matchScoutObservationToHunt({
      observation,
      hunt,
      createdAt: "2026-10-13T21:33:00.000Z",
    });
    assert.equal(match.action, "TEXT_CUSTOMER");

    await persistScoutOpportunityMatch({ pool, match });

    const queue = await readWatchtowerOpportunityQueue({
      pool,
      workspaceId: "norautomatch",
    });
    assert.equal(queue.length, 1);
    assert.equal(queue[0]?.huntId, hunt.huntId);
    assert.equal(queue[0]?.action, "TEXT_CUSTOMER");

    // An already-persisted match must not remain actionable once its source expires.
    const expired = {
      ...observation,
      observationId: 'ci_expired_pathfinder_incentive',
      expiresAt: '2026-10-13T21:35:00.000Z',
    };
    await persistIndustryScoutObservation({ pool, observation: expired });
    await persistScoutOpportunityMatch({
      pool,
      match: matchScoutObservationToHunt({
        observation: expired, hunt, createdAt: '2026-10-13T21:33:00.000Z',
      }),
    });
    const freshQueue = await readWatchtowerOpportunityQueue({ pool, workspaceId: 'norautomatch' });
    assert.equal(freshQueue.length, 1);
    assert.equal(freshQueue[0]?.observationId, observation.observationId);

    // Queued recommendations for paused Hunts must be suppressed at read time.
    await pool.query("UPDATE torque_vehicle_hunts SET state = 'PAUSED' WHERE hunt_id = $1", [hunt.huntId]);
    const pausedQueue = await readWatchtowerOpportunityQueue({ pool, workspaceId: 'norautomatch' });
    assert.equal(pausedQueue.length, 0);
    await pool.query("UPDATE torque_vehicle_hunts SET state = 'SEARCHING' WHERE hunt_id = $1", [hunt.huntId]);
    // A consent change after matching must remove contact actions from the queue.
    await pool.query("UPDATE torque_vehicle_hunts SET consent_to_contact = FALSE WHERE hunt_id = $1", [hunt.huntId]);
    const revokedQueue = await readWatchtowerOpportunityQueue({ pool, workspaceId: 'norautomatch' });
    assert.equal(revokedQueue.length, 0);
    await pool.query("UPDATE torque_vehicle_hunts SET consent_to_contact = TRUE WHERE hunt_id = $1", [hunt.huntId]);
    const brief = buildSalespersonDailyBrief({
      items: queue,
      generatedAt: "2026-10-13T21:34:00.000Z",
    });
    assert.equal(brief.textNow, 1);
    assert.equal(brief.noActionClaim, "NO_COMMUNICATION_WAS_SENT_BY_THIS_BRIEF");

    console.log("Watchtower persistence integration: PASS");
  } finally {
    await pool.end();
  }
}

void main();
