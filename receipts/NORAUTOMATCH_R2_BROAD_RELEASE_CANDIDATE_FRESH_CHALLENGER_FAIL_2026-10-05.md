# NorAutoMatch R2 Broad Release-Candidate Fresh Challenger — FAIL

Date: 2026-10-05

Repository: `norrijam405/NorAutoMatch`

Role: **Broad Release-Candidate Fresh Challenger**

## Exact frozen candidate

- commit: `1c37dc6c389ac8531f1d3cbd78a3d28a4f8e4448`
- tree: `d5f52430d4b92429d5e936550437e94c0cdc46b1`
- canonical production base: `71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`
- direct comparison: 144 commits ahead / 0 behind
- merge base: exact canonical production base

No moving branch head was substituted.

## Disposition

**FAIL**

The broad challenge stopped at the first material counterexample as required by the activation.

## Finding

**NORAUTOMATCH-R2-BRC-FC-01 — UNVERIFIED_SOCIAL_URL_IS_DURABLY_RECORDED_AS_PUBLISHED**

### Affected surface

Video Hub / social publication metadata.

Mandatory broad-challenge theme affected:
- #36: publication metadata cannot imply social-channel posting that did not occur
- #37: no automatic external social publishing authority

### Expected invariant

NorAutoMatch may preserve evidence-backed external publication links, but it must not convert an operator-supplied URL into durable evidence that a social-channel publication actually occurred unless publication is independently evidenced.

A URL alone is not proof that NorAutoMatch, the dealership, or any operator actually published the referenced video to that channel.

### Exact-candidate evidence

In `src/app/manager/videos/actions.ts`, `createVideoHubEntry()` maps every non-empty social URL field directly to:

```ts
{ channel, url: raw, publicationState: "PUBLISHED" }
```

No receipt ID, provider evidence, observed provider response, source hash, verification fetch, or other publication evidence is required.

The resulting object is passed through `buildVideoHubEntry()` and persisted to `video_hub_entries.channels`.

In `src/lib/video-hub-library.ts`, the schema accepts `publicationState: "PUBLISHED"` together with any syntactically valid URL. It does not require evidence that publication occurred.

In `supabase/schema/video_hub_library_r0.sql`, the database only constrains `channels` to be a JSON array. The table comment describes these as **evidence-backed external publication links**, but there is no database truth constraint requiring publication evidence.

The exact-candidate behavior test `scripts/video-hub-library.behavior.ts` explicitly constructs a YouTube URL with `publicationState: "PUBLISHED"` and asserts that the state remains `PUBLISHED`. The test therefore preserves the false-positive truth model rather than challenging it.

The manager UI text correctly says to add a social URL only after publication actually occurred, but this is advisory text only and is not an evidence boundary.

### Reproduction

As any authenticated NorAutoMatch `operator`, `admin`, or `founder`:

1. Open the Video Hub manager form.
2. Create a video entry with visibility `PUBLIC` or `DRAFT`.
3. Put any syntactically valid URL in a social field, for example a YouTube URL that does not prove the video was published by NorAutoMatch.
4. Submit the form.
5. `createVideoHubEntry()` deterministically writes that channel as `publicationState: "PUBLISHED"`.
6. The persisted Video Hub metadata now claims social publication without any publication evidence.

No external social API call is needed to reproduce the false claim.

### Why this is material

This violates the evidence-first truth boundary for the integrated R2 bundle. A manager-entered URL is being promoted into a durable publication fact.

The defect does **not** grant automatic social-posting authority; instead, it invents evidence that posting already happened. That is directly within the mandatory broad challenge matrix and can contaminate later customer-facing or assurance logic that treats `PUBLISHED` as observed truth.

### Attribution to the exact candidate

The affected files are present in the exact frozen candidate and are part of the 144-commit integrated R2 delta from canonical production main:

- `src/app/manager/videos/actions.ts`
- `src/lib/video-hub-library.ts`
- `src/lib/video-hub.ts`
- `supabase/schema/video_hub_library_r0.sql`
- `scripts/video-hub-library.behavior.ts`

The defect is therefore attributable to the exact challenged candidate, not to canonical production main.

## Corroborating release context inspected

The challenger read and reconciled:
- broad release activation
- release-reconciliation receipt
- FC-01→FRC-03 Independent Assurance PASS receipt
- PR #53, #54, #55, #58, #59, #60, #61 bodies/discussion
- IgniAqua Control Plane issues #27, #28, #29
- exact candidate/base comparison
- exact candidate source/schema relevant to the affected Video Hub surface

The previously closed FC-01→FRC-03 lineage was not reopened by this finding.

## Safety / authority

- no remediation performed
- no merge
- no deployment
- no live customer traffic
- no secure-document activation
- no inventory-cache/runtime activation
- no Motive/RideMotive/LangGraph execution
- no social-provider execution
- no outbound customer communication
- no paid infrastructure
- no secret disclosure

Authority effect: **NONE**

## Final state

**BROAD_RELEASE_CANDIDATE_FRESH_CHALLENGER_FAIL / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY**

Per the activation, challenge execution stops at this material finding.

A separate Remediation Builder must address this finding before a new broad Fresh Re-Challenger can continue the release-candidate gate.
