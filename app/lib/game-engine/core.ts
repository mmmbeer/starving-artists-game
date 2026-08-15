import { CANVASES } from "../canvas-data";
import type {
  CanvasDefinition,
  GameState,
  OwnedCanvas,
  PaintColor,
  PaintCube,
  PlayerState,
} from "../types";

export interface CanvasCatalog {
  all: CanvasDefinition[];
  map: Map<string, CanvasDefinition>;
  playable: CanvasDefinition[];
}

export function createCanvasCatalog(
  canvases: CanvasDefinition[],
): CanvasCatalog {
  return {
    all: canvases,
    map: new Map(canvases.map((canvas) => [canvas.id, canvas])),
    playable: canvases.filter((canvas) => canvas.squares.length > 0),
  };
}

export const DEFAULT_CANVAS_CATALOG = createCanvasCatalog(CANVASES);
export const REGULAR_COLORS: PaintColor[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "black",
];
export const TRADE_RATES = new Map([
  [1, 2],
  [2, 5],
  [3, 9],
]);

export class GameRuleError extends Error {
  code: string;

  constructor(message: string, code = "INVALID_ACTION") {
    super(message);
    this.code = code;
  }
}

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function nextRandom(state: GameState): number {
  let value = state.randomState >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.randomState = value >>> 0;
  return state.randomState / 0x100000000;
}

export function shuffle<T>(state: GameState, items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(nextRandom(state) * (index + 1));
    [result[index], result[selected]] = [result[selected], result[index]];
  }
  return result;
}

export function draw(state: GameState, count: number): PaintCube[] {
  if (count <= 0 || state.paintBag.length === 0) return [];
  return state.paintBag.splice(0, Math.min(count, state.paintBag.length));
}

export function addLog(
  state: GameState,
  text: string,
  at: string,
  tone: "neutral" | "good" | "warning" = "neutral",
) {
  state.log.push({
    id: `log-${state.version + 1}-${state.log.length + 1}`,
    at,
    text,
    tone,
  });
  state.log = state.log.slice(-80);
}

export function canvasDefinition(
  id: string,
  catalog: CanvasCatalog,
): CanvasDefinition {
  const definition = catalog.map.get(id);
  if (!definition) {
    throw new GameRuleError("That canvas is no longer available.", "CANVAS_MISSING");
  }
  return definition;
}

export function playerById(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new GameRuleError("This player is not part of the game.", "PLAYER_MISSING");
  }
  return player;
}

export function currentPlayerId(state: GameState): string | null {
  return state.turnOrder[state.currentTurnIndex] ?? null;
}

export function requireTurn(state: GameState, playerId: string) {
  if (currentPlayerId(state) !== playerId) {
    throw new GameRuleError("It is not your turn.", "NOT_YOUR_TURN");
  }
}

export function uniqueIds(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length) {
    throw new GameRuleError(`${label} contains the same item more than once.`);
  }
}

export function refillCanvasMarket(state: GameState) {
  while (state.canvasMarket.length < 3 && state.canvasDeck.length > 0) {
    const next = state.canvasDeck.shift();
    if (next) state.canvasMarket.push(next);
  }
}

export function makePaintBag(): PaintCube[] {
  const cubes: PaintCube[] = [];
  for (const color of REGULAR_COLORS) {
    for (let index = 1; index <= 20; index += 1) {
      cubes.push({ id: `${color}-${index}`, color });
    }
  }
  for (let index = 1; index <= 10; index += 1) {
    cubes.push({ id: `wild-${index}`, color: "wild" });
  }
  return cubes;
}

export function completeCanvas(
  canvas: OwnedCanvas,
  catalog: CanvasCatalog,
): boolean {
  return (
    Object.keys(canvas.placedCubes).length ===
    canvasDefinition(canvas.definitionId, catalog).squares.length
  );
}

export function createOwnedCanvas(definitionId: string, state: GameState): OwnedCanvas {
  return {
    instanceId: `${definitionId}-${state.version + 1}-${state.log.length + 1}`,
    definitionId,
    placedCubes: {},
  };
}

export function thresholds(playerCount: number) {
  if (playerCount <= 2) return { paintings: 7, points: 16 };
  if (playerCount === 3) return { paintings: 6, points: 14 };
  return { paintings: 5, points: 12 };
}

export function rankWinners(state: GameState): string[] {
  const candidates = [...state.players].sort(
    (left, right) =>
      right.score - left.score ||
      right.soldCanvasCount - left.soldCanvasCount ||
      right.nutrition - left.nutrition ||
      right.studioCubes.length - left.studioCubes.length ||
      left.order - right.order,
  );
  if (candidates.length === 0) return [];
  const best = candidates[0];
  return candidates
    .filter(
      (candidate) =>
        candidate.score === best.score &&
        candidate.soldCanvasCount === best.soldCanvasCount &&
        candidate.nutrition === best.nutrition &&
        candidate.studioCubes.length === best.studioCubes.length,
    )
    .map((candidate) => candidate.id);
}

export function endGame(state: GameState, at: string, reason: string) {
  state.phase = "ENDED";
  state.status = "ENDED";
  state.turnOrder = [];
  state.currentTurnIndex = 0;
  state.selling = null;
  state.winnerIds = rankWinners(state);
  addLog(state, reason, at, "good");
}

export function shouldEndForAchievement(state: GameState): boolean {
  if (state.players.length === 1) return false;
  const target = thresholds(state.players.length);
  return state.players.some(
    (player) =>
      player.score >= target.points || player.soldCanvasCount >= target.paintings,
  );
}

