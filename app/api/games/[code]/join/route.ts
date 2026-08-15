import { joinGame } from "../../../../lib/game-store";
import { errorResponse } from "../../../../lib/api-response";
import {
  boundedString,
  normalizeGameCode,
  rateLimitResponse,
  readJsonBody,
  requestErrorResponse,
} from "../../../../lib/request-security";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code: rawCode } = await context.params;
    const code = normalizeGameCode(rawCode);
    if (!code) {
      return Response.json(
        { error: "Game not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    const limited = rateLimitResponse(
      request,
      "game-join",
      { limit: 20, windowMs: 5 * 60_000 },
      code,
    );
    if (limited) return limited;
    const body = await readJsonBody<{
      displayName?: unknown;
      avatar?: unknown;
    }>(request, 4 * 1024);
    if (!boundedString(body.displayName, 64)) {
      return Response.json(
        { error: "Choose a valid artist name.", code: "BAD_REQUEST" },
        { status: 400 },
      );
    }
    return Response.json(await joinGame(code, body.displayName, body.avatar), {
      status: 201,
    });
  } catch (error) {
    return requestErrorResponse(error) ?? errorResponse(error);
  }
}
