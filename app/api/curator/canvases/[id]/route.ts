import { saveCanvasDefinition } from "../../../../lib/canvas-catalog";
import {
  internalErrorResponse,
  jsonError,
} from "../../../../lib/api-response";
import {
  isCuratorRequest,
  sameOrigin,
} from "../../../../lib/curator-auth";
import {
  boundedString,
  rateLimitResponse,
  readJsonBody,
  requestErrorResponse,
} from "../../../../lib/request-security";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isCuratorRequest(request))) {
    return jsonError("Curator sign-in required.", 401);
  }
  if (!sameOrigin(request)) {
    return jsonError("Invalid request origin.", 403);
  }
  const { id } = await context.params;
  if (!boundedString(id, 160)) {
    return jsonError("Canvas not found.", 404);
  }
  const limited = rateLimitResponse(
    request,
    "curator-canvas-write",
    { limit: 60, windowMs: 60_000 },
    id,
  );
  if (limited) return limited;
  try {
    const body = await readJsonBody<unknown>(request, 24 * 1024);
    return Response.json({ canvas: await saveCanvasDefinition(id, body) });
  } catch (error) {
    const requestError = requestErrorResponse(error);
    if (requestError) return requestError;
    if (error instanceof Error && error.message === "Canvas not found.") {
      return jsonError(error.message, 404);
    }
    return internalErrorResponse(error, "The canvas could not be saved.");
  }
}
