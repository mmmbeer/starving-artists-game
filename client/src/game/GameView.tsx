import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameState } from '@shared/types/game';
import { GamePhase } from '@shared/types/game';
import type { GameActionSummary } from '@shared/types/realtime';
import type { PaintCube } from '@shared/types/paint';
import CanvasRenderer from './canvas/CanvasRenderer';
import PaintCubeLayer from './paint/PaintCubeLayer';
import { PaintDragProvider, PaintDropIntent } from './paint/dragContext';
import './GameView.css';

interface GameViewProps {
  gameState: GameState;
  onReturn: () => void;
  actionHistory: GameActionSummary[];
  onWork: () => void;
  onBuyCanvas: (slotIndex: number) => void;
  onPaint: (canvasId: string, squareId: string, cubeId: string) => void;
  onEndTurn: () => void;
  playerId: string;
  error: string | null;
}

type OptimisticPlacement = Record<string, { canvasId: string; squareId: string; cube: PaintCube }>;

const buildPlacementKey = (canvasId: string, squareId: string) => `${canvasId}:${squareId}`;

const GameView = ({
  gameState,
  onReturn,
  actionHistory,
  onWork,
  onBuyCanvas,
  onPaint,
  onEndTurn,
  playerId,
  error
}: GameViewProps) => {
  const currentPlayerId = gameState.turn.order[gameState.turn.currentPlayerIndex];
  const isPlayerTurn = playerId === currentPlayerId;
  const localPlayer = gameState.players.find((player) => player.id === playerId);
  const localStudio = localPlayer?.studio;
  const cubes = localStudio?.paintCubes ?? [];
  const canvases = localStudio?.canvases ?? [];
  const isActionPhase = [GamePhase.MORNING, GamePhase.AFTERNOON].includes(gameState.phase);

  const [optimisticPlacements, setOptimisticPlacements] = useState<OptimisticPlacement>({});
  const [isActionPending, setIsActionPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handlePaintDrop = useCallback(
    (intent: PaintDropIntent) => {
      if (!localStudio) {
        return;
      }
      const cube = localStudio.paintCubes.find((item) => item.id === intent.cubeId);
      if (!cube) {
        return;
      }

      setOptimisticPlacements((previous) => ({
        ...previous,
        [buildPlacementKey(intent.canvasId, intent.squareId)]: {
          canvasId: intent.canvasId,
          squareId: intent.squareId,
          cube
        }
      }));
      setIsActionPending(true);
      onPaint(intent.canvasId, intent.squareId, intent.cubeId);
    },
    [localStudio, onPaint]
  );

  useEffect(() => {
    if (!localStudio) {
      setOptimisticPlacements({});
      setIsActionPending(false);
      return;
    }

    setOptimisticPlacements((previous) => {
      const filtered: OptimisticPlacement = {};
      Object.entries(previous).forEach(([key, entry]) => {
        const canvas = localStudio.canvases.find((item) => item.id === entry.canvasId);
        if (!canvas) {
          return;
        }
        if (!canvas.placedCubes[entry.squareId]) {
          filtered[key] = entry;
        }
      });
      return filtered;
    });
    setIsActionPending(false);
  }, [localStudio, gameState.updatedAt]);

  useEffect(() => {
    if (error) {
      setFeedback(error);
      setOptimisticPlacements({});
      setIsActionPending(false);
      return;
    }
    setFeedback(null);
  }, [error]);

  const wildUsage = useMemo(() => {
    const usage: Record<string, boolean> = {};
    canvases.forEach((canvas) => {
      const hasUsedWild = Object.values(canvas.placedCubes).some((cube) => cube.color === 'wild');
      if (hasUsedWild) {
        usage[canvas.id] = true;
        return;
      }
      usage[canvas.id] = Object.values(optimisticPlacements).some(
        (placement) => placement.canvasId === canvas.id && placement.cube.color === 'wild'
      );
    });
    return usage;
  }, [canvases, optimisticPlacements]);

  const feedbackMessage = feedback ?? (isActionPending ? 'Waiting for the server to confirm your move…' : null);
  const canDragCubes = isPlayerTurn && isActionPhase && !isActionPending;

  const getPlayerName = (id: string) => {
    return gameState.players.find((player) => player.id === id)?.displayName ?? id;
  };

  return (
    <section className="game-view">
      <header className="game-view__header">
        <div>
          <h2>Game In Progress</h2>
          <p>Phase: {gameState.phase} · Day: {gameState.day.dayNumber}</p>
          <p>
            Turn: <strong>{getPlayerName(currentPlayerId)}</strong>
          </p>
          <p>
            You: <strong>{localPlayer?.displayName ?? playerId}</strong>
          </p>
        </div>
        <button type="button" className="game-view__return" onClick={onReturn}>
          Return to lobby
        </button>
      </header>

      {feedbackMessage && <div className="game-view__feedback">{feedbackMessage}</div>}

      <div className="game-view__status">
        <div>
          <p>Nutritional status</p>
          <ul>
            {gameState.players.map((player) => (
              <li key={player.id}>
                {player.displayName}: {player.nutrition}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p>Action log</p>
          <p>{isPlayerTurn ? 'Your turn' : 'Waiting on another player'}</p>
        </div>
      </div>

      <PaintDragProvider onDrop={handlePaintDrop} canDrag={canDragCubes}>
        <div className="game-view__board">
          <aside className="game-view__studio-panel">
            <div className="game-view__studio-header">
              <h3>Studio</h3>
              <p>{cubes.length} cubes</p>
            </div>
            <PaintCubeLayer cubes={cubes} />

            <div className="game-view__studio-actions">
              <button type="button" onClick={onWork} disabled={!isPlayerTurn}>
                Work (draw cubes)
              </button>
              <button type="button" onClick={onEndTurn} disabled={!isPlayerTurn}>
                End turn
              </button>
            </div>

            <section className="game-view__market">
              <h4>Canvas market</h4>
              <ul>
                {gameState.canvasMarket.slots.map((slot) => (
                  <li key={slot.slotIndex}>
                    <div>
                      <p className="game-view__market-title">{slot.canvas.definition.title}</p>
                      <p>Cost: {slot.cost}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onBuyCanvas(slot.slotIndex)}
                      disabled={!isPlayerTurn}
                    >
                      Buy slot {slot.slotIndex + 1}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </aside>

          <section className="game-view__canvas-gallery">
            {canvases.length === 0 ? (
              <div className="game-view__empty-canvas">Buy a canvas to begin painting.</div>
            ) : (
              canvases.map((canvas) => (
                <CanvasRenderer
                  key={canvas.id}
                  canvas={canvas}
                  optimisticPlacements={optimisticPlacements}
                  wildUsed={Boolean(wildUsage[canvas.id])}
                />
              ))
            )}
          </section>
        </div>
      </PaintDragProvider>

      <section className="game-view__history">
        <h3>Action log</h3>
        <ul>
          {actionHistory.length === 0 && <li>No actions logged yet</li>}
          {actionHistory.map((entry) => (
            <li key={`${entry.playerId}-${entry.timestamp}`}>
              <strong>{getPlayerName(entry.playerId)}</strong> {entry.actionType} at{' '}
              {new Date(entry.timestamp).toLocaleTimeString()}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
};

export default GameView;
