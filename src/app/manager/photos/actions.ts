"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireNorAutoMembership } from "@/lib/supabase/authz";

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 12 * 1024 * 1024;
const BUCKET = "vehicle-lot-photos";

function normalizeVin(value: FormDataEntryValue | null) {
  const vin = String(value ?? "").trim().toUpperCase();
  if (!VIN_RE.test(vin)) throw new Error("Enter a valid 17-character VIN.");
  return vin;
}

async function operatorContext() {
  const membership = await requireNorAutoMembership(["operator", "admin", "founder"], "/manager/photos");
  return { userId: membership.userId, supabase: membership.supabase };
}

export async function uploadLotPhoto(formData: FormData) {
  const vin = normalizeVin(formData.get("vin"));
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a photo to upload.");
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Use a JPG, PNG, or WebP image.");
  if (file.size > MAX_BYTES) throw new Error("Photo must be 12 MB or smaller.");

  const { userId, supabase } = await operatorContext();
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${vin}/${randomUUID()}.${extension}`;

  const { data: current, error: listError } = await supabase
    .from("vehicle_photo_overrides")
    .select("id, sort_order, is_cover")
    .eq("vin", vin)
    .eq("active", true)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (listError) throw listError;

  const nextSort = current?.length ? current[0].sort_order + 1 : 0;
  const shouldCover = !current?.length;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("vehicle_photo_overrides").insert({
    vin,
    storage_path: path,
    sort_order: nextSort,
    is_cover: shouldCover,
    active: true,
    uploaded_by: userId,
  });

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw insertError;
  }

  revalidatePath(`/manager/photos?vin=${vin}`);
  revalidatePath(`/vehicles/${vin}`);
}

export async function setCoverPhoto(formData: FormData) {
  const vin = normalizeVin(formData.get("vin"));
  const photoId = String(formData.get("photoId") ?? "");
  if (!photoId) throw new Error("Missing photo id.");
  const { supabase } = await operatorContext();

  const { error: clearError } = await supabase
    .from("vehicle_photo_overrides")
    .update({ is_cover: false })
    .eq("vin", vin)
    .eq("active", true)
    .eq("is_cover", true);
  if (clearError) throw clearError;

  const { error: setError } = await supabase
    .from("vehicle_photo_overrides")
    .update({ is_cover: true })
    .eq("id", photoId)
    .eq("vin", vin)
    .eq("active", true);
  if (setError) throw setError;

  revalidatePath(`/manager/photos?vin=${vin}`);
  revalidatePath(`/vehicles/${vin}`);
}

export async function moveLotPhoto(formData: FormData) {
  const vin = normalizeVin(formData.get("vin"));
  const photoId = String(formData.get("photoId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!photoId || !["up", "down"].includes(direction)) throw new Error("Invalid reorder request.");
  const { supabase } = await operatorContext();

  const { data: rows, error } = await supabase
    .from("vehicle_photo_overrides")
    .select("id, sort_order")
    .eq("vin", vin)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;

  const index = rows.findIndex((row) => row.id === photoId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= rows.length) return;

  const current = rows[index];
  const swap = rows[swapIndex];
  const temp = Math.max(...rows.map((row) => row.sort_order), 0) + 1000;

  const { error: tempError } = await supabase.from("vehicle_photo_overrides").update({ sort_order: temp }).eq("id", current.id).eq("vin", vin);
  if (tempError) throw tempError;
  const { error: swapError } = await supabase.from("vehicle_photo_overrides").update({ sort_order: current.sort_order }).eq("id", swap.id).eq("vin", vin);
  if (swapError) throw swapError;
  const { error: finalError } = await supabase.from("vehicle_photo_overrides").update({ sort_order: swap.sort_order }).eq("id", current.id).eq("vin", vin);
  if (finalError) throw finalError;

  revalidatePath(`/manager/photos?vin=${vin}`);
  revalidatePath(`/vehicles/${vin}`);
}

export async function deactivateLotPhoto(formData: FormData) {
  const vin = normalizeVin(formData.get("vin"));
  const photoId = String(formData.get("photoId") ?? "");
  if (!photoId) throw new Error("Missing photo id.");
  const { supabase } = await operatorContext();

  const { data: target, error: targetError } = await supabase
    .from("vehicle_photo_overrides")
    .select("id, is_cover")
    .eq("id", photoId)
    .eq("vin", vin)
    .eq("active", true)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!target) return;

  const { error: deactivateError } = await supabase
    .from("vehicle_photo_overrides")
    .update({ active: false, is_cover: false })
    .eq("id", photoId)
    .eq("vin", vin);
  if (deactivateError) throw deactivateError;

  if (target.is_cover) {
    const { data: replacement, error: replacementError } = await supabase
      .from("vehicle_photo_overrides")
      .select("id")
      .eq("vin", vin)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (replacementError) throw replacementError;
    if (replacement) {
      const { error: coverError } = await supabase.from("vehicle_photo_overrides").update({ is_cover: true }).eq("id", replacement.id).eq("vin", vin);
      if (coverError) throw coverError;
    }
  }

  revalidatePath(`/manager/photos?vin=${vin}`);
  revalidatePath(`/vehicles/${vin}`);
}
