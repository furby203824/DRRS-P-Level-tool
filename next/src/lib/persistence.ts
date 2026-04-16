/**
 * Unit profile persistence — LocalStorage + optional Web Crypto
 * encrypted export/import.
 *
 * UIC / Unit Name are derived from the T/O CSV and not stored here.
 * Only operator-supplied values (as-of date, policy toggle) are
 * persisted.
 */

// ---------------------------------------------------------------------------
// LocalStorage
// ---------------------------------------------------------------------------

const PROFILE_KEY = "drrs-plevel.unitProfile.v1";

export interface ProfileData {
  asOf: string;
  policy: { countLimitedAsNonDeployable: boolean };
}

export function loadProfile(): ProfileData | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProfileData;
  } catch {
    return null;
  }
}

export function saveProfile(data: ProfileData): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
  } catch { /* quota or privacy mode */ }
}

export function clearProfile(): void {
  try { localStorage.removeItem(PROFILE_KEY); } catch { /* */ }
}

export { PROFILE_KEY };

// ---------------------------------------------------------------------------
// Web Crypto (AES-256-GCM + PBKDF2-SHA256)
// ---------------------------------------------------------------------------

const PBKDF2_ITERATIONS = 600_000;

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes));
}
function b64decode(str: string): Uint8Array {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

// Helper: ensure a plain ArrayBuffer for crypto.subtle calls (strict TS
// doesn't accept Uint8Array directly as BufferSource in some lib versions).
function toAB(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toAB(new TextEncoder().encode(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toAB(salt), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface EncryptedEnvelope {
  schema: string;
  encrypted: true;
  cipher: string;
  kdf: string;
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  exportedAt: string;
}

export async function encryptProfile(
  profile: ProfileData,
  passphrase: string,
): Promise<EncryptedEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const pt = new TextEncoder().encode(JSON.stringify(profile));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toAB(iv) }, key, toAB(pt));
  return {
    schema: "drrs-plevel-unit-profile.v2",
    encrypted: true,
    cipher: "AES-GCM-256",
    kdf: "PBKDF2-SHA256",
    iterations: PBKDF2_ITERATIONS,
    salt: b64encode(salt),
    iv: b64encode(iv),
    ciphertext: b64encode(ct),
    exportedAt: new Date().toISOString(),
  };
}

export async function decryptProfile(
  envelope: EncryptedEnvelope,
  passphrase: string,
): Promise<ProfileData> {
  const salt = b64decode(envelope.salt);
  const iv = b64decode(envelope.iv);
  const ct = b64decode(envelope.ciphertext);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toAB(iv) }, key, toAB(ct));
  return JSON.parse(new TextDecoder().decode(pt)) as ProfileData;
}

export const CRYPTO_MIN_PASSPHRASE = 8;
