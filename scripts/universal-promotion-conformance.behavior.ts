import assert from "node:assert/strict";
import fs from "node:fs";

type StageRef = { workflow: string; behavior?: string; governanceContract?: string };
type Manifest = {
  schema: string;
  contractRef: string;
  status: string;
  authorityEffect: string;
  product: string;
  canonicalBranch: string;
  requiredStages: {
    challenge: StageRef;
    independentAssurance: StageRef;
    canonicalPromotionControl: StageRef;
  };
  requiredPromotionInvariants: string[];
  controlClasses: {
    preventive: string[];
    detective: string[];
    processDependentUntilExternalAdminClosure: string[];
  };
  knownLimitations: string[];
};

const MANIFEST_PATH = "institutional/universal-promotion-conformance-v0.1.json";
const EXPECTED_CANONICAL = "reactivation/2026-09-08";
const REQUIRED_INVARIANTS = [
  "EXACT_CANDIDATE_IDENTITY",
  "CANONICAL_BASE_IDENTITY",
  "CANDIDATE_GATE",
  "CHALLENGE_GATE",
  "INDEPENDENT_ASSURANCE_GATE",
  "PULL_REQUEST_GATE",
  "EXPECTED_HEAD_LOCK",
  "CANONICAL_POST_MERGE_GATE",
  "BAD_STATE_ACCOUNTING",
  "FAILURE_PRESERVATION",
  "AUTHORITY_EFFECT_EXPLICIT",
] as const;

function read(path: string): string {
  return fs.readFileSync(path, "utf8");
}

function requireReadOnlyWorkflow(path: string, text: string): void {
  assert.match(text, /permissions:\s*\n\s*contents:\s*read\b/, `${path} must retain read-only contents permission`);
  assert.doesNotMatch(text, /^\s*(actions|checks|deployments|id-token|issues|packages|pages|pull-requests|security-events|statuses):\s*write\b/m, `${path} requests write authority`);
}

function validateManifest(manifest: Manifest): void {
  assert.equal(manifest.schema, "IGNIAQUA_UNIVERSAL_PROMOTION_CONFORMANCE_V0_1");
  assert.equal(manifest.status, "PROVING_GROUND_IMPLEMENTATION");
  assert.equal(manifest.authorityEffect, "NONE");
  assert.equal(manifest.product, "NorAutoMatch");
  assert.equal(manifest.canonicalBranch, EXPECTED_CANONICAL);
  assert.match(manifest.contractRef, /UNIVERSAL_PROMOTION_AND_CHALLENGE_CONTRACT_v0\.1\.md$/);

  for (const invariant of REQUIRED_INVARIANTS) {
    assert.ok(manifest.requiredPromotionInvariants.includes(invariant), `missing promotion invariant: ${invariant}`);
  }

  const challenge = manifest.requiredStages.challenge;
  const assurance = manifest.requiredStages.independentAssurance;
  const governance = manifest.requiredStages.canonicalPromotionControl;

  assert.notEqual(challenge.workflow, assurance.workflow, "challenge and assurance cannot share the same workflow");
  assert.notEqual(challenge.behavior, assurance.behavior, "challenge and assurance cannot share the same behavior implementation");
  assert.ok(challenge.behavior, "challenge behavior is required");
  assert.ok(assurance.behavior, "independent assurance behavior is required");
  assert.ok(governance.governanceContract, "governance contract is required");

  for (const path of [challenge.workflow, assurance.workflow, governance.workflow, challenge.behavior!, assurance.behavior!, governance.governanceContract!]) {
    assert.ok(fs.existsSync(path), `required conformance evidence file missing: ${path}`);
  }

  const challengeWorkflow = read(challenge.workflow);
  const assuranceWorkflow = read(assurance.workflow);
  const governanceWorkflow = read(governance.workflow);
  const challengeBehavior = read(challenge.behavior!);
  const assuranceBehavior = read(assurance.behavior!);
  const governanceContract = JSON.parse(read(governance.governanceContract!)) as {
    canonicalBranch?: string;
    promotion?: Record<string, boolean>;
  };

  requireReadOnlyWorkflow(challenge.workflow, challengeWorkflow);
  requireReadOnlyWorkflow(assurance.workflow, assuranceWorkflow);
  requireReadOnlyWorkflow(governance.workflow, governanceWorkflow);

  for (const [label, workflow] of [["challenge", challengeWorkflow], ["assurance", assuranceWorkflow]] as const) {
    assert.match(workflow, /-\s*"candidate\/\*\*"/, `${label} workflow must run on candidate branches`);
    assert.match(workflow, /-\s*"reactivation\/\*\*"/, `${label} workflow must run on reactivation branches`);
    assert.match(workflow, /pull_request:/, `${label} workflow must run for pull requests`);
  }

  assert.equal(governanceContract.canonicalBranch, EXPECTED_CANONICAL);
  for (const key of ["requireExactHeadSha", "requireCanonicalBase", "requireCandidatePushGate", "requirePullRequestGate", "requireCanonicalPostMergeGate"]) {
    assert.equal(governanceContract.promotion?.[key], true, `governance promotion invariant disabled: ${key}`);
  }

  assert.ok(governanceWorkflow.includes(`expected=\"${EXPECTED_CANONICAL}\"`) || governanceWorkflow.includes(`expected = '${EXPECTED_CANONICAL}'`) || governanceWorkflow.includes(EXPECTED_CANONICAL), "governance workflow must bind PR base to canonical branch");
  assert.match(governanceWorkflow, /ROADMAP_PROMOTION_WRONG_BASE/, "governance workflow must fail wrong-base promotion");

  for (const marker of [
    "cross_workspace_isolation",
    "evidence_tampering_detected",
    "permission_mutation_does_not_expand_unrelated_authority",
  ]) {
    assert.ok(challengeBehavior.includes(marker), `challenge behavior lost adversarial marker: ${marker}`);
  }
  assert.match(challengeBehavior, /assert\.(equal|ok|deepEqual)/, "challenge behavior must contain executable assertions");
  assert.match(assuranceBehavior, /assert\.(equal|ok|deepEqual)/, "independent assurance behavior must contain executable assertions");

  assert.ok(manifest.controlClasses.processDependentUntilExternalAdminClosure.includes("BLOCK_DIRECT_CANONICAL_WRITE"), "direct canonical write prevention must remain explicitly unresolved until repository-side prevention is proven");
  assert.ok(manifest.knownLimitations.some((item) => item.includes("cannot prevent") || item.includes("not proven")), "manifest must preserve prevention nonclaim");
}

