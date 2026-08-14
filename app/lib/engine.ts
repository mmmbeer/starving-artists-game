import { CANVASES } from "./canvas-data";
import {
  defaultPlayerAvatar,
  isPlayerAvatar,
} from "./player-identities";
import type {
  CanvasDefinition,
  GameAction,
  GameState,
  OwnedCanvas,
  PaintColor,
  PaintCube,
  PlayerAvatar,
  PlayerState,
} from "./types";

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

const DEFAULT_CANVAS_CATALOG = createCanvasCatalog(CANVASES);
const REGULAR_COLORS: PaintColor[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "black",
];
const TRADE_RATES = new Map([
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

function clone<T>(value: T): T {
  return structuredClone(value);
}

function nextRandom(state: GameState): number {
  let value = state.randomState >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.randomState = value >>> 0;
  return state.randomState / 0x100000000;
}

function shuffle<T>(state: GameState, items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(nextRandom(state) * (index + 1));
    [result[index], result[selected]] = [result[selected], result[index]];
  }
  return result;
}

function draw(state: GameState, count: number): PaintCube[] {
  if (count <= 0 || state.paintBag.length === 0) return [];
  return state.paintBag.splice(0, Math.min(count, state.paintBag.length));
}

function addLog(
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

function canvasDefinition(
  id: string,
  catalog: CanvasCatalog,
): CanvasDefinition {
  const definition = catalog.map.get(id);
  if (!definition) {
    throw new GameRuleError("That canvas is no longer available.", "CANVAS_MISSING");
  }
  return definition;
}

function playerById(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new GameRuleError("This player is not part of the game.", "PLAYER_MISSING");
  }
  return player;
}

function currentPlayerId(state: GameState): string | null {
  return state.turnOrder[state.currentTurnIndex] ?? null;
}

function requireTurn(state: GameState, playerId: string) {
  if (currentPlayerId(state) !== playerId) {
    throw new GameRuleError("It is not your turn.", "NOT_YOUR_TURN");
  }
}

function uniqueIds(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length) {
    throw new GameRuleError(`${label} contains the same item more than once.`);
  }
}

function refillCanvasMarket(state: GameState) {
  while (state.canvasMarket.length < 3 && state.canvasDeck.length > 0) {
    const next = state.canvasDeck.shift();
    if (next) state.canvasMarket.push(next);
  }
}

