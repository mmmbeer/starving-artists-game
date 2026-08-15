import {
  defaultPlayerAvatar,
  isPlayerAvatar,
} from "../player-identities";
import type {
  CanvasDefinition,
  GameAction,
  GameState,
  PlayerAvatar,
} from "../types";
import {
  addLog,
  type CanvasCatalog,
  clone,
  DEFAULT_CANVAS_CATALOG,
  finishActionTurn,
  GameRuleError,
  playerById,
  requireTurn,
} from "./core";
import {
  buyCanvas,
  collectPaint,
  declareSales,
  paintCanvas,
  startGame,
  tradeMarket,
  work,
} from "./actions";
import { kickPlayer } from "./players";

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


