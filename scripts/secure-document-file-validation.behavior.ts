import assert from "node:assert/strict";
import { detectSecureDocumentMime, validateSecureDocumentFile } from "../src/lib/secure-document-file-validation";

const pdf = new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x37]);
const jpeg = new Uint8Array([0xff,0xd8,0xff,0xe0,0x00]);
const png = new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00]);
const webp = new Uint8Array([0x52,0x49,0x46,0x46,0x01,0x00,0x00,0x00,0x57,0x45,0x42,0x50]);
const exe = new Uint8Array([0x4d,0x5a,0x90,0x00,0x03,0x00]);

assert.equal(detectSecureDocumentMime(pdf), "application/pdf");
assert.equal(detectSecureDocumentMime(jpeg), "image/jpeg");
assert.equal(detectSecureDocumentMime(png), "image/png");
assert.equal(detectSecureDocumentMime(webp), "image/webp");
assert.equal(detectSecureDocumentMime(exe), null);

assert.equal(validateSecureDocumentFile({ declaredMime: "application/pdf", byteSize: pdf.length, bytes: pdf }).ok, true);
assert.deepEqual(
  validateSecureDocumentFile({ declaredMime: "image/jpeg", byteSize: pdf.length, bytes: pdf }),
  { ok: false, reason: "MIME_SIGNATURE_MISMATCH" },
);
assert.deepEqual(
  validateSecureDocumentFile({ declaredMime: "application/octet-stream", byteSize: exe.length, bytes: exe }),
  { ok: false, reason: "DECLARED_TYPE_NOT_ALLOWED" },
);

console.log("PASS secure document file-signature validation");