function makePaintBag(): PaintCube[] {
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

function completeCanvas(
  canvas: OwnedCanvas,
  catalog: CanvasCatalog,
): boolean {
  return (
    Object.keys(canvas.placedCubes).length ===
    canvasDefinition(canvas.definitionId, catalog).squares.length
  );
}

function createOwnedCanvas(definitionId: string, state: GameState): OwnedCanvas {
  return {
    instanceId: `${definitionId}-${state.version + 1}-${state.log.length + 1}`,
    definitionId,
    placedCubes: {},
  };
}

function thresholds(playerCount: number) {
  if (playerCount <= 2) return { paintings: 7, points: 16 };
  if (playerCount === 3) return { paintings: 6, points: 14 };
  return { paintings: 5, points: 12 };
}

function rankWinners(state: GameState): string[] {
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

function endGame(state: GameState, at: string, reason: string) {
  state.phase = "ENDED";
  state.status = "ENDED";
  state.turnOrder = [];
  state.currentTurnIndex = 0;
  state.selling = null;
  state.winnerIds = rankWinners(state);
  addLog(state, reason, at, "good");
}

function shouldEndForAchievement(state: GameState): boolean {
  if (state.players.length === 1) return false;
  const target = thresholds(state.players.length);
  return state.players.some(
    (player) =>
      player.score >= target.points || player.soldCanvasCount >= target.paintings,
  );
}

function advanceToNextDay(state: GameState, at: string) {
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

function finishCollection(state: GameState, at: string) {
  advanceToNextDay(state, at);
}

function findNextCollector(state: GameState, fromIndex: number): number | null {
  const selling = state.selling;
  if (!selling || selling.order.length === 0) return null;
  for (let offset = 1; offset <= selling.order.length; offset += 1) {
    const index = (fromIndex + offset) % selling.order.length;
    const playerId = selling.order[index];
    if ((selling.quotas[playerId] ?? 0) > 0) return index;
  }
  return null;
}

function settleDeclaredSales(
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

function finishActionTurn(state: GameState, at: string) {
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

function kickPlayer(
  state: GameState,
  actorId: string,
  targetPlayerId: string,
  at: string,
  catalog: CanvasCatalog,
) {
  if (state.hostPlayerId !== actorId) {
    throw new GameRuleError(
      "Only the host may remove a player.",
      "HOST_ONLY",
    );
  }
  if (targetPlayerId === state.hostPlayerId) {
    throw new GameRuleError(
      "The host cannot remove themselves. Abandon the game instead.",
      "CANNOT_KICK_HOST",
    );
  }

  const targetIndex = state.players.findIndex(
    (player) => player.id === targetPlayerId,
  );
  const target = state.players[targetIndex];
  if (!target) {
    throw new GameRuleError(
      "That player is no longer in the game.",
      "PLAYER_MISSING",
    );
  }

  const previousTurnOrder = [...state.turnOrder];
  const previousCurrentIndex = state.currentTurnIndex;
  const previousCurrentPlayerId =
    previousTurnOrder[previousCurrentIndex] ?? null;
  const targetTurnIndex = previousTurnOrder.indexOf(targetPlayerId);

  if (state.status === "ACTIVE") {
    const returnedCubes = [
      ...target.studioCubes,
      ...target.canvases.flatMap((canvas) =>
        Object.values(canvas.placedCubes),
      ),
    ];
    state.paintBag = shuffle(state, [...state.paintBag, ...returnedCubes]);
    state.canvasDeck = shuffle(state, [
      ...state.canvasDeck,
      ...target.canvases.map((canvas) => canvas.definitionId),
    ]);
  }

  state.players.splice(targetIndex, 1);
  state.players.forEach((player, index) => {
    player.order = index + 1;
  });
  state.turnOrder = previousTurnOrder.filter(
    (playerId) => playerId !== targetPlayerId,
  );

  if (state.firstPlayerId === targetPlayerId) {
    state.firstPlayerId =
      state.players[targetIndex % state.players.length]?.id ??
      state.players[0]?.id ??
      null;
  }

  if (state.selling) {
    delete state.selling.declarations[targetPlayerId];
    delete state.selling.quotas[targetPlayerId];
    delete state.selling.pickSizes[targetPlayerId];
    state.selling.order = state.selling.order.filter(
      (playerId) => playerId !== targetPlayerId,
    );
  }

  addLog(state, `${target.displayName} was removed by the host.`, at, "warning");

  if (state.status === "LOBBY") {
    state.currentTurnIndex = 0;
    return;
  }

  if (
    state.phase === "SELLING" &&
    state.selling?.stage === "COLLECTION"
  ) {
    state.turnOrder = [...state.selling.order];
    if (state.turnOrder.length === 0 || state.paintMarket.length === 0) {
      finishCollection(state, at);
      return;
    }

    const preservedCurrentIndex = previousCurrentPlayerId
      ? state.turnOrder.indexOf(previousCurrentPlayerId)
      : -1;
    const startIndex =
      preservedCurrentIndex >= 0
        ? preservedCurrentIndex
        : Math.max(0, targetTurnIndex) % state.turnOrder.length;
    let nextIndex: number | null = null;
    for (let offset = 0; offset < state.turnOrder.length; offset += 1) {
      const candidateIndex = (startIndex + offset) % state.turnOrder.length;
      const candidateId = state.turnOrder[candidateIndex];
      if ((state.selling.quotas[candidateId] ?? 0) > 0) {
        nextIndex = candidateIndex;
        break;
      }
    }
    if (nextIndex === null) {
      finishCollection(state, at);
      return;
    }
    state.selling.currentIndex = nextIndex;
    state.currentTurnIndex = nextIndex;
    return;
  }

  if (
    state.phase === "SELLING" &&
    state.selling?.stage === "DECLARATIONS"
  ) {
    if (state.turnOrder.length === 0) {
      settleDeclaredSales(state, at, catalog);
      return;
    }
    const preservedCurrentIndex = previousCurrentPlayerId
      ? state.turnOrder.indexOf(previousCurrentPlayerId)
      : -1;
    if (preservedCurrentIndex >= 0) {
      state.currentTurnIndex = preservedCurrentIndex;
      return;
    }
    if (targetTurnIndex >= state.turnOrder.length) {
      state.currentTurnIndex = 0;
      settleDeclaredSales(state, at, catalog);
      return;
    }
    state.currentTurnIndex = Math.max(0, targetTurnIndex);
    return;
  }

  if (state.turnOrder.length === 0) {
    endGame(state, at, "No active artists remain in the studio.");
    return;
  }

  const preservedCurrentIndex = previousCurrentPlayerId
    ? state.turnOrder.indexOf(previousCurrentPlayerId)
    : -1;
  if (preservedCurrentIndex >= 0) {
    state.currentTurnIndex = preservedCurrentIndex;
    return;
  }
  if (targetTurnIndex >= state.turnOrder.length) {
    state.currentTurnIndex = state.turnOrder.length - 1;
    finishActionTurn(state, at);
    return;
  }
  state.currentTurnIndex = Math.max(0, targetTurnIndex);
}

function startGame(
  state: GameState,
  actorId: string,
  at: string,
  catalog: CanvasCatalog,
) {
  if (state.status !== "LOBBY") {
    throw new GameRuleError("This game has already started.");
  }
  if (state.hostPlayerId !== actorId) {
    throw new GameRuleError("Only the host may start the game.", "HOST_ONLY");
  }
  if (state.players.length < 1 || state.players.length > 4) {
    throw new GameRuleError("Starving Artists supports one to four players.");
  }
  if (catalog.playable.length < 35) {
    throw new GameRuleError("The canvas library is not ready.");
  }

  state.paintBag = shuffle(state, makePaintBag());
  let canvasIds = shuffle(
    state,
    catalog.playable.map((canvas) => canvas.id),
  );
  if (state.players.length === 1) canvasIds = canvasIds.slice(0, 35);
  state.canvasDeck = canvasIds;
  state.canvasMarket = [];
  refillCanvasMarket(state);
  state.paintMarket = draw(state, 4);
  for (const player of state.players) {
    player.studioCubes = draw(state, 6);
    player.nutrition = 5;
    player.score = 0;
    player.canvases = [];
    player.soldCanvasCount = 0;
    player.starved = false;
    player.lastMarketTradeDay = null;
  }

  const firstIndex = Math.floor(nextRandom(state) * state.players.length);
  state.firstPlayerId = state.players[firstIndex].id;
  const canonical = state.players.map((player) => player.id);
  state.turnOrder = [
    ...canonical.slice(firstIndex),
    ...canonical.slice(0, firstIndex),
  ];
  state.currentTurnIndex = 0;
  state.day = 1;
  state.phase = "MORNING";
  state.status = "ACTIVE";
  addLog(
    state,
    `${state.players[firstIndex].displayName} takes the first-player marker.`,
    at,
  );
}

function work(state: GameState, player: PlayerState, at: string) {
  const cubes = draw(state, 3);
  player.studioCubes.push(...cubes);
  addLog(
    state,
    `${player.displayName} worked and drew ${cubes.length} paint cube${cubes.length === 1 ? "" : "s"}.`,
    at,
  );
  finishActionTurn(state, at);
}

function buyCanvas(
  state: GameState,
  player: PlayerState,
  slotIndex: number,
  paymentCubeIds: string[],
  at: string,
  catalog: CanvasCatalog,
) {
  const definitionId = state.canvasMarket[slotIndex];
  if (!definitionId) {
    throw new GameRuleError("That market canvas is unavailable.");
  }
  const cost = slotIndex + 1;
  uniqueIds(paymentCubeIds, "Payment");
  if (paymentCubeIds.length !== cost) {
    throw new GameRuleError(`This canvas costs exactly ${cost} paint cube${cost === 1 ? "" : "s"}.`);
  }
  const payment = paymentCubeIds.map((id) => {
    const cube = player.studioCubes.find((entry) => entry.id === id);
    if (!cube) throw new GameRuleError("A selected payment cube is unavailable.");
    return cube;
  });
  const paid = new Set(paymentCubeIds);
  player.studioCubes = player.studioCubes.filter((cube) => !paid.has(cube.id));
  state.paintMarket.push(...payment);
  player.canvases.push(createOwnedCanvas(definitionId, state));
  state.canvasMarket.splice(slotIndex, 1);
  refillCanvasMarket(state);
  addLog(
    state,
    `${player.displayName} bought ${canvasDefinition(definitionId, catalog).title}.`,
    at,
  );
  finishActionTurn(state, at);
}

function paintCanvas(
  state: GameState,
  player: PlayerState,
  action: Extract<GameAction, { type: "PAINT" }>,
  at: string,
  catalog: CanvasCatalog,
) {
  if (action.placements.length < 1 || action.placements.length > 4) {
    throw new GameRuleError("A paint action places between one and four cubes.");
  }
  uniqueIds(
    action.placements.map((placement) => placement.cubeId),
    "Paint placement",
  );
  uniqueIds(
    action.placements.map(
      (placement) =>
        `${placement.canvasInstanceId}:${placement.squareId}`,
    ),
    "Paint placement",
  );
  const used = new Set<string>();
  const wildCounts = new Map<string, number>();
  const targets: Array<{
    canvas: OwnedCanvas;
    definition: CanvasDefinition;
    squareId: string;
    cube: PaintCube;
  }> = [];

  for (const placement of action.placements) {
    const canvas = player.canvases.find(
      (entry) => entry.instanceId === placement.canvasInstanceId,
    );
    if (!canvas) throw new GameRuleError("That canvas is not in your studio.");
    const definition = canvasDefinition(canvas.definitionId, catalog);
    if (canvas.placedCubes[placement.squareId]) {
      throw new GameRuleError("One of those paint spaces is already filled.");
    }
    const square = definition.squares.find(
      (entry) => entry.id === placement.squareId,
    );
    if (!square) throw new GameRuleError("That paint space does not exist.");
    const cube = player.studioCubes.find(
      (entry) => entry.id === placement.cubeId,
    );
    if (!cube || used.has(cube.id)) {
      throw new GameRuleError("One of those paint cubes is unavailable.");
    }
    if (cube.color === "wild") {
      const wildCount =
        wildCounts.get(canvas.instanceId) ??
        Object.values(canvas.placedCubes).filter(
          (placedCube) => placedCube.color === "wild",
        ).length;
      if (wildCount >= 1) {
        throw new GameRuleError("Only one wild cube may be used on a canvas.");
      }
      wildCounts.set(canvas.instanceId, wildCount + 1);
    } else if (!square.allowedColors.includes(cube.color)) {
      throw new GameRuleError("A cube does not match its paint space.");
    }
    used.add(cube.id);
    targets.push({
      canvas,
      definition,
      squareId: square.id,
      cube,
    });
  }

  for (const target of targets) {
    target.canvas.placedCubes[target.squareId] = target.cube;
  }
  player.studioCubes = player.studioCubes.filter((cube) => !used.has(cube.id));
  const paintedCanvases = [
    ...new Map(
      targets.map((target) => [target.canvas.instanceId, target]),
    ).values(),
  ];
  const destination =
    paintedCanvases.length === 1
      ? ` on ${paintedCanvases[0].definition.title}`
      : ` across ${paintedCanvases.length} canvases`;
  addLog(
    state,
    `${player.displayName} placed ${used.size} cube${used.size === 1 ? "" : "s"}${destination}.`,
    at,
    paintedCanvases.some(({ canvas }) => completeCanvas(canvas, catalog))
      ? "good"
      : "neutral",
  );
  finishActionTurn(state, at);
}

function tradeMarket(
  state: GameState,
  player: PlayerState,
  action: Extract<GameAction, { type: "TRADE_MARKET" }>,
  at: string,
) {
  if (player.starved) {
    throw new GameRuleError(
      "A starved artist cannot trade with the Paint Market.",
      "PLAYER_STARVED",
    );
  }
  if (player.lastMarketTradeDay === state.day) {
    throw new GameRuleError(
      "You have already used your Paint Market trade today.",
      "TRADE_ALREADY_USED",
    );
  }
  uniqueIds(action.giveCubeIds, "Trade");
  uniqueIds(action.takeCubeIds, "Trade");
  const required = TRADE_RATES.get(action.takeCubeIds.length);
  if (!required || action.giveCubeIds.length !== required) {
    throw new GameRuleError("Market trades use the 2→1, 5→2, or 9→3 rate.");
  }
  const give = action.giveCubeIds.map((id) => {
    const cube = player.studioCubes.find((entry) => entry.id === id);
    if (!cube) throw new GameRuleError("A cube offered in the trade is unavailable.");
    return cube;
  });
  const take = action.takeCubeIds.map((id) => {
    const cube = state.paintMarket.find((entry) => entry.id === id);
    if (!cube) throw new GameRuleError("A requested market cube is unavailable.");
    return cube;
  });
  const givenIds = new Set(action.giveCubeIds);
  const takenIds = new Set(action.takeCubeIds);
  player.studioCubes = [
    ...player.studioCubes.filter((cube) => !givenIds.has(cube.id)),
    ...take,
  ];
  state.paintMarket = [
    ...state.paintMarket.filter((cube) => !takenIds.has(cube.id)),
    ...give,
  ];
  player.lastMarketTradeDay = state.day;
  addLog(
    state,
    `${player.displayName} traded ${give.length} cubes for ${take.length} from the Paint Market.`,
    at,
  );
}

function declareSales(
  state: GameState,
  player: PlayerState,
  canvasInstanceIds: string[],
  at: string,
  catalog: CanvasCatalog,
) {
  const selling = state.selling;
  if (!selling || selling.stage !== "DECLARATIONS") {
    throw new GameRuleError("The sale declaration is closed.");
  }
  uniqueIds(canvasInstanceIds, "Sale");
  for (const instanceId of canvasInstanceIds) {
    const canvas = player.canvases.find(
      (entry) => entry.instanceId === instanceId,
    );
    if (!canvas) throw new GameRuleError("A selected canvas is not in your studio.");
    if (!completeCanvas(canvas, catalog)) {
      throw new GameRuleError("Only completed canvases may be sold.");
    }
  }
  selling.declarations[player.id] = [...canvasInstanceIds];
  addLog(
    state,
    canvasInstanceIds.length
      ? `${player.displayName} offered ${canvasInstanceIds.length} completed canvas${canvasInstanceIds.length === 1 ? "" : "es"} for sale.`
      : `${player.displayName} declined to sell tonight.`,
    at,
  );
  state.currentTurnIndex += 1;
  if (state.currentTurnIndex >= state.turnOrder.length) {
    state.currentTurnIndex = 0;
    settleDeclaredSales(state, at, catalog);
  }
}

function collectPaint(
  state: GameState,
  player: PlayerState,
  cubeIds: string[],
  at: string,
) {
  const selling = state.selling;
  if (!selling || selling.stage !== "COLLECTION") {
    throw new GameRuleError("Paint collection is not active.");
  }
  uniqueIds(cubeIds, "Paint collection");
  const quota = selling.quotas[player.id] ?? 0;
  const maximum = Math.min(
    selling.pickSizes[player.id] ?? 1,
    quota,
    state.paintMarket.length,
  );
  if (cubeIds.length < 1 || cubeIds.length > maximum) {
    throw new GameRuleError(`Choose between one and ${maximum} market cubes.`);
  }
  const selected = cubeIds.map((id) => {
    const cube = state.paintMarket.find((entry) => entry.id === id);
    if (!cube) throw new GameRuleError("A selected market cube is unavailable.");
    return cube;
  });
  const selectedIds = new Set(cubeIds);
  state.paintMarket = state.paintMarket.filter(
    (cube) => !selectedIds.has(cube.id),
  );
  player.studioCubes.push(...selected);
  selling.quotas[player.id] = quota - selected.length;
  addLog(
    state,
    `${player.displayName} collected ${selected.length} cube${selected.length === 1 ? "" : "s"} from the Paint Market.`,
    at,
  );

  if (state.paintMarket.length === 0) {
    finishCollection(state, at);
    return;
  }
  const nextIndex = findNextCollector(state, selling.currentIndex);
  if (nextIndex === null) {
    finishCollection(state, at);
    return;
  }
  selling.currentIndex = nextIndex;
  state.currentTurnIndex = nextIndex;
}

export function reduceGame(
  source: GameState,
  actorId: string,
  action: GameAction,
  at: string,
  catalog: CanvasCatalog = DEFAULT_CANVAS_CATALOG,
): GameState {
  const state = clone(source);
  if (state.phase === "ENDED") {
    throw new GameRuleError("This game is over.", "GAME_ENDED");
  }

  if (action.type === "ABANDON_GAME") {
    if (state.hostPlayerId !== actorId) {
      throw new GameRuleError(
        "Only the host may abandon the game.",
        "HOST_ONLY",
      );
    }
    state.status = "ABANDONED";
    state.phase = "ENDED";
    state.turnOrder = [];
    state.currentTurnIndex = 0;
    state.selling = null;
    addLog(state, "The host closed the studio.", at, "warning");
  } else if (action.type === "KICK_PLAYER") {
    kickPlayer(state, actorId, action.playerId, at, catalog);
  } else if (action.type === "START_GAME") {
    startGame(state, actorId, at, catalog);
  } else {
    if (state.status !== "ACTIVE") {
      throw new GameRuleError("The game has not started.");
    }
    const player = playerById(state, actorId);
    if (action.type === "TRADE_MARKET") {
      if (state.phase !== "MORNING" && state.phase !== "AFTERNOON") {
        throw new GameRuleError(
          "Paint Market trades are available only during Morning or Afternoon.",
        );
      }
      tradeMarket(state, player, action, at);
    } else {
      requireTurn(state, actorId);
      if (action.type === "DECLARE_SALES") {
        if (state.phase !== "SELLING") {
          throw new GameRuleError("Canvases are sold only at night.");
        }
        declareSales(state, player, action.canvasInstanceIds, at, catalog);
      } else if (action.type === "COLLECT_PAINT") {
        if (state.phase !== "SELLING") {
          throw new GameRuleError("Paint is collected only during selling.");
        }
        collectPaint(state, player, action.cubeIds, at);
      } else {
        if (state.phase !== "MORNING" && state.phase !== "AFTERNOON") {
          throw new GameRuleError("That action is not available in this phase.");
        }
        if (action.type === "WORK") work(state, player, at);
        if (action.type === "BUY_CANVAS") {
          buyCanvas(
            state,
            player,
            action.slotIndex,
            action.paymentCubeIds,
            at,
            catalog,
          );
        }
        if (action.type === "PAINT") {
          paintCanvas(state, player, action, at, catalog);
        }
        if (action.type === "PASS") {
          addLog(state, `${player.displayName} passed.`, at);
          finishActionTurn(state, at);
        }
      }
    }
  }

  state.updatedAt = at;
  return state;
}

export function createLobbyState(input: {
  id: string;
  code: string;
  name: string;
  hostPlayerId: string;
  hostName: string;
  hostAvatar?: PlayerAvatar;
  seed: number;
  at: string;
}): GameState {
  const hostAvatar = isPlayerAvatar(input.hostAvatar)
    ? input.hostAvatar
    : defaultPlayerAvatar();
  return {
    id: input.id,
    code: input.code,
    name: input.name,
    status: "LOBBY",
    phase: "LOBBY",
    version: 0,
    hostPlayerId: input.hostPlayerId,
    maxPlayers: 4,
    players: [
      {
        id: input.hostPlayerId,
        displayName: input.hostName,
        avatar: hostAvatar,
        order: 1,
        nutrition: 5,
        score: 0,
        studioCubes: [],
        canvases: [],
        soldCanvasCount: 0,
        starved: false,
        lastMarketTradeDay: null,
      },
    ],
    day: 1,
    firstPlayerId: null,
    turnOrder: [],
    currentTurnIndex: 0,
    paintBag: [],
    paintMarket: [],
    canvasDeck: [],
    canvasMarket: [],
    selling: null,
    starvationFinalDay: null,
    winnerIds: [],
    randomState: input.seed || 0x9e3779b9,
    log: [
      {
        id: "log-0-1",
        at: input.at,
        text: `${input.hostName} opened the studio.`,
        tone: "neutral",
      },
    ],
    createdAt: input.at,
    updatedAt: input.at,
  };
}

export function joinLobby(
  source: GameState,
  playerId: string,
  displayName: string,
  at: string,
  avatar?: PlayerAvatar,
): GameState {
  const state = clone(source);
  if (state.status !== "LOBBY") {
    throw new GameRuleError("This game has already started.", "GAME_STARTED");
  }
  if (state.players.length >= state.maxPlayers) {
    throw new GameRuleError("This lobby is full.", "LOBBY_FULL");
  }
  if (
    state.players.some(
      (player) =>
        player.displayName.trim().toLowerCase() ===
        displayName.trim().toLowerCase(),
    )
  ) {
    throw new GameRuleError("That player name is already in use.", "NAME_TAKEN");
  }
  const usedAvatarColors = state.players
    .map((player) => player.avatar?.color)
    .filter((color): color is PlayerAvatar["color"] => Boolean(color));
  const selectedAvatar = isPlayerAvatar(avatar)
    ? avatar
    : defaultPlayerAvatar(usedAvatarColors);
  if (usedAvatarColors.includes(selectedAvatar.color)) {
    throw new GameRuleError(
      "That food color is already used by another player.",
      "AVATAR_COLOR_TAKEN",
    );
  }
  state.players.push({
    id: playerId,
    displayName,
    avatar: selectedAvatar,
    order: state.players.length + 1,
    nutrition: 5,
    score: 0,
    studioCubes: [],
    canvases: [],
    soldCanvasCount: 0,
    starved: false,
    lastMarketTradeDay: null,
  });
  addLog(state, `${displayName} joined the studio.`, at);
  state.updatedAt = at;
  return state;
}

export function canvasesForState(
  state: GameState,
  catalog: CanvasCatalog = DEFAULT_CANVAS_CATALOG,
): Record<string, CanvasDefinition> {
  const ids = new Set<string>([
    ...state.canvasMarket,
    ...state.players.flatMap((player) =>
      player.canvases.map((canvas) => canvas.definitionId),
    ),
  ]);
  return Object.fromEntries(
    [...ids]
      .map((id) => catalog.map.get(id))
      .filter((canvas): canvas is CanvasDefinition => Boolean(canvas))
      .map((canvas) => [canvas.id, canvas]),
  );
}
