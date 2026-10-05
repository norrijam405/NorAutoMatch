export const SECURE_DOCUMENT_MAX_BYTES = 12 * 1024 * 1024;

export const SECURE_DOCUMENT_MIME_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
] as const);

function startsWith(bytes: Uint8Array, expected: number[]) {
  if (bytes.length < expected.length) return false;
  return expected.every((value, index) => bytes[index] === value);
}

export function detectSecureDocumentMime(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (
    bytes.length >= 12 &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return null;
}

export function validateSecureDocumentFile(input: {
  declaredMime: string;
  byteSize: number;
  bytes: Uint8Array;
}) {
  if (input.byteSize <= 0) return { ok: false as const, reason: "EMPTY_FILE" as const };
  if (input.byteSize > SECURE_DOCUMENT_MAX_BYTES) return { ok: false as const, reason: "FILE_TOO_LARGE" as const };
  if (!SECURE_DOCUMENT_MIME_EXTENSIONS.has(input.declaredMime as never)) {
    return { ok: false as const, reason: "DECLARED_TYPE_NOT_ALLOWED" as const };
  }
  const detectedMime = detectSecureDocumentMime(input.bytes);
  if (!detectedMime) return { ok: false as const, reason: "FILE_SIGNATURE_NOT_ALLOWED" as const };
  if (detectedMime !== input.declaredMime) return { ok: false as const, reason: "MIME_SIGNATURE_MISMATCH" as const };
  return {
    ok: true as const,
    mimeType: detectedMime,
    extension: SECURE_DOCUMENT_MIME_EXTENSIONS.get(detectedMime as never) as string,
  };
}
