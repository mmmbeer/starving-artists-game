import type { GameState } from "../types";
import {
  addLog,
  type CanvasCatalog,
  endGame,
  finishActionTurn,
  finishCollection,
  GameRuleError,
  settleDeclaredSales,
  shuffle,
} from "./core";

export function kickPlayer(
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




