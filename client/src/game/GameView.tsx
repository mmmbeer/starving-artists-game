import type { GameState } from '../../../shared/types/game';
import './GameView.css';

interface GameViewProps {
  gameState: GameState;
  onReturn: () => void;
}

const GameView = ({ gameState, onReturn }: GameViewProps) => (
  <section className="game-view">
    <header className="game-view__header">
      <div>
        <h2>Game In Progress</h2>
        <p>Current phase: {gameState.phase}</p>
      </div>
      <button type="button" onClick={onReturn}>
        Return to lobby
      </button>
    </header>
    <div className="game-view__details">
      <p>
        Days elapsed: <strong>{gameState.day.dayNumber}</strong>
      </p>
      <p>
        Players: <strong>{gameState.players.length}</strong>
      </p>
      <p>
        Current turn index: <strong>{gameState.currentPlayerIndex}</strong>
      </p>
    </div>
  </section>
);

export default GameView;
