import { useMemo, useState } from 'react';
import type { GameState } from '../../../shared/types/game';
import type { GameActionSummary } from '../../../shared/types/realtime';
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
}

const GameView = ({ gameState, onReturn, actionHistory, onWork, onBuyCanvas, onPaint, onEndTurn, playerId }: GameViewProps) => {
  const currentPlayerId = gameState.turn.order[gameState.turn.currentPlayerIndex];
  const isPlayerTurn = playerId === currentPlayerId;
  const activePlayer = gameState.players.find((player) => player.id === currentPlayerId);
  const localPlayer = gameState.players.find((player) => player.id === playerId);
  const localStudio = localPlayer?.studio;

  const [paintSelection, setPaintSelection] = useState({
    canvasId: localStudio?.canvases[0]?.id ?? '',
    squareId: '',
    cubeId: ''
  });

  const selectedCanvas = useMemo(
    () => localStudio?.canvases.find((canvas) => canvas.id === paintSelection.canvasId),
    [localStudio, paintSelection.canvasId]
  );

  const availableSquares = useMemo(() => {
    if (!selectedCanvas) {
      return [];
    }
    return selectedCanvas.definition.squares.filter((square) => !selectedCanvas.placedCubes[square.id]);
  }, [selectedCanvas]);

  const availableCubes = localStudio?.paintCubes ?? [];

  const handlePaintSubmit = () => {
    if (!paintSelection.canvasId || !paintSelection.squareId || !paintSelection.cubeId) {
      return;
    }
    onPaint(paintSelection.canvasId, paintSelection.squareId, paintSelection.cubeId);
    setPaintSelection((previous) => ({ ...previous, squareId: '', cubeId: '' }));
  };

  const getPlayerName = (id: string) => {
    return gameState.players.find((player) => player.id === id)?.displayName ?? id;
  };

  return (
    <section className="game-view">
      <header className="game-view__header">
        <div>
          <h2>Game In Progress</h2>
          <p>Phase: {gameState.phase}</p>
          <p>Day: {gameState.day.dayNumber}</p>
        </div>
        <button type="button" onClick={onReturn}>
          Return to lobby
        </button>
      </header>

      <div className="game-view__summary">
        <div>
          <p>
            Current turn: <strong>{getPlayerName(currentPlayerId)}</strong>
          </p>
          <p>
            Local player: <strong>{localPlayer?.displayName ?? playerId}</strong>
          </p>
        </div>
        <div className="game-view__status">
          <p>Nutrition</p>
          <ul>
            {gameState.players.map((player) => (
              <li key={player.id}>
                {player.displayName}: {player.nutrition}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="game-view__actions">
        <button type="button" onClick={onWork} disabled={!isPlayerTurn}>
          Work (draw cubes)
        </button>
        <button type="button" onClick={onEndTurn} disabled={!isPlayerTurn}>
          End turn
        </button>
      </div>

      <div className="game-view__grid">
        <section className="game-view__panel">
          <h3>Canvas market</h3>
          <ul>
            {gameState.canvasMarket.slots.map((slot) => (
              <li key={slot.slotIndex} className="game-view__market-slot">
                <div>
                  <p className="game-view__market-title">{slot.canvas.definition.title}</p>
                  <p>Cost: {slot.cost}</p>
                </div>
                <button type="button" onClick={() => onBuyCanvas(slot.slotIndex)} disabled={!isPlayerTurn}>
                  Buy slot {slot.slotIndex + 1}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="game-view__panel">
          <h3>Studio</h3>
          <p>Paint cubes: {availableCubes.length}</p>
          <div className="game-view__studio-grid">
            <div>
              <label htmlFor="canvas-select">Canvas</label>
              <select
                id="canvas-select"
                value={paintSelection.canvasId}
                onChange={(event) =>
                  setPaintSelection((previous) => ({ ...previous, canvasId: event.target.value, squareId: '', cubeId: '' }))
                }
              >
                <option value="">Select canvas</option>
                {localStudio?.canvases.map((canvas) => (
                  <option key={canvas.id} value={canvas.id}>
                    {canvas.definition.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="square-select">Square</label>
              <select
                id="square-select"
                value={paintSelection.squareId}
                onChange={(event) => setPaintSelection((previous) => ({ ...previous, squareId: event.target.value }))}
              >
                <option value="">Select square</option>
                {availableSquares.map((square) => (
                  <option key={square.id} value={square.id}>
                    {square.id} ({square.allowedColors.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cube-select">Cube</label>
              <select
                id="cube-select"
                value={paintSelection.cubeId}
                onChange={(event) => setPaintSelection((previous) => ({ ...previous, cubeId: event.target.value }))}
              >
                <option value="">Select cube</option>
                {availableCubes.map((cube) => (
                  <option key={cube.id} value={cube.id}>
                    {cube.color} ({cube.id})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="button" onClick={handlePaintSubmit} disabled={!isPlayerTurn}>
            Paint selected square
          </button>
        </section>
      </div>

      <section className="game-view__history">
        <h3>Action log</h3>
        <ul>
          {actionHistory.map((entry) => (
            <li key={`${entry.playerId}-${entry.timestamp}`}>
              <strong>{getPlayerName(entry.playerId)}</strong> {entry.actionType} at {new Date(entry.timestamp).toLocaleTimeString()}
            </li>
          ))}
          {actionHistory.length === 0 && <li>No actions yet</li>}
        </ul>
      </section>
    </section>
  );
};

export default GameView;
