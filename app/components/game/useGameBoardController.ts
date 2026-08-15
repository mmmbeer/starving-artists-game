"use client";
import { useEffect, useRef, useState } from "react";
import type {
  GameEnvelope,
  PlayerCredential,
  PlayerState,
} from "../../lib/types";
import {
  DAY_PHASES,
  type ActionPanel,
  type CanvasPreviewAction,
  type PendingPaintPlacement,
} from "./config";

export function useGameBoardController({
  envelope,
  credential,
  me,
}: {
  envelope: GameEnvelope;
  credential: PlayerCredential;
  me: PlayerState;
}) {
  const game = envelope.game;
  const currentPlayer = game.players.find(
    (player) => player.id === game.turnOrder[game.currentTurnIndex],
  );
  const myTurn = currentPlayer?.id === credential.playerId;
  const isHost = game.hostPlayerId === credential.playerId;
  const [panel, setPanel] = useState<ActionPanel>("none");
  const [buySlot, setBuySlot] = useState<number | null>(null);
  const [selectedStudioCubes, setSelectedStudioCubes] = useState<string[]>([]);
  const [selectedMarketCubes, setSelectedMarketCubes] = useState<string[]>([]);
  const [selectedCanvas, setSelectedCanvas] = useState<string | null>(null);
  const [selectedCube, setSelectedCube] = useState<string | null>(null);
  const [pendingPaint, setPendingPaint] = useState<PendingPaintPlacement[]>([]);
  const [saleSelection, setSaleSelection] = useState<string[]>([]);
  const [studioPeekPlayerId, setStudioPeekPlayerId] = useState<string | null>(
    null,
  );
  const [studioPeekCanvasId, setStudioPeekCanvasId] = useState<string | null>(
    null,
  );
  const [dismissedNutritionWarningDay, setDismissedNutritionWarningDay] =
    useState<number | null>(null);
  const [canvasPreview, setCanvasPreview] = useState<{
    definitionId: string;
    action?: CanvasPreviewAction;
  } | null>(null);
  const previousVersion = useRef(game.version);

  useEffect(() => {
    if (previousVersion.current !== game.version) {
      previousVersion.current = game.version;
      setSelectedStudioCubes([]);
      setSelectedMarketCubes([]);
      setPendingPaint([]);
      setSelectedCube(null);
      setPanel("none");
      setBuySlot(null);
      setSaleSelection([]);
      setCanvasPreview((preview) => (preview?.action ? null : preview));
    }
  }, [game.version]);

  const activeOwned = me?.canvases.find(
    (canvas) => canvas.instanceId === selectedCanvas,
  );
  const previewDefinition = canvasPreview
    ? envelope.canvases[canvasPreview.definitionId]
    : undefined;
  const availableCubes =
    me?.studioCubes.filter(
      (cube) => !pendingPaint.some((placement) => placement.cubeId === cube.id),
    ) ?? [];
  const completeCanvases =
    me?.canvases.filter((canvas) => {
      const definition = envelope.canvases[canvas.definitionId];
      return (
        definition &&
        Object.keys(canvas.placedCubes).length === definition.squares.length
      );
    }) ?? [];
  const collectionLimit =
    myTurn && game.selling?.stage === "COLLECTION" && me
      ? Math.min(
          game.selling.pickSizes[me.id] ?? 1,
          game.selling.quotas[me.id] ?? 0,
          game.paintMarket.length,
        )
      : 0;
  const tradeValid =
    (selectedStudioCubes.length === 2 &&
      selectedMarketCubes.length === 1) ||
    (selectedStudioCubes.length === 5 &&
      selectedMarketCubes.length === 2) ||
    (selectedStudioCubes.length === 9 &&
      selectedMarketCubes.length === 3);
  const hasUsedDailyTrade = me?.lastMarketTradeDay === game.day;
  const canTradeMarket =
    !me?.starved &&
    !hasUsedDailyTrade &&
    (game.phase === "MORNING" || game.phase === "AFTERNOON");
  const dayPhaseIndex = DAY_PHASES.findIndex(
    (entry) => entry.phase === game.phase,
  );
  const dayPhase = DAY_PHASES[dayPhaseIndex];
  const myOrderIndex = me ? game.turnOrder.indexOf(me.id) : -1;
  const hasDeclaredSale = Boolean(
    me &&
      game.selling &&
      Object.prototype.hasOwnProperty.call(
        game.selling.declarations,
        me.id,
      ),
  );
  const personalActionsRemaining =
    !me || me.starved || myOrderIndex < 0
      ? 0
      : game.phase === "MORNING"
        ? myOrderIndex >= game.currentTurnIndex
          ? 2
          : 1
        : game.phase === "AFTERNOON"
          ? myOrderIndex >= game.currentTurnIndex
            ? 1
            : 0
          : game.phase === "SELLING" &&
              game.selling?.stage === "DECLARATIONS" &&
              !hasDeclaredSale
            ? 1
            : 0;
  const phaseActionsRemaining =
    game.phase === "MORNING" || game.phase === "AFTERNOON"
      ? Math.max(0, game.turnOrder.length - game.currentTurnIndex)
      : game.phase === "SELLING" &&
          game.selling?.stage === "DECLARATIONS"
        ? game.turnOrder.filter(
            (playerId) =>
              !Object.prototype.hasOwnProperty.call(
                game.selling?.declarations ?? {},
                playerId,
              ),
          ).length
        : game.phase === "SELLING" &&
            game.selling?.stage === "COLLECTION"
          ? Object.values(game.selling.quotas).reduce(
              (total, quota) => total + Math.max(0, quota),
              0,
            )
          : 0;
  const phaseRemainingLabel =
    game.phase === "ENDED"
      ? "actions left"
      : game.phase === "MORNING"
      ? `first action${phaseActionsRemaining === 1 ? "" : "s"} left`
      : game.phase === "AFTERNOON"
        ? `second action${phaseActionsRemaining === 1 ? "" : "s"} left`
        : game.selling?.stage === "COLLECTION"
          ? `paint cube${phaseActionsRemaining === 1 ? "" : "s"} left`
          : `sell action${phaseActionsRemaining === 1 ? "" : "s"} left`;
  const waitingForTurn =
    Boolean(currentPlayer) && !myTurn && game.phase !== "ENDED";
  const studioPeekPlayer = studioPeekPlayerId
    ? game.players.find((player) => player.id === studioPeekPlayerId)
    : undefined;

  const closePanel = () => {
    setPanel("none");
    setBuySlot(null);
    setSelectedStudioCubes([]);
    setSelectedMarketCubes([]);
  };
  const showNutritionWarning =
    game.phase !== "ENDED" &&
    !me.starved &&
    me.nutrition === 1 &&
    dismissedNutritionWarningDay !== game.day;

  const toggle = (
    id: string,
    selected: string[],
    setter: (next: string[]) => void,
    maximum?: number,
  ) => {
    if (selected.includes(id)) {
      setter(selected.filter((entry) => entry !== id));
    } else if (!maximum || selected.length < maximum) {
      setter([...selected, id]);
    }
  };

  const placeCube = (
    canvasInstanceId: string,
    squareId: string,
    cubeId: string,
  ) => {
    if (!myTurn) return;
    const targetCanvas = me.canvases.find(
      (canvas) => canvas.instanceId === canvasInstanceId,
    );
    const targetDefinition = targetCanvas
      ? envelope.canvases[targetCanvas.definitionId]
      : undefined;
    if (!targetCanvas || !targetDefinition) return;
    const cube = me.studioCubes.find((entry) => entry.id === cubeId);
    const square = targetDefinition.squares.find(
      (entry) => entry.id === squareId,
    );
    if (!cube || !square || targetCanvas.placedCubes[squareId]) return;
    const withoutCube = pendingPaint.filter(
      (placement) => placement.cubeId !== cubeId,
    );
    const withoutSquare = withoutCube.filter(
      (placement) =>
        placement.canvasInstanceId !== canvasInstanceId ||
        placement.squareId !== squareId,
    );
    const existingWild =
      Object.values(targetCanvas.placedCubes).some(
        (placed) => placed.color === "wild",
      ) ||
      withoutSquare
        .filter(
          (placement) => placement.canvasInstanceId === canvasInstanceId,
        )
        .some((placement) => {
          const placed = me.studioCubes.find(
            (entry) => entry.id === placement.cubeId,
          );
          return placed?.color === "wild";
        });
    if (
      (cube.color !== "wild" &&
        !square.allowedColors.includes(cube.color)) ||
      (cube.color === "wild" && existingWild) ||
      withoutSquare.length >= 4
    ) {
      return;
    }
    const nextPaint = [
      ...withoutSquare,
      { canvasInstanceId, squareId, cubeId },
    ];
    setPendingPaint(nextPaint);
    setSelectedCube(null);
    if (nextPaint.length === 4) {
      setPanel("paint");
    }
  };

  return {
    envelope,
    credential,
    game,
    me,
    currentPlayer,
    myTurn,
    isHost,
    panel,
    setPanel,
    buySlot,
    setBuySlot,
    selectedStudioCubes,
    setSelectedStudioCubes,
    selectedMarketCubes,
    setSelectedMarketCubes,
    selectedCanvas,
    setSelectedCanvas,
    selectedCube,
    setSelectedCube,
    pendingPaint,
    setPendingPaint,
    saleSelection,
    setSaleSelection,
    studioPeekPlayerId,
    setStudioPeekPlayerId,
    studioPeekCanvasId,
    setStudioPeekCanvasId,
    dismissedNutritionWarningDay,
    setDismissedNutritionWarningDay,
    canvasPreview,
    setCanvasPreview,
    activeOwned,
    previewDefinition,
    availableCubes,
    completeCanvases,
    collectionLimit,
    tradeValid,
    hasUsedDailyTrade,
    canTradeMarket,
    dayPhaseIndex,
    dayPhase,
    personalActionsRemaining,
    phaseActionsRemaining,
    phaseRemainingLabel,
    waitingForTurn,
    studioPeekPlayer,
    closePanel,
    showNutritionWarning,
    toggle,
    placeCube,
  };
}

export type GameBoardController = ReturnType<typeof useGameBoardController>;

