export type IgniCheckConversationIntent = {
  schema: "ignicheck.conversation-intent.v0.1";
  rawText: string;
  goal: string;
  bodyStylesMentioned: string[];
  bodyStylesAllowed: string[];
  bodyStylesExcluded: string[];
  maxPrice: number | null;
  maxMileage: number | null;
  featureHints: string[];
  fuelEconomyPreference: boolean;
  useCase: "TEEN_OR_NEW_DRIVER" | null;
  flexibilityObserved: boolean;
  unknowns: string[];
  truth: {
    deterministicExtraction: true;
    semanticModelUsed: false;
    userIntentFullyKnown: false;
  };
};

const BODY_TYPES = ["sedan","suv","truck","van","coupe","hatchback"] as const;

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g," ").trim();
}

function uniq<T>(values: T[]) {
  return [...new Set(values)];
}

function moneyMax(text: string) {
  const rules = [
    /(?:no more than|not over|under|below|less than|up to|max(?:imum)?(?: of)?|budget(?: is| of| around)?)[^$\d]{0,18}\$([\d,]+(?:\.\d+)?)/i,
    /(?:budget|price|cost)[^\d]{0,18}([\d,]+(?:\.\d+)?)/i,
  ];
  for (const re of rules) {
    const hit = text.match(re);
    if (!hit) continue;
    const value = Number(hit[1].replaceAll(",",""));
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function mileageMax(text: string) {
  const hit = text.match(/(?:no more than|not over|under|below|less than|up to|max(?:imum)?(?: of)?)\s+([\d,]+)\s*(?:miles?|mi)\b/i);
  if (!hit) return null;
  const value = Number(hit[1].replaceAll(",",""));
  return Number.isFinite(value) ? value : null;
}

function excludedBodyTypes(text: string) {
  const lowered = text.toLowerCase();
  return BODY_TYPES.filter((type) => {
    const re = new RegExp("(?:don't want|do not want|avoid|without|not interested in|no)\\s+(?:a\\s+|an\\s+)?"+type+"s?\\b","i");
    return re.test(lowered);
  }).map((x) => x.toUpperCase());
}

function mentionedBodyTypes(text: string) {
  return BODY_TYPES.filter((type) => new RegExp("\\b"+type+"s?\\b","i").test(text)).map((x) => x.toUpperCase());
}

function flexibilityObserved(text: string) {
  return /\b(?:could be|can be|open to|either|or maybe|doesn't have to be|does not have to be)\b/i.test(text);
}

function featureHints(text: string) {
  const out: string[] = [];
  if (/\b(?:third row|3rd row)\b/i.test(text)) out.push("third-row");
  if (/\b(?:apple carplay|carplay)\b/i.test(text)) out.push("carplay");
  if (/\b(?:heated seats?|heated front seats?)\b/i.test(text)) out.push("heated-seats");
  if (/\b(?:leather seats?|leather)\b/i.test(text)) out.push("leather");
  if (/\b(?:sunroof|moonroof|panoramic roof)\b/i.test(text)) out.push("sunroof");
  return uniq(out);
}

export function compileNorAutoMatchIntent(raw: string): IgniCheckConversationIntent {
  const text = clean(raw);
  const mentioned = mentionedBodyTypes(text);
  const excluded = excludedBodyTypes(text);
  const allowed = mentioned.filter((x) => !excluded.includes(x));
  const flexible = flexibilityObserved(text);

  return {
    schema: "ignicheck.conversation-intent.v0.1",
    rawText: text,
    goal: "Find or evaluate vehicles matching the shopper's stated constraints and preferences",
    bodyStylesMentioned: mentioned,
    bodyStylesAllowed: allowed,
    bodyStylesExcluded: excluded,
    maxPrice: moneyMax(text),
    maxMileage: mileageMax(text),
    featureHints: featureHints(text),
    fuelEconomyPreference: /\b(?:fuel economy|good on gas|good gas mileage|fuel efficient|mpg)\b/i.test(text),
    useCase: /\b(?:teen driver|new driver|first car)\b/i.test(text) ? "TEEN_OR_NEW_DRIVER" : null,
    flexibilityObserved: flexible,
    unknowns: text ? [] : ["No shopper text supplied"],
    truth: {
      deterministicExtraction: true,
      semanticModelUsed: false,
      userIntentFullyKnown: false,
    },
  };
}
