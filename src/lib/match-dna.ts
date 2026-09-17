type MatchDnaEvent = {
  action: string;
  make: string | null;
  body_type: string | null;
  drivetrain: string | null;
  condition: string | null;
  price: number | null;
  mileage: number | null;
};

export type MatchDnaSummary = {
  signalCount: number;
  label: string;
  traits: string[];
  priceCenter?: number;
  mileageCenter?: number;
};

const weights: Record<string, number> = {
  keep: 3,
  garage_save: 3,
  battle: 1.25,
  mix: 0.1,
  pass: -2,
  garage_remove: -3,
};

export function buildMatchDnaSummary(events: MatchDnaEvent[]): MatchDnaSummary {
  if (events.length === 0) return { signalCount: 0, label: "Learning from your choices", traits: [] };

  const positive = events.filter((event) => (weights[event.action] ?? 0) > 0);
  const makeScores = scoreField(events, "make");
  const bodyScores = scoreField(events, "body_type");
  const driveScores = scoreField(events, "drivetrain");
  const conditionScores = scoreField(events, "condition");

  const traits = [
    topPositive(bodyScores),
    topPositive(driveScores),
    topPositive(makeScores),
    topPositive(conditionScores),
  ].filter((value): value is string => Boolean(value)).slice(0, 3);

  const positivePrices = positive.map((event) => event.price).filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
  const positiveMiles = positive.map((event) => event.mileage).filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);

  return {
    signalCount: events.length,
    label: traits.length > 0 ? `Learning: ${traits.join(" · ")}` : "Learning from your choices",
    traits,
    priceCenter: median(positivePrices),
    mileageCenter: median(positiveMiles),
  };
}

function scoreField(events: MatchDnaEvent[], field: "make" | "body_type" | "drivetrain" | "condition") {
  const scores = new Map<string, number>();
  for (const event of events) {
    const value = event[field]?.trim();
    if (!value) continue;
    scores.set(value, (scores.get(value) ?? 0) + (weights[event.action] ?? 0));
  }
  return scores;
}

function topPositive(scores: Map<string, number>) {
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0] && ranked[0][1] > 0 ? ranked[0][0] : undefined;
}

function median(values: number[]) {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}
