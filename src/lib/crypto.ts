import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

// AES-256-GCM for secrets we must store (e.g. Google refresh tokens). Key: TOKEN_ENC_KEY (any long random string).
function key() {
  const k = process.env.TOKEN_ENC_KEY;
  if (!k || k.length < 32) throw new Error("TOKEN_ENC_KEY missing or too short");
  return createHash("sha256").update(k).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(blob: string): string {
  const [iv, tag, data] = blob.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}
