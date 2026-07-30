import {
  createCanvasCatalog,
  reduceGame,
} from "./engine";
import type {
  GameAction,
  GameEnvelope,
  PaintCube,
} from "./types";

const HIDDEN_OUTCOME_ACTIONS = new Set<GameAction["type"]>([
  "START_GAME",
  "BUY_CANVAS",
]);

function placeholderPaint(version: number): PaintCube[] {
  return Array.from({ length: 32 }, (_, index) => ({
    id: `pending-${version}-${index}`,
    color: "wild" as const,
  }));
}

export function predictGameAction(
  envelope: GameEnvelope,
  playerId: string,
  action: GameAction,
  at = new Date().toISOString(),
): GameEnvelope {
  if (HIDDEN_OUTCOME_ACTIONS.has(action.type)) return envelope;

  try {
    const visible = structuredClone(envelope.game);
    if (visible.paintBag.length < 16) {
      visible.paintBag = placeholderPaint(visible.version);
    }
    const next = reduceGame(
      visible,
      playerId,
      action,
      at,
      createCanvasCatalog(Object.values(envelope.canvases)),
    );
    next.version = envelope.game.version + 1;
    next.paintBag = [];
    next.canvasDeck = envelope.game.canvasDeck;
    next.randomState = 0;
    return {
      game: next,
      canvases: envelope.canvases,
      serverTime: at,
    };
  } catch {
    return envelope;
  }
}
