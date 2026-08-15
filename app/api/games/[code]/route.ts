import { getGame } from "../../../lib/game-store";
import { errorResponse } from "../../../lib/api-response";
import {
  normalizeGameCode,
  rateLimitResponse,
} from "../../../lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code: rawCode } = await context.params;
    const code = normalizeGameCode(rawCode);
    if (!code) {
      return Response.json(
        { error: "Game not found.", code: "NOT_FOUND" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    const limited = rateLimitResponse(
      request,
      "game-read",
      { limit: 90, windowMs: 60_000 },
      code,
    );
    if (limited) return limited;
    const url = new URL(request.url);
    const versionValue = url.searchParams.get("version");
    const knownVersion =
      versionValue !== null &&
      /^\d{1,10}$/.test(versionValue) &&
      Number(versionValue) <= 1_000_000_000
        ? Number(versionValue)
        : undefined;
    const game = await getGame(code, knownVersion);
    if (game === null) {
      return Response.json(
        { error: "Game not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    if (game === "unchanged") return new Response(null, { status: 204 });
    return Response.json(game, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
