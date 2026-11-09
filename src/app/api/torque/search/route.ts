import { NextResponse } from "next/server";
import { inventory } from "@/lib/inventory";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";
import { loadOrrResilientCustomerCatalog } from "@/lib/orr-resilient-customer-catalog";
import { buildMatchDnaSummary } from "@/lib/match-dna";
import { createClient } from "@/lib/supabase/server";
import { isTorqueStandaloneDemo, canUseTorquePreviewVerifiedCatalog } from "@/lib/torque-standalone-demo";
import { LIVE_INVENTORY_ACTIVATION_VALUE } from "@/lib/inventory-runtime";
import { readJsonBodyWithByteLimit } from "@/lib/request-body-limit";
import { answerTorqueInventory, type TorqueInventoryMode } from "@/lib/torque-inventory-assistant";
import { buildGarageBattleStory } from "@/lib/garage-battle";
import { namedComparison } from "@/lib/torque-conversation-comparison";
import { combinedCustomerSpec, readRecentCustomerMessages, customerSpecSummary } from "@/lib/torque-conversation-state";
import { scopedTorqueFollowup } from "@/lib/torque-followup-answer";
import { planTorqueNextAction } from "@/lib/torque-conversation-action-plan";
import { vehicleEvidenceForMatch } from "@/lib/torque-vehicle-evidence";
import { torqueNextQuestion } from "@/lib/torque-next-question";
import { explainTorqueNoMatch } from "@/lib/torque-no-match";
import { scoutEpaModel } from "@/lib/torque-epa-knowledge-scout";
import { parseExplicitEpaComparison } from "@/lib/torque-cross-brand-query";
import { observeTorqueDealerCatalog, type TorqueDealerScoutReceipt } from "@/lib/torque-dealer-change-scout";
import { BATTLE_PRIORITIES, isBattlePriority, resolveBattlePriority, battleFollowupType } from "@/lib/torque-battle-followup";
import { dealerInventorySearchAvailable, resolveDealershipScope } from "@/lib/dealership-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TORQUE_REQUEST_BYTES = 8 * 1024;

