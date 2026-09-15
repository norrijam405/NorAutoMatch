import type { InventoryProviderRecord, VinDecodeEvidence } from "./inventory-provider-contract";

const NHTSA_VPIC_BATCH_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVINValuesBatch/";
const MAX_BATCH_SIZE = 50;

export type NhtsaVpicEnrichmentOptions = {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

type VpicFlatResult = Record<string, unknown> & {
  VIN?: string;
  ModelYear?: string;
  Make?: string;
  Model?: string;
  Trim?: string;
  Manufacturer?: string;
  BodyClass?: string;
  VehicleType?: string;
  DriveType?: string;
  EngineCylinders?: string;
  DisplacementL?: string;
  FuelTypePrimary?: string;
  Doors?: string;
  TransmissionStyle?: string;
  PlantCity?: string;
  PlantCountry?: string;
  ErrorCode?: string;
  ErrorText?: string;
};

type VpicBatchResponse = {
  Results?: VpicFlatResult[];
};

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function cleanNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size));
  return output;
}

function toEvidence(result: VpicFlatResult, decodedAt: string): VinDecodeEvidence | undefined {
  const vin = cleanString(result.VIN)?.toUpperCase();
  if (!vin) return undefined;

  const evidence: VinDecodeEvidence = {
    source: "nhtsa-vpic",
    sourceUrl: NHTSA_VPIC_BATCH_URL,
    decodedAt,
    vin,
    modelYear: cleanString(result.ModelYear),
    make: cleanString(result.Make),
    model: cleanString(result.Model),
    trim: cleanString(result.Trim),
    manufacturer: cleanString(result.Manufacturer),
    bodyClass: cleanString(result.BodyClass),
    vehicleType: cleanString(result.VehicleType),
    driveType: cleanString(result.DriveType),
    engineCylinders: cleanNumber(result.EngineCylinders),
    displacementL: cleanNumber(result.DisplacementL),
    fuelTypePrimary: cleanString(result.FuelTypePrimary),
    doors: cleanNumber(result.Doors),
    transmissionStyle: cleanString(result.TransmissionStyle),
    plantCity: cleanString(result.PlantCity),
    plantCountry: cleanString(result.PlantCountry),
    errorCode: cleanString(result.ErrorCode),
    errorText: cleanString(result.ErrorText),
  };

  return evidence;
}

async function decodeBatch(
  records: InventoryProviderRecord[],
  options: NhtsaVpicEnrichmentOptions,
): Promise<VinDecodeEvidence[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const now = options.now ?? (() => new Date());
  const data = records.map((record) => `${record.vin},${record.modelYear}`).join(";");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(NHTSA_VPIC_BATCH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "NorAutoMatch-VIN-Enrichment/1.0",
      },
      body: new URLSearchParams({ format: "json", data }).toString(),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`NHTSA_VPIC_HTTP_${response.status}`);
    const payload = await response.json() as VpicBatchResponse;
    if (!Array.isArray(payload.Results)) throw new Error("NHTSA_VPIC_RESULTS_MISSING");
    const decodedAt = now().toISOString();
    return payload.Results.map((result) => toEvidence(result, decodedAt)).filter(Boolean) as VinDecodeEvidence[];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Decode provider VINs through NHTSA vPIC in batches of at most 50.
 * Dealer inventory remains the authority for availability, price, mileage,
 * trim, photos and advertised equipment. vPIC data is retained separately as
 * manufacturer-submitted technical evidence and never overwrites dealer truth.
 */
export async function enrichInventoryRecordsWithNhtsa(
  records: InventoryProviderRecord[],
  options: NhtsaVpicEnrichmentOptions = {},
): Promise<{ records: InventoryProviderRecord[]; missingVins: string[] }> {
  const decoded = new Map<string, VinDecodeEvidence>();
  for (const batch of chunk(records, MAX_BATCH_SIZE)) {
    const evidence = await decodeBatch(batch, options);
    for (const item of evidence) decoded.set(item.vin.toUpperCase(), item);
  }

  const missingVins: string[] = [];
  const enriched = records.map((record) => {
    const vinDecode = decoded.get(record.vin.toUpperCase());
    if (!vinDecode) {
      missingVins.push(record.vin);
      return record;
    }
    return { ...record, vinDecode };
  });

  return { records: enriched, missingVins };
}
