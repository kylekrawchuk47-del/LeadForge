import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { logger } from "./logger";

const ALG = "aes-256-gcm";
const PREFIX = "enc:v1:";

/**
 * Derives a 32-byte key from ADS_TOKEN_ENCRYPTION_KEY using scrypt.
 * Falls back to a deterministic dev key if the env var is not set (warns loudly).
 */
function getDerivedKey(): Buffer {
  const raw = process.env.ADS_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    logger.warn("ADS_TOKEN_ENCRYPTION_KEY is not set — OAuth tokens are stored unencrypted. Set this secret before going to production.");
    return scryptSync("leadforge-dev-insecure-key", "leadforge-salt", 32);
  }
  return scryptSync(raw, "leadforge-ads-salt-v1", 32);
}

let _key: Buffer | null = null;
function key(): Buffer {
  if (!_key) _key = getDerivedKey();
  return _key;
}

/** Encrypts a plaintext string. Returns `enc:v1:<iv_b64>:<cipher_b64>:<tag_b64>`. */
export function encryptToken(plaintext: string): string {
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALG, key(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString("base64")}:${encrypted.toString("base64")}:${tag.toString("base64")}`;
  } catch (err) {
    logger.error({ err }, "token encryption failed — storing plaintext");
    return plaintext;
  }
}

/** Decrypts a value produced by `encryptToken`. Returns plaintext.
 *  If the value does not start with the prefix, returns it as-is (migration compat). */
export function decryptToken(value: string): string {
  if (!value.startsWith(PREFIX)) return value; // stored plaintext, migration compat
  try {
    const rest = value.slice(PREFIX.length);
    const [ivB64, cipherB64, tagB64] = rest.split(":");
    const iv = Buffer.from(ivB64, "base64");
    const ciphertext = Buffer.from(cipherB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const decipher = createDecipheriv(ALG, key(), iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
  } catch (err) {
    logger.error({ err }, "token decryption failed");
    throw new Error("Failed to decrypt stored token — please reconnect your ad account");
  }
}
