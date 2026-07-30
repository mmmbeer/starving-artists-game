import { env } from "cloudflare:workers";

export const CURATOR_COOKIE = "starving_artists_curator";
const SESSION_SECONDS = 60 * 60 * 12;
const SESSION_VERSION = "v1";
const PASSWORD_KDF_ITERATIONS = 120_000;

function configuredPassword(): string {
  const value = (env as unknown as { ADMIN_PASSWORD?: string }).ADMIN_PASSWORD;
  return typeof value === "string" ? value : "";
}

export function curatorPasswordConfigured(): boolean {
  return configuredPassword().length > 0;
}

function configuredSessionSecret(): string {
  const value = (env as unknown as { CURATOR_SESSION_SECRET?: string })
    .CURATOR_SESSION_SECRET;
  return typeof value === "string" ? value : "";
}

export function curatorSessionConfigured(): boolean {
  return configuredSessionSecret().length >= 32;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function passwordDigest(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(value),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return bytesToHex(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: encoder.encode("starving-artists-curator-password:v1"),
        iterations: PASSWORD_KDF_ITERATIONS,
      },
      material,
      256,
    ),
  );
}

function timingSafeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |=
      (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

async function signature(expiresAt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(configuredSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${SESSION_VERSION}:${expiresAt}`),
    ),
  );
}

export async function passwordIsValid(value: unknown): Promise<boolean> {
  const expected = configuredPassword();
  if (!expected || typeof value !== "string") return false;
  const [suppliedDigest, expectedDigest] = await Promise.all([
    passwordDigest(value),
    passwordDigest(expected),
  ]);
  return timingSafeEqual(suppliedDigest, expectedDigest);
}

export async function createCuratorSession(): Promise<string> {
  if (!curatorSessionConfigured()) {
    throw new Error("The curator session secret has not been configured.");
  }
  const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return `${SESSION_VERSION}.${expiresAt}.${await signature(expiresAt)}`;
}

function cookieValue(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  for (const item of cookie.split(";")) {
    const [name, ...parts] = item.trim().split("=");
    if (name === CURATOR_COOKIE) return decodeURIComponent(parts.join("="));
  }
  return null;
}

export async function isCuratorRequest(request: Request): Promise<boolean> {
  const value = cookieValue(request);
  if (!value || !curatorSessionConfigured()) return false;
  const [version, expiresAt, suppliedSignature] = value.split(".");
  if (
    version !== SESSION_VERSION ||
    !expiresAt ||
    !suppliedSignature
  ) {
    return false;
  }
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry < Math.floor(Date.now() / 1000)) {
    return false;
  }
  return timingSafeEqual(suppliedSignature, await signature(expiresAt));
}

export function curatorCookie(value: string, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${CURATOR_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; SameSite=Strict${secure}`;
}

export function clearCuratorCookie(request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${CURATOR_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure}`;
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
