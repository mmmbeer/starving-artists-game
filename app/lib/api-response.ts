import { GameRuleError } from "./engine";

export function jsonError(
  message: string,
  status: number,
  code?: string,
): Response {
  return Response.json(code ? { error: message, code } : { error: message }, {
    status,
  });
}

export function internalErrorResponse(
  error: unknown,
  message = "The studio hit an unexpected problem.",
): Response {
  console.error(error);
  return jsonError(message, 500, "SERVER_ERROR");
}

export function errorResponse(error: unknown): Response {
  if (error instanceof GameRuleError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "UNAUTHORIZED"
          ? 401
          : error.code === "VERSION_CONFLICT"
            ? 409
            : 400;
    return jsonError(error.message, status, error.code);
  }
  return internalErrorResponse(error);
}
