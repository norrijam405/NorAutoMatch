export type TorqueRequirementPriority = "MUST_HAVE" | "PREFERRED" | "OPEN";

export type TorqueSalesRequirement<T> = {
  value: T;
  priority: TorqueRequirementPriority;
  source: "CUSTOMER_EXPLICIT" | "TORQUE_INFERRED" | "MATCH_DNA";
};

export type TorqueSalesInventorySpec = {
  vin?: TorqueSalesRequirement<string>;
  stockNumber?: TorqueSalesRequirement<string>;
  make?: TorqueSalesRequirement<string>;
  model?: TorqueSalesRequirement<string>;
  modelYear?: TorqueSalesRequirement<number | { min?: number; max?: number }>;
  trim?: TorqueSalesRequirement<string>;
  condition?: TorqueSalesRequirement<"NEW" | "USED" | "CPO">;
  maxPrice?: TorqueSalesRequirement<number>;
  maxMileage?: TorqueSalesRequirement<number>;
  exteriorColor?: TorqueSalesRequirement<string>;
  interiorColor?: TorqueSalesRequirement<string>;
  interiorMaterial?: TorqueSalesRequirement<string>;
  drivetrain?: TorqueSalesRequirement<"2WD" | "FWD" | "RWD" | "AWD" | "4WD" | "4X4">;
  cabStyle?: TorqueSalesRequirement<"KING_CAB" | "CREW_CAB" | "REGULAR_CAB" | string>;
  bedLength?: TorqueSalesRequirement<"SHORT" | "STANDARD" | "LONG" | number | string>;
  seatingCapacity?: TorqueSalesRequirement<number>;
  seatingLayout?: TorqueSalesRequirement<"BENCH" | "CAPTAINS_CHAIRS" | string>;
  engine?: TorqueSalesRequirement<string>;
  transmission?: TorqueSalesRequirement<string>;
  fuelType?: TorqueSalesRequirement<string>;
  towingMinimumLbs?: TorqueSalesRequirement<number>;
  payloadMinimumLbs?: TorqueSalesRequirement<number>;
  packages: TorqueSalesRequirement<string>[];
  features: TorqueSalesRequirement<string>[];
  exclusions: TorqueSalesRequirement<string>[];
  freeformNotes: string[];
};

const COLOR_ALIASES: Array<[RegExp, string]> = [
  [/\bbaltic\s+(?:green|teal)(?:\s+pearl)?\b/i, "Baltic Teal Pearl"],
  [/\bblack\b/i, "Black"],
  [/\bwhite\b/i, "White"],
  [/\bgray|grey\b/i, "Gray"],
  [/\bred\b/i, "Red"],
  [/\bblue\b/i, "Blue"],
];

const INTERIOR_ALIASES: Array<[RegExp, string]> = [
  [/\bbrown\s+(?:seat|interior)|\bchestnut\b/i, "Chestnut"],
  [/\bcharcoal\b/i, "Charcoal"],
  [/\blight\s+gray|light\s+grey\b/i, "Light Gray"],
  [/\bblack\s+(?:seat|interior)\b/i, "Black"],
];

