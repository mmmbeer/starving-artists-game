import LobbyView from './lobby/LobbyView';
import GameView from './game/GameView';
import { useLobbyState } from './state/lobbyState';
import './App.css';

function App() {
  const {
    lobby,
    gameState,
    connectionStatus,
    error,
    gameId,
    playerId,
    displayName,
    setGameId,
    setPlayerId,
    setDisplayName,
    createGame,
    joinGame,
    leaveGame,
    startGame,
    resetGameState,
    actionHistory,
    onWork,
    onBuyCanvas,
    onApplyPaint,
    onEndTurn
  } = useLobbyState();

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Starving Artists Online</h1>
        <p>Phase 2 Lobby and multiplayer lifecycle</p>
      </header>
      <main>
      {gameState ? (
        <GameView
          gameState={gameState}
          onReturn={resetGameState}
          actionHistory={actionHistory}
          onWork={onWork}
          onBuyCanvas={onBuyCanvas}
          onPaint={onApplyPaint}
          onEndTurn={onEndTurn}
          playerId={playerId}
          error={error}
        />
      ) : (
        <LobbyView
            lobby={lobby}
            gameId={gameId}
            playerId={playerId}
            displayName={displayName}
            connectionStatus={connectionStatus}
            error={error}
            onCreateGame={createGame}
            onJoinGame={joinGame}
            onLeaveGame={leaveGame}
            onStartGame={startGame}
            setGameId={setGameId}
            setPlayerId={setPlayerId}
            setDisplayName={setDisplayName}
          />
        )}
      </main>
    </div>
  );
}

export default App;
