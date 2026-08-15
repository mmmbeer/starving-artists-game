export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

type ErrorPayload = {
  error?: unknown;
  code?: unknown;
};

function parseJson(text: string): unknown {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  fallbackError = "The request could not be completed.",
): Promise<{ data: T | null; status: number }> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    throw new HttpError(
      error instanceof Error && error.message
        ? error.message
        : "The network connection was interrupted.",
      0,
      "NETWORK_ERROR",
    );
  }

  const payload = parseJson(await response.text());
  if (!response.ok) {
    const body =
      payload && typeof payload === "object" ? (payload as ErrorPayload) : {};
    throw new HttpError(
      typeof body.error === "string" && body.error
        ? body.error
        : fallbackError,
      response.status,
      typeof body.code === "string" ? body.code : undefined,
    );
  }

  return {
    data: payload as T | null,
    status: response.status,
  };
}

export function isRetryableHttpError(error: unknown): boolean {
  return (
    error instanceof HttpError &&
    (error.status === 0 || error.status === 408 || error.status >= 500)
  );
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