function noStore(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const bodyRead = await readJsonBodyWithByteLimit(request, MAX_TORQUE_REQUEST_BYTES);
  if (!bodyRead.ok) {
    return noStore(
      { message: bodyRead.reason === "TOO_LARGE" ? "That request is too large." : "I couldn't read that request safely." },
      bodyRead.reason === "TOO_LARGE" ? 413 : 400,
    );
  }

  const message =
    typeof bodyRead.value === "object" &&
    bodyRead.value !== null &&
    "message" in bodyRead.value &&
    typeof bodyRead.value.message === "string"
      ? bodyRead.value.message.trim()
      : "";

  if (!message || message.length > 1200) {
    return noStore({ message: "Tell Torque what you're looking for in 1,200 characters or fewer." }, 400);
  }

  const requestedDealership =
    typeof bodyRead.value === "object" && bodyRead.value !== null &&
    "dealershipId" in bodyRead.value
      ? bodyRead.value.dealershipId
      : "orr-nissan-west";
  const dealership = resolveDealershipScope(requestedDealership);
  if (!dealership) {
    return noStore({ message: "Select a recognized dealership before asking Torque to search its inventory.", truthState: "UNKNOWN_DEALERSHIP" }, 400);
  }
  if (!dealerInventorySearchAvailable(dealership)) {
    return noStore({
      protocol: "NORAUTO_TORQUE_SEARCH_V1",
      dealershipId: dealership.id,
      dealershipLabel: dealership.label,
      truthState: "DEALERSHIP_INVENTORY_NOT_CONNECTED",
      message: "The Irving Hyundai dealership has not been confirmed or connected to a verified inventory source. I cannot search its stock or claim whether it has a vehicle. A salesperson can review your request manually after the dealership is confirmed.",
      matches: [],
      canCreateSourcingRequest: false,
    }, 200);
  }

  // External model research has no dependency on dealership inventory health.
  // It never checks or implies that a non-Nissan vehicle is held by Orr.
  const requestedCrossBrandResearch = parseExplicitEpaComparison(message);
  if (requestedCrossBrandResearch.length === 2 && canUseTorquePreviewVerifiedCatalog()) {
    const researchEvidence = await Promise.all(requestedCrossBrandResearch.map(scoutEpaModel));
    return noStore({
      protocol: "NORAUTO_TORQUE_MODEL_COMPARISON_V1",
      truthState: "EXTERNAL_MODEL_RESEARCH_ONLY",
      mode: "model-research",
      researchEvidence, matches: [],
      answer: "These are official EPA model-configuration estimates for comparison across makes. They are NOT proof of any specific dealer VIN, equipment, pricing or availability. Confirm matching powertrains before comparing fuel economy.",
    });
  }


  const directResearch = message.match(/\\b(?:EPA\\s+)?(?:mpg|fuel economy|gas mileage)\\s*(?:for|of|on|:)?\\s*(20\\d{2})\\s+(Toyota|Honda|Nissan|Hyundai|Kia|Ford|Chevrolet|Mazda|Subaru|Jeep|Volkswagen|BMW|Lexus|Acura|GMC|Buick|Mitsubishi|Volvo)\\s+([a-z0-9][a-z0-9-]{1,19})\\b/i);
  if (directResearch && canUseTorquePreviewVerifiedCatalog()) {
    const epa = await scoutEpaModel({
      year: Number(directResearch[1]), make: directResearch[2], model: directResearch[3],
    });
    return noStore({
      protocol: "NORAUTO_TORQUE_MODEL_RESEARCH_V1",
      truthState: "EXTERNAL_MODEL_RESEARCH_ONLY",
      mode: "model-research",
      researchEvidence: [epa], matches: [], needsMoreDetail: false,
      answer: epa.status === "MODEL_VARIANTS"
        ? "I located EPA fuel-economy configurations for that model. The options below are model research, not Orr inventory or proof that a listed VIN has the same engine, drivetrain, or MPG."
        : "I could not retrieve authoritative MPG figures for that exact model request. I will not substitute another trim or invent a number.",
    });
  }


  // Explicit user selection on an isolated no-database demo service may fetch
  // the public dealer catalog read-only. This cannot enable live inventory
  // in other deployments or perform a customer/CRM action.
  const previewVerified = canUseTorquePreviewVerifiedCatalog() &&
    typeof bodyRead.value === "object" && bodyRead.value !== null &&
    "catalogScope" in bodyRead.value && bodyRead.value.catalogScope === "verified";
  const inventoryConfig = previewVerified
    ? { mode: "live-enabled", liveActivation: LIVE_INVENTORY_ACTIVATION_VALUE }
    : {
        mode: process.env.NORAUTO_INVENTORY_MODE,
        liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
      };
  const runtimeDecision = resolveInventoryRuntime(inventoryConfig);

  let vehicles = inventory;
  let mode: TorqueInventoryMode = "representative-demo";
  let dealerScoutReceipt: TorqueDealerScoutReceipt | null = null;

  if (runtimeDecision.effectiveMode === "live-enabled") {
    try {
      const catalog = await loadOrrResilientCustomerCatalog({
        mode: inventoryConfig.mode,
        liveActivation: inventoryConfig.liveActivation,
      });
      if (!catalog.customerVisibleLiveInventory || catalog.source === "demo") {
        return noStore({ truthState: "VERIFIED_SOURCE_UNAVAILABLE", message: "Dealer inventory cannot be verified right now.", matches: [] }, 503);
      }
      vehicles = catalog.vehicles;
      mode = catalog.source === "provider-cache" ? "verified-cache" : "verified-live";
      if (previewVerified && catalog.source === "orr-live") dealerScoutReceipt = observeTorqueDealerCatalog(vehicles);
      // Temporary nonproduction source health telemetry. Only aggregate counts
      // and source type; never log queries, VINs, customer identities or keys.
      if (previewVerified) {
        const suvLikeCount = vehicles.filter(v => /\b(?:suv|crossover|cross-over|sport\s*utility)\b/i.test(v.type)).length;
        console.info("NORAUTO_TORQUE_PREVIEW_CATALOG_HEALTH", JSON.stringify({
          source: catalog.source,
          eligibleVehicles: vehicles.length,
          suvLikeCount,
          hasMileage: vehicles.filter(v => v.mileageVerified).length,
          hasMpg: vehicles.filter(v => (v.highwayMpg ?? 0) > 0).length,
          hasFeatureEvidence: vehicles.filter(v => (v.features?.length ?? 0) > 0).length,
        }));
      }
    } catch (error) {
      if (previewVerified) {
        const code = error && typeof error === "object" && "code" in error &&
          typeof error.code === "string" ? error.code : "SOURCE_CHECK_FAILED";
        console.warn("NORAUTO_TORQUE_PREVIEW_SOURCE_FAILED", code);
      }
      return noStore({
        protocol: "NORAUTO_TORQUE_SEARCH_V1",
        truthState: "VERIFIED_SOURCE_UNAVAILABLE",
        message: "I can't verify fresh inventory right now, so I'm not going to make up an answer. I can still capture exactly what you want for a human sourcing check.",
        canCreateSourcingRequest: true,
      }, 503);
    }
  }

  // Garage Battle uses the same Torque endpoint but never lets natural-language search
  // silently substitute a vehicle. Both VINs must resolve in verified dealer records.
  const suppliedBattle = typeof bodyRead.value === "object" && bodyRead.value !== null && "battle" in bodyRead.value
    ? bodyRead.value.battle : null;
  const namedPair = suppliedBattle == null && mode !== "representative-demo"
    ? namedComparison(message, vehicles) : null;
  const rawBattle = suppliedBattle ?? (namedPair ? { vins: namedPair.vehicles.map(v => v.id), priority: "all" } : null);
  if (rawBattle !== null && rawBattle !== undefined) {
    const b = rawBattle as Record<string, unknown>;
    const ids = b && Array.isArray(b.vins) ? b.vins : [];
    const previousPriority = b && b.priority;
    if (ids.length !== 2 || !ids.every(x => typeof x === "string" && /^[A-HJ-NPR-Z0-9]{17}$/i.test(x))
      || ids[0] === ids[1] || !isBattlePriority(previousPriority)) {
      return noStore({ truthState: "INVALID_BATTLE_REQUEST", message: "Choose two different saved vehicles and a valid comparison priority." }, 400);
    }
    const priority = resolveBattlePriority(message, previousPriority);
    if (mode === "representative-demo") {
      return noStore({ truthState: "VERIFIED_SOURCE_REQUIRED", mode,
        answer: "I can't compare those saved VINs against demonstration inventory. Please retry when a verified dealer catalog is available.",
        matches: [] }, 200);
    }
    const a = vehicles.find(v => v.id.toUpperCase() === String(ids[0]).toUpperCase());
    const bVehicle = vehicles.find(v => v.id.toUpperCase() === String(ids[1]).toUpperCase());
    if (!a || !bVehicle) {
      return noStore({ truthState: "SAVED_VIN_NOT_IN_VERIFIED_CATALOG", mode,
        answer: "One or both saved VINs are not in the currently verified dealer catalog. I won't substitute another vehicle.",
        matches: [] }, 200);
    }
    const story = buildGarageBattleStory(a, bVehicle);
    const signals = priority === "all" ? story.signals : story.signals.filter(s => (BATTLE_PRIORITIES[priority] as readonly string[]).includes(s.id));
    const isNamedPair = Boolean(namedPair);
    const scopeNote = isNamedPair
      ? `I found both models in the checked dealer catalog. For a concrete comparison I'm using one listed example of each: ${a.year} ${a.make} ${a.model} ${a.trim} (VIN ${a.id}) and ${bVehicle.year} ${bVehicle.make} ${bVehicle.model} ${bVehicle.trim} (VIN ${bVehicle.id}). Other model years or trims can differ. `
      : "";
    // Conversational summary: the Garage already shows the full evidence cards.
    // Give the customer the most relevant two points, not a wall of repeated facts.
    const focus = battleFollowupType(message);
    const observations = signals.slice(0, focus === "details" ? 3 : 2).map(s => s.text);
    const priorityLabel: Record<string, string> = {all:"the overall tradeoffs",budget:"price",fuel:"fuel economy",space:"interior room",weather:"traction",city:"parking footprint"};
    const advice = focus === "choice"
      ? "Based on the available facts, I can show tradeoffs, but I can't pick a universal winner without knowing your personal constraints. What matters most in your day-to-day driving?"
      : focus === "details"
        ? "That's what these verified records support. If you want, ask about another factor, and I'll keep these same two vehicles in view."
        : "Want to compare another factor, such as price, fuel economy, space, or traction?";
    return noStore({
      protocol: "NORAUTO_TORQUE_GARAGE_BATTLE_V1",
      truthState: mode === "verified-cache" ? "VERIFIED_CACHED_CATALOG" : "VERIFIED_SOURCE_CATALOG",
      mode, dealershipId: dealership.id,
      answer: observations.length
        ? scopeNote + `About ${priorityLabel[priority]}: ` + observations.join("\n\n") + "\n\n" + advice
        : `I can't establish a source-backed difference for ${priorityLabel[priority]} between those two exact VINs. Ask about another factor or review the evidence gaps in Garage Battle.`,
      battle: { vins: ids, priority, signals, evidenceGaps: story.evidenceGaps, basis: isNamedPair ? "named-catalog-examples" : "exact-vins" },
      matches: [], needsMoreDetail: false,
    });
  }

  if (!suppliedBattle && !namedPair && /\b(?:compare|comparison|versus|vs\.?|between)\b/i.test(message)) {
    return noStore({
      protocol: "NORAUTO_TORQUE_SEARCH_V1",
      truthState: mode === "representative-demo" ? "REPRESENTATIVE_ONLY" : "COMPARISON_SCOPE_UNVERIFIED",
      mode, needsMoreDetail: true, matches: [],
      answer: mode === "representative-demo"
        ? "I can discuss what matters in a comparison, but I cannot verify two dealer vehicles from demonstration inventory. Tell me the two models and your priorities; a salesperson can confirm actual listings."
        : "I can compare models directly, without you saving cars first. I couldn't verify both named models in this dealer catalog. Which two exact models or model years do you mean? I won't silently compare an unrelated vehicle.",
    });
  }

  const recentMessages = readRecentCustomerMessages(
    typeof bodyRead.value === "object" && bodyRead.value !== null && "recentMessages" in bodyRead.value
      ? bodyRead.value.recentMessages : []
  );
  const spec = combinedCustomerSpec(recentMessages, message);
  // The research scout is intentionally independent of dealership inventory:
  // a Honda, Toyota, or other make is a model comparison, NOT an Orr stock claim.
  // Only an explicit year/make/model research question triggers this endpoint.
  if (spec.freeformNotes.some((note) => note.startsWith("Both Hyundai and Nissan were named."))) {
    return noStore({
      protocol: "NORAUTO_TORQUE_SEARCH_V1",
      truthState: "BRAND_CLARIFICATION_REQUIRED",
      dealershipId: dealership.id,
      dealershipLabel: dealership.label,
      needsMoreDetail: true,
      answer: "You mentioned both Hyundai and Nissan. Are you comparing the two brands, or searching for a specific make? I won't assume one and give you the wrong inventory.",
      matches: [],
    });
  }
  const hasSearchSignal = Boolean(
    spec.vin ||
    spec.stockNumber ||
    spec.make ||
    spec.model ||
    spec.bodyType ||
    spec.bodyTypeAlternatives ||
    spec.modelYear ||
    spec.trim ||
    spec.condition ||
    spec.maxPrice ||
    spec.maxMileage ||
    spec.exteriorColor ||
    spec.interiorColor ||
    spec.interiorMaterial ||
    spec.drivetrain ||
    spec.cabStyle ||
    spec.bedLength ||
    spec.seatingCapacity ||
    spec.engine ||
    spec.transmission ||
    spec.fuelType ||
    spec.towingMinimumLbs ||
    spec.payloadMinimumLbs ||
    spec.packages.length ||
    spec.features.length ||
    spec.exclusions.length
  );

  if (!hasSearchSignal) {
    return noStore({
      protocol: "NORAUTO_TORQUE_SEARCH_V1",
      truthState: mode === "representative-demo" ? "REPRESENTATIVE_ONLY" : "VERIFIED_INVENTORY_READY",
      mode,
      needsMoreDetail: true,
      answer: /\b(?:which|what)\s+(?:one|vehicle)\s+(?:is\s+)?better\b|\bwhich would you (?:pick|choose|recommend)\b/i.test(message)
        ? "I can compare two exact VINs, but I need to know which two vehicles you mean. Open Garage Battle and select them, or give me their VINs. I won't guess."
        : /\b(?:space|room|cargo|family|fuel economy|mpg|good on gas)\b/i.test(message)
          ? "You're weighing passenger or cargo space against fuel economy. That makes sense. How many people must fit, and are you looking for an SUV, minivan, or either? I won't rank cars before confirming those basics."
          : "Which vehicle type are you considering, and what is your top non-negotiable requirement? You can describe it in plain language; I won't quietly drop what matters.",
      spec,
      matches: [],
    });
  }

  const nextQuestion = torqueNextQuestion(spec);
  if (nextQuestion) {
    return noStore({
      protocol: "NORAUTO_TORQUE_SEARCH_V1",
      truthState: "NEEDS_CUSTOMER_CLARIFICATION",
      mode, needsMoreDetail: true, matches: [],
      answer: nextQuestion,
      customerRequirements: customerSpecSummary(spec),
    });
  }

  let userId: string | null = null;
  if (!isTorqueStandaloneDemo()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  }

  let dna;
  if (userId) {
    const supabase = await createClient();
    const { data: dnaEvents } = await supabase
      .from("match_dna_events")
      .select("action,make,body_type,drivetrain,condition,price,mileage")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(250);
    dna = buildMatchDnaSummary(dnaEvents ?? []);
  }

  const result = answerTorqueInventory({ message, vehicles, mode, dna, spec });
  if (recentMessages.length > 0) {
    const focusedAnswer = scopedTorqueFollowup(message, result.matches, vehicles, mode);
    // Follow-up facts supplement, never overwrite, the fit assessment. In particular,
    // an exact listing is not proof of seating capacity, available stock, or a deal.
    // Retain must-have compromises, sourcing limits, and MatchDNA disclosures for
    // both exact and near matches while still answering price/MPG questions.
    if (focusedAnswer) {
      result.answer += "\n\n" + focusedAnswer;
    }
  }
  // Consult EPA only when MPG is relevant and a dealer candidate lacks BOTH
  // numeric dealer MPG values. This is model context, not a claimed VIN rating.
  const asksMpg = /\\b(?:mpg|gas mileage|good on gas|fuel econom|fuel efficient|miles per gallon)\\b/i.test(message) ||
    spec.freeformNotes.some(note => note.startsWith("Fuel efficiency preference"));
  const dealerCandidatesMissingMpg = result.matches.filter(match => {
    const listing = vehicles.find(v => v.id === match.id);
    return listing && !(Number.isFinite(listing.cityMpg) && Number.isFinite(listing.highwayMpg));
  });
  const scoutVehicle = asksMpg && mode !== "representative-demo" && dealerCandidatesMissingMpg.length
    ? vehicles.find(v => v.id === dealerCandidatesMissingMpg[0].id) : undefined;
  const researchEvidence = scoutVehicle
    ? [await scoutEpaModel({year: scoutVehicle.year, make: scoutVehicle.make, model: scoutVehicle.model})]
    : [];
  const customerRequirements = customerSpecSummary(spec);
  // A no-match response must name the retained, explicit customer constraints.
  // Behavioral MatchDNA does not turn into customer MUST_HAVE requirements.
  if (spec.seatingCapacity?.priority === "MUST_HAVE" && result.matches.length === 0) {
    result.answer = `I heard your requirement for ${spec.seatingCapacity.value} seats. The current vehicle records do not carry enough verified seating-capacity evidence for me to certify a match. I won't recommend a vehicle as meeting that requirement without proof. A salesperson should verify the exact VIN and seating configuration.`;
  }
  if (result.matches.length === 0 && !spec.seatingCapacity) {
    result.answer = explainTorqueNoMatch(spec, mode);
  }
  if (result.exactCount === 0 && result.nearCount === 0 && customerRequirements.length > 0) {
    result.answer += " Your stated requirements I kept: " + customerRequirements.join(", ") + ".";
  }

  return noStore({
    protocol: "NORAUTO_TORQUE_SEARCH_V1",
    truthState: mode === "representative-demo" ? "REPRESENTATIVE_ONLY" : "VERIFIED_CURRENT_SCOPE",
    needsMoreDetail: false,
    ...result,
    salesSpec: spec,
    customerRequirements,
    dealershipId: dealership.id,
    dealershipLabel: dealership.label,
    matchDna: dna ?? null,
    nextAction: planTorqueNextAction({ spec, result }),
    vehicleEvidence: result.matches.slice(0, 3).map((match) => vehicleEvidenceForMatch(match, vehicles, mode)).filter((item) => item !== null),
    researchEvidence,
    dealerScoutUpdates: dealerScoutReceipt && dealerScoutReceipt.state === "CHANGES"
      ? {
          observedAt: dealerScoutReceipt.observedAt,
          disclaimer: dealerScoutReceipt.disclaimer,
          changes: dealerScoutReceipt.changes.filter(change => result.matches.some(match => match.id.toUpperCase() === change.vin)),
        }
      : null,
  });
}
