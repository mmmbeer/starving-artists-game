import { createGame } from "../../lib/game-store";
import { errorResponse } from "../../lib/api-response";
import {
  boundedString,
  rateLimitResponse,
  readJsonBody,
  requestErrorResponse,
} from "../../lib/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "game-create", {
    limit: 8,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = await readJsonBody<{
      hostName?: unknown;
      gameName?: unknown;
      avatar?: unknown;
    }>(request, 4 * 1024);
    if (
      (body.hostName !== undefined &&
        !boundedString(body.hostName, 64)) ||
      (body.gameName !== undefined &&
        !boundedString(body.gameName, 96))
    ) {
      return Response.json(
        { error: "Invalid game details.", code: "BAD_REQUEST" },
        { status: 400 },
      );
    }
    return Response.json(await createGame(body), { status: 201 });
  } catch (error) {
    return requestErrorResponse(error) ?? errorResponse(error);
  }
}
