const DEFAULT_JSON_LIMIT = 12 * 1024;
const MAX_RATE_LIMIT_BUCKETS = 5_000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

const rateLimitBuckets = new Map<string, RateLimitEntry>();

export class RequestValidationError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "BAD_REQUEST",
  ) {
    super(message);
    this.name = "RequestValidationError";
  }
}

function clientAddress(request: Request): string {
  const direct = request.headers.get("cf-connecting-ip")?.trim();
  if (direct) return direct.slice(0, 80);
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",", 1)[0]
    ?.trim();
  return forwarded?.slice(0, 80) || "unknown";
}

function pruneExpiredBuckets(now: number) {
  if (rateLimitBuckets.size < MAX_RATE_LIMIT_BUCKETS) return;
  for (const [key, entry] of rateLimitBuckets) {
    if (entry.resetAt <= now) rateLimitBuckets.delete(key);
  }
  if (rateLimitBuckets.size < MAX_RATE_LIMIT_BUCKETS) return;
  const overflow = rateLimitBuckets.size - MAX_RATE_LIMIT_BUCKETS + 500;
  let removed = 0;
  for (const key of rateLimitBuckets.keys()) {
    rateLimitBuckets.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

export function rateLimitResponse(
  request: Request,
  route: string,
  rule: RateLimitRule,
  discriminator = "",
  now = Date.now(),
): Response | null {
  pruneExpiredBuckets(now);
  const key = `${route}:${clientAddress(request)}:${discriminator.slice(0, 120)}`;
  const current = rateLimitBuckets.get(key);
  const entry =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + rule.windowMs }
      : current;
  entry.count += 1;
  rateLimitBuckets.set(key, entry);
  if (entry.count <= rule.limit) return null;

  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  return Response.json(
    {
      error: "Too many requests. Wait briefly and try again.",
      code: "RATE_LIMITED",
    },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
      },
    },
  );
}

export async function readJsonBody<T>(
  request: Request,
  maximumBytes = DEFAULT_JSON_LIMIT,
): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new RequestValidationError(
      "Content-Type must be application/json.",
      415,
      "UNSUPPORTED_MEDIA_TYPE",
    );
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maximumBytes
  ) {
    throw new RequestValidationError(
      "Request body is too large.",
      413,
      "PAYLOAD_TOO_LARGE",
    );
  }

  if (!request.body) {
    throw new RequestValidationError("A JSON request body is required.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new RequestValidationError(
        "Request body is too large.",
        413,
        "PAYLOAD_TOO_LARGE",
      );
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const value = JSON.parse(new TextDecoder().decode(bytes)) as T;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("not an object");
    }
    return value;
  } catch {
    throw new RequestValidationError("Malformed JSON request body.");
  }
}

export function requestErrorResponse(error: unknown): Response | null {
  if (!(error instanceof RequestValidationError)) return null;
  return Response.json(
    { error: error.message, code: error.code },
    {
      status: error.status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export function normalizeGameCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{6,12}$/.test(code) ? code : null;
}

export function boundedString(
  value: unknown,
  maximum: number,
  allowEmpty = false,
): value is string {
  return (
    typeof value === "string" &&
    value.length <= maximum &&
    (allowEmpty || value.trim().length > 0)
  );
}

export function boundedStringArray(
  value: unknown,
  maximumEntries: number,
  maximumLength = 80,
): value is string[] {
  if (!Array.isArray(value) || value.length > maximumEntries) return false;
  const unique = new Set<string>();
  for (const entry of value) {
    if (!boundedString(entry, maximumLength) || unique.has(entry)) return false;
    unique.add(entry);
  }
  return true;
}

export function resetRateLimitsForTests() {
  rateLimitBuckets.clear();
}
