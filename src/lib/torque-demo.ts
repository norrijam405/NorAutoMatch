import { estimateBuyingPower, formatMoney, inventory, type Vehicle } from "@/lib/inventory";

export type TorqueDemoResult = {
  text: string;
  vehicles: Vehicle[];
  handoffRecommended?: boolean;
};

const bodyAliases: Record<string, string> = {
  suv: "SUV",
  crossover: "SUV",
  truck: "Truck",
  pickup: "Truck",
  sedan: "Sedan",
  car: "Sedan",
};

function extractDollarAmount(input: string) {
  const match = input.match(/\$?([0-9]{2,3}(?:,[0-9]{3})+|[0-9]{4,6}|[0-9]{1,3}(?:\.\d+)?\s*k)\b/i);
  if (!match) return null;
  const raw = match[1].replace(/,/g, "").toLowerCase();
  return raw.endsWith("k") ? Math.round(Number(raw.slice(0, -1)) * 1000) : Number(raw);
}

function detectBodyType(input: string) {
  const lower = input.toLowerCase();
  for (const [needle, bodyType] of Object.entries(bodyAliases)) {
    if (lower.includes(needle)) return bodyType;
  }
  return null;
}

function namedVehicles(input: string) {
  const lower = input.toLowerCase();
  return inventory.filter((vehicle) =>
    [vehicle.make, vehicle.model, `${vehicle.make} ${vehicle.model}`]
      .some((term) => lower.includes(term.toLowerCase()))
  );
}

function rankVehicles(input: string) {
  const lower = input.toLowerCase();
  const bodyType = detectBodyType(input);
  const amount = extractDollarAmount(input);
  const monthly = /month|monthly|\/mo|payment/.test(lower) && amount && amount < 2500 ? amount : null;
  const budget = monthly ? estimateBuyingPower(monthly, 5000, 60) : amount;
  const named = namedVehicles(input);

  let candidates = named.length ? named : inventory;
  if (bodyType) candidates = candidates.filter((vehicle) => vehicle.type === bodyType);
  if (budget && budget > 5000) {
    const within = candidates.filter((vehicle) => vehicle.price <= budget);
    if (within.length) candidates = within;
  }

  return {
    bodyType,
    amount,
    monthly,
    budget,
    vehicles: [...candidates].sort((a, b) => a.price - b.price).slice(0, 3),
  };
}

export function answerTorqueDemo(input: string): TorqueDemoResult {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return { text: "Give me your budget, payment target, body style, or a couple vehicles you are considering.", vehicles: [] };
  }

  if (/approved|approval|credit score|interest rate|apr|what rate|finance me|loan approved/.test(lower)) {
    return {
      text: "I can help you plan the shopping side, but I cannot tell you that you are approved or promise an APR. A lender and the dealership have to confirm financing. I can still narrow the vehicles around the number you want to stay near.",
      vehicles: [],
      handoffRecommended: true,
    };
  }

  if (/available|availability|in stock|still there|on the lot/.test(lower)) {
    return {
      text: "I will not guess about live availability. The demo catalog is representative. Use the Inventory page for verified units when live inventory is enabled, or hand the question to a salesperson for confirmation.",
      vehicles: namedVehicles(trimmed).slice(0, 3),
      handoffRecommended: true,
    };
  }

  if (/salesperson|sales person|human|real person|call me|text me|ready to buy|buy today|talk to/.test(lower)) {
    return {
      text: "You sound ready for a human handoff. I can pass you to the sales side without pretending the deal is already confirmed.",
      vehicles: namedVehicles(trimmed).slice(0, 3),
      handoffRecommended: true,
    };
  }

  if (/compare|\bvs\.?\b|versus/.test(lower)) {
    const matches = namedVehicles(trimmed);
    if (matches.length >= 2) {
      const [a, b] = matches;
      return {
        text: `${a.make} ${a.model} vs. ${b.make} ${b.model}: in this demo set, the ${a.model} is ${formatMoney(a.price)} and the ${b.model} is ${formatMoney(b.price)}. I would choose based on the job you need it to do, not just the badge. Tell me what matters most—space, tech, fuel economy, towing, comfort, or price—and I will narrow the tradeoff.`,
        vehicles: matches.slice(0, 3),
      };
    }
  }

  const ranked = rankVehicles(trimmed);
  if (ranked.monthly) {
    return {
      text: `Using a demo planning assumption of ${formatMoney(5000)} down, 60 months, and 7% APR, a ${formatMoney(ranked.monthly)}/month target points to roughly ${formatMoney(ranked.budget ?? 0)} of buying power before taxes, fees, add-ons, or lender-specific terms. These are planning numbers, not a quote. Here are the closest representative matches.`,
      vehicles: ranked.vehicles,
    };
  }

  if (ranked.bodyType || (ranked.budget && ranked.budget > 5000) || ranked.vehicles.length < inventory.length) {
    const parts = [];
    if (ranked.bodyType) parts.push(ranked.bodyType);
    if (ranked.budget && ranked.budget > 5000) parts.push(`around ${formatMoney(ranked.budget)} or less`);
    return {
      text: `Got it. I am narrowing around ${parts.length ? parts.join(" and ") : "what you asked for"}. These are representative demo matches, so I will not claim a VIN is live until the inventory source verifies it.`,
      vehicles: ranked.vehicles,
    };
  }

  if (/reliable|reliability|tech|heated|sunroof|moonroof|leather|awd|4wd|third row|3rd row|towing|mpg|fuel/.test(lower)) {
    return {
      text: "Those are exactly the kinds of must-haves I should use to narrow the search. Tell me your budget or payment target and preferred body style too. Exact equipment such as a sunroof, heated wheel, or driver-assistance package should be verified against the specific VIN before I call it a match.",
      vehicles: ranked.vehicles,
    };
  }

  return {
    text: "I am Torque. Give me the number you want to stay near, the body style you want, and the must-haves you refuse to give up. I will help narrow the field without inventing availability, approval, or deal terms.",
    vehicles: [],
  };
}
