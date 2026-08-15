import type {
  CanvasDefinition,
  GameAction,
  GameState,
  OwnedCanvas,
  PaintCube,
  PlayerState,
} from "../types";
import {
  addLog,
  canvasDefinition,
  type CanvasCatalog,
  completeCanvas,
  createOwnedCanvas,
  draw,
  findNextCollector,
  finishActionTurn,
  finishCollection,
  GameRuleError,
  makePaintBag,
  nextRandom,
  refillCanvasMarket,
  settleDeclaredSales,
  shuffle,
  TRADE_RATES,
  uniqueIds,
} from "./core";

export function startGame(
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

export function work(state: GameState, player: PlayerState, at: string) {
  const cubes = draw(state, 3);
  player.studioCubes.push(...cubes);
  addLog(
    state,
    `${player.displayName} worked and drew ${cubes.length} paint cube${cubes.length === 1 ? "" : "s"}.`,
    at,
  );
  finishActionTurn(state, at);
}

export function buyCanvas(
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

export function paintCanvas(
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

export function tradeMarket(
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

export function declareSales(
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

export function collectPaint(
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