const FEATURE_PATTERNS: Array<[RegExp, string]> = [
  [/heated\s+steering\s+wheel/i, "heated steering wheel"],
  [/heated\s+(?:front\s+)?seats?/i, "heated seats"],
  [/ventilated|cooled\s+seats?/i, "ventilated seats"],
  [/panoramic|panorama.*(?:roof|moonroof)|dual\s+panel\s+moonroof/i, "panoramic roof"],
  [/sunroof|moonroof/i, "sunroof"],
  [/leather/i, "leather seating"],
  [/captain'?s\s+chairs?/i, "captain's chairs"],
  [/third\s+row|3rd\s+row/i, "third row"],
  [/remote\s+start/i, "remote start"],
  [/apple\s+carplay/i, "Apple CarPlay"],
  [/android\s+auto/i, "Android Auto"],
  [/tow(?:ing)?\s+package/i, "tow package"],
  [/360(?:\s*degree)?\s+camera|around\s+view/i, "360 camera"],
];

export function parseTorqueSalesInventorySpec(message: string): TorqueSalesInventorySpec {
  const text = message.trim();
  const lower = text.toLowerCase();
  const spec: TorqueSalesInventorySpec = {
    packages: [],
    features: [],
    exclusions: [],
    freeformNotes: [],
  };

  const must = <T>(value: T): TorqueSalesRequirement<T> => ({
    value,
    priority: "MUST_HAVE",
    source: "CUSTOMER_EXPLICIT",
  });

  const preferred = <T>(value: T): TorqueSalesRequirement<T> => ({
    value,
    priority: "PREFERRED",
    source: "CUSTOMER_EXPLICIT",
  });

  const preferenceNear = (term: string) => {
    const index = lower.indexOf(term.toLowerCase());
    if (index < 0) return false;
    const window = lower.slice(Math.max(0, index - 32), index + term.length + 32);
    return /\b(?:prefer|preferred|preferably|would like|nice to have|if possible)\b/i.test(window);
  };

  if (/\bpathfinder\b/i.test(text)) spec.model = must("Pathfinder");
  else if (/\bfrontier\b/i.test(text)) spec.model = must("Frontier");
  else if (/\brogue\b/i.test(text)) spec.model = must("Rogue");
  else if (/\bmurano\b/i.test(text)) spec.model = must("Murano");
  else if (/\barmada\b/i.test(text)) spec.model = must("Armada");
  else if (/\bsentra\b/i.test(text)) spec.model = must("Sentra");
  else if (/\baltima\b/i.test(text)) spec.model = must("Altima");
  else if (/\bversa\b/i.test(text)) spec.model = must("Versa");
  else if (/\bz\b/i.test(text)) spec.model = must("Z");

  const hyundaiModel = [
    ["Santa Fe", /\bsanta\s+fe\b/i],
    ["Santa Cruz", /\bsanta\s+cruz\b/i],
    ["Palisade", /\bpalisade\b/i],
    ["Tucson", /\btucson\b/i],
    ["Kona", /\bkona\b/i],
    ["Elantra", /\belantra\b/i],
    ["Sonata", /\bsonata\b/i],
    ["Venue", /\bvenue\b/i],
    ["Ioniq 5", /\bioniq\s*5\b/i],
    ["Ioniq 6", /\bioniq\s*6\b/i],
    ["Ioniq 9", /\bioniq\s*9\b/i],
    ["Nexo", /\bnexo\b/i],
  ] as const;
  const detectedHyundaiModel = hyundaiModel.find(([, pattern]) => pattern.test(text));
  const explicitHyundai = /\bhyundai\b/i.test(text);
  const explicitNissan = /\bnissan\b/i.test(text);
  if (detectedHyundaiModel && !spec.model) spec.model = must(detectedHyundaiModel[0]);
  if (explicitHyundai && explicitNissan) {
    spec.freeformNotes.push("Both Hyundai and Nissan were named. Confirm the intended make before claiming an exact inventory match.");
  } else if (explicitHyundai || detectedHyundaiModel) {
    spec.make = must("Hyundai");
  } else if (explicitNissan || spec.model) {
    spec.make = must("Nissan");
  }

  // Exact VIN lookup is a strict identity request, not a preference or fuzzy match.
  const vinRequest = text.match(/\b(?:VIN|vehicle identification number)\s*[:#-]?\s*([A-HJ-NPR-Z0-9]{17})\b/i);
  if (vinRequest) spec.vin = must(vinRequest[1].toUpperCase());
  const stockRequest = text.match(/\b(?:stock(?:\s*(?:number|no\.?|#))?|stock#)\s*[:#-]?\s*([A-Z0-9-]{3,24})\b/i);
  if (stockRequest && /[0-9]/.test(stockRequest[1])) spec.stockNumber = must(stockRequest[1].toUpperCase());

  const year = text.match(/\b(20\d{2})\b/);
  if (year) spec.modelYear = must(Number(year[1]));

  const maxPrice = text.match(/(?:under|below|max(?:imum)?|up to)\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*(k|thousand)?/i);
  if (maxPrice) {
    const raw = Number(maxPrice[1]);
    if (Number.isFinite(raw) && raw > 0) {
      spec.maxPrice = must(maxPrice[2] || raw < 1000 ? Math.round(raw * 1000) : Math.round(raw));
    }
  }

  const maxMileage = text.match(/(?:under|below|max(?:imum)?|less than)\s*([0-9]+(?:\.[0-9]+)?)\s*(k|thousand)?\s*(?:miles?|mi)\b/i);
  if (maxMileage) {
    const raw = Number(maxMileage[1]);
    if (Number.isFinite(raw) && raw >= 0) {
      spec.maxMileage = must(maxMileage[2] || raw < 1000 ? Math.round(raw * 1000) : Math.round(raw));
    }
  }

  const exterior = COLOR_ALIASES.find(([pattern]) => pattern.test(text));
  if (exterior) spec.exteriorColor = must(exterior[1]);

  const interior = INTERIOR_ALIASES.find(([pattern]) => pattern.test(text));
  if (interior) spec.interiorColor = must(interior[1]);

  if (/\b4wd\b/i.test(text)) spec.drivetrain = must("4WD");
  else if (/\b4x4\b/i.test(text)) spec.drivetrain = must("4X4");
  else if (/\bawd\b/i.test(text)) spec.drivetrain = must("AWD");
  else if (/\bfwd\b/i.test(text)) spec.drivetrain = must("FWD");
  else if (/\brwd\b/i.test(text)) spec.drivetrain = must("RWD");
  else if (/\b2wd\b/i.test(text)) spec.drivetrain = must("2WD");

  if (/\bking\s+cab\b/i.test(text)) spec.cabStyle = must("KING_CAB");
  else if (/\bcrew\s+cab\b/i.test(text)) spec.cabStyle = must("CREW_CAB");

  if (/\b(?:extended|long)\s+bed\b/i.test(text) || /\b6(?:\.0)?[-\s]?foot\s+bed\b/i.test(text)) {
    spec.bedLength = must("LONG");
  } else if (/\bshort\s+bed\b/i.test(text) || /\b5(?:\.0)?[-\s]?foot\s+bed\b/i.test(text)) {
    spec.bedLength = must("SHORT");
  }

  if (/\bplatinum\b/i.test(text)) spec.trim = preferenceNear("platinum") ? preferred("Platinum") : must("Platinum");
  else if (/\brock\s+creek\b/i.test(text)) spec.trim = preferenceNear("rock creek") ? preferred("Rock Creek") : must("Rock Creek");
  else if (/\bpro-?4x\b/i.test(text)) spec.trim = preferenceNear("pro-4x") ? preferred("PRO-4X") : must("PRO-4X");
  else if (/\bpro-?x\b/i.test(text)) spec.trim = preferenceNear("pro-x") ? preferred("PRO-X") : must("PRO-X");
  else if (/\bsl\b/i.test(text)) spec.trim = preferenceNear("sl") ? preferred("SL") : must("SL");
  else if (/\bsv\b/i.test(text)) spec.trim = preferenceNear("sv") ? preferred("SV") : must("SV");

  if (/\bnew\b/i.test(text)) spec.condition = must("NEW");
  else if (/\bcpo|certified\b/i.test(text)) spec.condition = must("CPO");
  else if (/\bused|pre[- ]owned\b/i.test(text)) spec.condition = must("USED");

  if (/\bleather\b/i.test(text)) spec.interiorMaterial = preferred("Leather");

  const seating = text.match(/\b(?:seat|seats|seating for)\s*(\d)\b/i);
  if (seating) spec.seatingCapacity = must(Number(seating[1]));

  for (const [pattern, feature] of FEATURE_PATTERNS) {
    if (pattern.test(text)) spec.features.push(must(feature));
  }

  const tow = text.match(/(?:tow|towing).*?(\d{4,5})\s*(?:lb|lbs|pounds)/i);
  if (tow) spec.towingMinimumLbs = must(Number(tow[1]));

  const payload = text.match(/payload.*?(\d{3,5})\s*(?:lb|lbs|pounds)/i);
  if (payload) spec.payloadMinimumLbs = must(Number(payload[1]));

  const packageMatches = [...text.matchAll(/([A-Za-z0-9 -]{2,40}\s+package)\b/gi)];
  spec.packages = packageMatches.map((match) => must(match[1].trim()));

  const exclusions = [...text.matchAll(/(?:no|without|don'?t want|do not want)\s+([A-Za-z0-9 -]{2,40})(?=,|\.|$)/gi)];
  spec.exclusions = exclusions.map((match) => must(match[1].trim()));

  if (/\bprefer|preferably|would like|nice to have\b/i.test(lower)) {
    spec.freeformNotes.push("Customer expressed at least one flexible preference; Torque should confirm which requirements are negotiable before relaxing any MUST_HAVE constraint.");
  }

  return spec;
}
