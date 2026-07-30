import { saveCanvasDefinition } from "../../../../lib/canvas-catalog";
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
    return Response.json({ error: "Curator sign-in required." }, { status: 401 });
  }
  if (!sameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const { id } = await context.params;
  if (!boundedString(id, 160)) {
    return Response.json({ error: "Canvas not found." }, { status: 404 });
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
      return Response.json({ error: error.message }, { status: 404 });
    }
    console.error(error);
    return Response.json(
      { error: "The canvas could not be saved." },
      { status: 500 },
    );
  }
}