export function advanceToNextDay(state: GameState, at: string) {
  if (shouldEndForAchievement(state)) {
    endGame(state, at, "The final sale closes the exhibition.");
    return;
  }
  if (
    state.starvationFinalDay !== null &&
    state.day >= state.starvationFinalDay
  ) {
    endGame(state, at, "The final day after starvation is complete.");
    return;
  }

  if (state.players.length === 1) {
    if (state.canvasMarket.length > 0) {
      state.canvasMarket.shift();
      refillCanvasMarket(state);
    }
    if (state.canvasMarket.length === 0 && state.canvasDeck.length === 0) {
      endGame(state, at, "The solo canvas deck is exhausted.");
      return;
    }
  }

  state.day += 1;
  const dailyPaint = draw(state, 4);
  state.paintMarket.push(...dailyPaint);
  const currentFirstIndex = state.players.findIndex(
    (player) => player.id === state.firstPlayerId,
  );
  const nextFirstIndex =
    currentFirstIndex < 0 ? 0 : (currentFirstIndex + 1) % state.players.length;
  state.firstPlayerId = state.players[nextFirstIndex]?.id ?? null;

  for (const player of state.players) {
    player.nutrition = Math.max(0, player.nutrition - 1);
    if (player.nutrition === 0) player.starved = true;
  }
  if (
    state.starvationFinalDay === null &&
    state.players.some((player) => player.starved)
  ) {
    state.starvationFinalDay = state.day;
    addLog(
      state,
      "An artist has starved. This is the final day for the remaining artists.",
      at,
      "warning",
    );
  }

  const activePlayers = state.players.filter((player) => !player.starved);
  if (activePlayers.length === 0) {
    endGame(state, at, "Every artist has starved.");
    return;
  }
  const canonical = activePlayers.map((player) => player.id);
  const pivot = canonical.indexOf(state.firstPlayerId ?? canonical[0]);
  state.turnOrder =
    pivot <= 0
      ? canonical
      : [...canonical.slice(pivot), ...canonical.slice(0, pivot)];
  state.phase = "MORNING";
  state.currentTurnIndex = 0;
  state.selling = null;
  addLog(
    state,
    `Day ${state.day} begins. ${dailyPaint.length} new paint cube${dailyPaint.length === 1 ? "" : "s"} enter the market and nutrition falls by one.`,
    at,
  );
}

export function finishCollection(state: GameState, at: string) {
  advanceToNextDay(state, at);
}

export function findNextCollector(state: GameState, fromIndex: number): number | null {
  const selling = state.selling;
  if (!selling || selling.order.length === 0) return null;
  for (let offset = 1; offset <= selling.order.length; offset += 1) {
    const index = (fromIndex + offset) % selling.order.length;
    const playerId = selling.order[index];
    if ((selling.quotas[playerId] ?? 0) > 0) return index;
  }
  return null;
}

export function settleDeclaredSales(
  state: GameState,
  at: string,
  catalog: CanvasCatalog,
) {
  const selling = state.selling;
  if (!selling) return;
  const paintTotals: Record<string, number> = {};
  const returnedPaint: PaintCube[] = [];

  for (const player of state.players) {
    const declared = selling.declarations[player.id] ?? [];
    let paintTotal = 0;
    for (const instanceId of declared) {
      const canvas = player.canvases.find(
        (entry) => entry.instanceId === instanceId,
      );
      if (!canvas || !completeCanvas(canvas, catalog)) continue;
      const definition = canvasDefinition(canvas.definitionId, catalog);
      player.score += definition.starValue;
      const nutritionRoom = Math.max(0, 5 - player.nutrition);
      const nutritionGain = Math.min(nutritionRoom, definition.foodValue);
      const excessFood = definition.foodValue - nutritionGain;
      player.nutrition += nutritionGain;
      player.studioCubes.push(...draw(state, excessFood));
      returnedPaint.push(...Object.values(canvas.placedCubes));
      player.soldCanvasCount += 1;
      paintTotal += definition.paintValue;
      addLog(
        state,
        `${player.displayName} sold ${definition.title} for ${definition.starValue} fame.`,
        at,
        "good",
      );
    }
    if (declared.length > 0) {
      const sold = new Set(declared);
      player.canvases = player.canvases.filter(
        (canvas) => !sold.has(canvas.instanceId),
      );
    }
    paintTotals[player.id] = paintTotal;
  }
  state.paintBag = shuffle(state, [...state.paintBag, ...returnedPaint]);

  const order = state.players
    .filter((player) => paintTotals[player.id] > 0)
    .sort(
      (left, right) =>
        paintTotals[right.id] - paintTotals[left.id] ||
        left.order - right.order,
    )
    .map((player) => player.id);
  selling.order = order;
  selling.quotas = paintTotals;
  selling.pickSizes = {};
  order.forEach((playerId, index) => {
    selling.pickSizes[playerId] = index === 0 ? 4 : index === 1 ? 2 : 1;
  });
  selling.stage = "COLLECTION";
  selling.currentIndex = 0;
  state.turnOrder = order;
  state.currentTurnIndex = 0;

  if (order.length === 0 || state.paintMarket.length === 0) {
    finishCollection(state, at);
  }
}

export function finishActionTurn(state: GameState, at: string) {
  state.currentTurnIndex += 1;
  if (state.currentTurnIndex < state.turnOrder.length) return;
  state.currentTurnIndex = 0;
  if (state.phase === "MORNING") {
    state.phase = "AFTERNOON";
    addLog(state, "The afternoon action phase begins.", at);
    return;
  }
  if (state.phase === "AFTERNOON") {
    state.phase = "SELLING";
    state.selling = {
      stage: "DECLARATIONS",
      declarations: {},
      quotas: {},
      pickSizes: {},
      order: [...state.turnOrder],
      currentIndex: 0,
    };
    addLog(state, "Night falls. Completed canvases may now be sold.", at);
  }
}


