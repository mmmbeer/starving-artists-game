import {
  applyGameAction,
} from "../../../../lib/game-store";
import { errorResponse } from "../../../../lib/api-response";
import type { GameAction } from "../../../../lib/types";
import {
  boundedString,
  boundedStringArray,
  normalizeGameCode,
  rateLimitResponse,
  readJsonBody,
  requestErrorResponse,
} from "../../../../lib/request-security";

export const dynamic = "force-dynamic";

function isGameAction(value: unknown): value is GameAction {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }
  const action = value as Record<string, unknown>;
  if (
    action.type === "START_GAME" ||
    action.type === "ABANDON_GAME" ||
    action.type === "WORK" ||
    action.type === "PASS"
  ) {
    return true;
  }
  if (action.type === "KICK_PLAYER") {
    return boundedString(action.playerId, 80);
  }
  if (action.type === "BUY_CANVAS") {
    return (
      Number.isInteger(action.slotIndex) &&
      Number(action.slotIndex) >= 0 &&
      Number(action.slotIndex) <= 2 &&
      boundedStringArray(action.paymentCubeIds, 3)
    );
  }
  if (action.type === "PAINT") {
    return (
      Array.isArray(action.placements) &&
      action.placements.length > 0 &&
      action.placements.length <= 4 &&
      action.placements.every(
        (entry) =>
          typeof entry === "object" &&
          entry !== null &&
          boundedString(
            (entry as Record<string, unknown>).canvasInstanceId,
            80,
          ) &&
          boundedString((entry as Record<string, unknown>).squareId, 80) &&
          boundedString((entry as Record<string, unknown>).cubeId, 80),
      )
    );
  }
  if (action.type === "TRADE_MARKET") {
    return (
      boundedStringArray(action.giveCubeIds, 9) &&
      boundedStringArray(action.takeCubeIds, 3)
    );
  }
  if (action.type === "DECLARE_SALES") {
    return boundedStringArray(action.canvasInstanceIds, 7);
  }
  if (action.type === "COLLECT_PAINT") {
    return boundedStringArray(action.cubeIds, 3);
  }
  return false;
}

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
    const body = await readJsonBody<{
      playerId?: unknown;
      token?: unknown;
      actionId?: unknown;
      expectedVersion?: unknown;
      action?: unknown;
    }>(request, 12 * 1024);
    if (
      !boundedString(body.playerId, 80) ||
      !boundedString(body.token, 128) ||
      !boundedString(body.actionId, 80) ||
      body.actionId.length < 8 ||
      typeof body.expectedVersion !== "number" ||
      !Number.isInteger(body.expectedVersion) ||
      body.expectedVersion < 0 ||
      body.expectedVersion > 1_000_000_000 ||
      !isGameAction(body.action)
    ) {
      return Response.json(
        { error: "Malformed game action.", code: "BAD_REQUEST" },
        { status: 400 },
      );
    }
    const limited = rateLimitResponse(
      request,
      "game-action",
      { limit: 120, windowMs: 60_000 },
      `${code}:${body.playerId}`,
    );
    if (limited) return limited;
    return Response.json(
      await applyGameAction({
        code,
        playerId: body.playerId,
        token: body.token,
        actionId: body.actionId,
        expectedVersion: body.expectedVersion,
        action: body.action,
      }),
    );
  } catch (error) {
    return requestErrorResponse(error) ?? errorResponse(error);
  }
}
