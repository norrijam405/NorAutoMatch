export type LimitedJsonReadResult =
  | { ok: true; value: unknown; byteLength: number }
  | { ok: false; reason: "TOO_LARGE" | "INVALID_JSON" | "UNREADABLE_BODY" };

export async function readJsonBodyWithByteLimit(
  request: Request,
  maxBytes: number,
): Promise<LimitedJsonReadResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("REQUEST_BODY_LIMIT_INVALID_MAX_BYTES");
  }

  const declaredLength = request.headers.get("content-length")?.trim();
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      return { ok: false, reason: "TOO_LARGE" };
    }
  }

  if (!request.body) {
    return { ok: false, reason: "INVALID_JSON" };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel("REQUEST_BODY_TOO_LARGE");
        } catch {
          // Cancellation is best-effort; rejection has already been decided.
        }
        return { ok: false, reason: "TOO_LARGE" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "UNREADABLE_BODY" };
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    return { ok: false, reason: "INVALID_JSON" };
  }

  try {
    return { ok: true, value: JSON.parse(text), byteLength: totalBytes };
  } catch {
    return { ok: false, reason: "INVALID_JSON" };
  }
}
