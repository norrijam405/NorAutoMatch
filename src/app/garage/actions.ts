"use server";

import { createClient } from "@/lib/supabase/server";

export type MatchDnaAction = "pass" | "keep" | "mix" | "garage_save" | "garage_remove" | "battle";

type ActionResult = {
  ok: boolean;
  authRequired?: boolean;
  saved?: boolean;
  scoutQueued?: boolean;
  error?: string;
};

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

async function authenticatedContext() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string" || !userId) return { supabase, userId: null };
  return { supabase, userId };
}

async function insertMatchDnaEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  vin: string,
  action: MatchDnaAction,
  surface: string,
) {
  const { data: vehicle } = await supabase
    .from("inventory_vehicles")
    .select("vin,year,make,model,trim,condition,body_type,drivetrain,price,mileage")
    .eq("vin", vin)
    .maybeSingle();

  return supabase.from("match_dna_events").insert({
    user_id: userId,
    vin,
    action,
    surface: surface.slice(0, 80),
    year: vehicle?.year ?? null,
    make: vehicle?.make ?? null,
    model: vehicle?.model ?? null,
    trim: vehicle?.trim ?? null,
    condition: vehicle?.condition ?? null,
    body_type: vehicle?.body_type ?? null,
    drivetrain: vehicle?.drivetrain ?? null,
    price: vehicle?.price ?? null,
    mileage: vehicle?.mileage ?? null,
  });
}

export async function recordMatchDnaSignal(
  vinInput: string,
  action: MatchDnaAction,
  surface = "unknown",
): Promise<ActionResult> {
  const vin = vinInput.trim().toUpperCase();
  if (!VIN_RE.test(vin)) return { ok: false, error: "invalid_vin" };

  const { supabase, userId } = await authenticatedContext();
  if (!userId) return { ok: false, authRequired: true };

  const { error } = await insertMatchDnaEvent(supabase, userId, vin, action, surface);
  return error ? { ok: false, error: "dna_event_failed" } : { ok: true };
}

export async function saveVehicleToGarage(
  vinInput: string,
  surface = "unknown",
): Promise<ActionResult> {
  const vin = vinInput.trim().toUpperCase();
  if (!VIN_RE.test(vin)) return { ok: false, error: "invalid_vin" };

  const { supabase, userId } = await authenticatedContext();
  if (!userId) return { ok: false, authRequired: true };

  const { error: saveError } = await supabase
    .from("saved_vehicles")
    .upsert({ user_id: userId, vin }, { onConflict: "user_id,vin", ignoreDuplicates: true });

  if (saveError) return { ok: false, error: "garage_save_failed" };

  const [dnaResult, scoutResult] = await Promise.all([
    insertMatchDnaEvent(supabase, userId, vin, "garage_save", surface),
    supabase
      .from("market_scout_jobs")
      .upsert(
        { user_id: userId, vin, status: "queued", requested_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_error: null },
        { onConflict: "user_id,vin", ignoreDuplicates: true },
      ),
  ]);

  return {
    ok: true,
    saved: true,
    scoutQueued: !scoutResult.error,
    error: dnaResult.error ? "saved_without_dna_event" : undefined,
  };
}

export async function removeVehicleFromGarage(
  vinInput: string,
  surface = "garage",
): Promise<ActionResult> {
  const vin = vinInput.trim().toUpperCase();
  if (!VIN_RE.test(vin)) return { ok: false, error: "invalid_vin" };

  const { supabase, userId } = await authenticatedContext();
  if (!userId) return { ok: false, authRequired: true };

  const { error } = await supabase
    .from("saved_vehicles")
    .delete()
    .eq("user_id", userId)
    .eq("vin", vin);

  if (error) return { ok: false, error: "garage_remove_failed" };
  await insertMatchDnaEvent(supabase, userId, vin, "garage_remove", surface);
  return { ok: true, saved: false };
}