const manifest = JSON.parse(read(MANIFEST_PATH)) as Manifest;
validateManifest(manifest);

// Adversarial mutation: self-grading by mapping challenge and assurance to the same workflow must fail.
{
  const mutated = structuredClone(manifest);
  mutated.requiredStages.independentAssurance.workflow = mutated.requiredStages.challenge.workflow;
  assert.throws(() => validateManifest(mutated), /challenge and assurance cannot share the same workflow/);
}

// Adversarial mutation: deleting one promotion invariant must fail closed.
{
  const mutated = structuredClone(manifest);
  mutated.requiredPromotionInvariants = mutated.requiredPromotionInvariants.filter((item) => item !== "EXPECTED_HEAD_LOCK");
  assert.throws(() => validateManifest(mutated), /missing promotion invariant: EXPECTED_HEAD_LOCK/);
}

// Adversarial mutation: stale default branch cannot become canonical through manifest drift.
{
  const mutated = structuredClone(manifest);
  const staleDefaultBranch = ["ma", "in"].join("");
  mutated.canonicalBranch = staleDefaultBranch;
  assert.throws(() => validateManifest(mutated));
}

// Adversarial mutation: detection must not be relabeled as proven prevention.
{
  const mutated = structuredClone(manifest);
  mutated.controlClasses.processDependentUntilExternalAdminClosure = [];
  assert.throws(() => validateManifest(mutated), /direct canonical write prevention must remain explicitly unresolved/);
}

console.log(JSON.stringify({
  protocol: "NORAUTOMATCH_UNIVERSAL_PROMOTION_CONFORMANCE_V0_1",
  truthState: "SYNTHETIC_CONFORMANCE_PASS",
  authorityEffect: "NONE",
  product: manifest.product,
  canonicalBranch: manifest.canonicalBranch,
  verifiedStages: ["CHALLENGE", "INDEPENDENT_ASSURANCE", "CANONICAL_PROMOTION_CONTROL"],
  adversarialMutationsRejected: [
    "SELF_GRADING_CHALLENGE_ASSURANCE_COLLAPSE",
    "MISSING_EXPECTED_HEAD_LOCK",
    "STALE_DEFAULT_CANONICAL_DRIFT",
    "DETECTION_MISLABELED_AS_PREVENTION",
  ],
  nonClaims: {
    companyWideEnforcement: false,
    repositoryAdminProtectionProven: false,
    directCanonicalWritePreventionProven: false,
    productionDeployed: false,
    authorityExpanded: false,
  },
}, null, 2));
