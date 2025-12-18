import type { LobbySnapshot } from '../../../shared/types/lobby';
import type { LobbyConnectionStatus } from '../state/lobbyState';
import './LobbyView.css';

export interface LobbyViewProps {
  lobby: LobbySnapshot | null;
  gameId: string;
  playerId: string;
  displayName: string;
  connectionStatus: LobbyConnectionStatus;
  error: string | null;
  onCreateGame: () => Promise<void>;
  onJoinGame: () => Promise<void>;
  onStartGame: () => Promise<void>;
  onLeaveGame: () => Promise<void>;
  setGameId: (value: string) => void;
  setPlayerId: (value: string) => void;
  setDisplayName: (value: string) => void;
}

const connectionLabel = (status: LobbyConnectionStatus) => {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting...';
    case 'error':
      return 'Disconnected (error)';
    default:
      return 'Idle';
  }
};

const LobbyView = ({
  lobby,
  gameId,
  playerId,
  displayName,
  connectionStatus,
  error,
  onCreateGame,
  onJoinGame,
  onStartGame,
  onLeaveGame,
  setGameId,
  setPlayerId,
  setDisplayName
}: LobbyViewProps) => {
  const isHost = lobby?.hostId === playerId;
  const canStart = Boolean(lobby && lobby.readiness.canStart && isHost && lobby.phase === 'LOBBY');
  const joinLink = lobby?.joinLink ? `${window.location.origin}${lobby.joinLink}` : '';

  return (
    <section className="lobby-view">
      <div className="lobby-view__header">
        <div>
          <h2>Lobby</h2>
          <p>Gather players, verify connectivity, and when ready start the game.</p>
        </div>
        <div className={`lobby-view__status lobby-view__status--${connectionStatus}`}>
          {connectionLabel(connectionStatus)}
        </div>
      </div>
      <div className="lobby-view__grid">
        <article className="lobby-card">
          <h3>Create or join</h3>
          <label>
            Player ID
            <input value={playerId} onChange={(event) => setPlayerId(event.target.value)} />
          </label>
          <label>
            Display Name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <label>
            Game ID or link
            <input value={gameId} onChange={(event) => setGameId(event.target.value)} />
          </label>
          <div className="lobby-card__controls">
            <button type="button" onClick={onCreateGame}>
              Create Game
            </button>
            <button type="button" onClick={onJoinGame} disabled={!gameId}>
              Join Game
            </button>
          </div>
          {joinLink && (
            <p className="lobby-card__join-link">
              Share this link:{' '}
              <a href={joinLink} target="_blank" rel="noreferrer">
                {joinLink}
              </a>
            </p>
          )}
        </article>
        <article className="lobby-card">
          <h3>Players ({lobby?.players.length ?? 0}/{lobby?.readiness.maxPlayers ?? 4})</h3>
          <div className="lobby-view__players">
            {lobby?.players.map((player) => (
              <div key={player.id} className="lobby-player">
                <div>
                  <strong>{player.displayName}</strong>
                  <span>{player.order === 1 ? ' (first)' : ''}</span>
                </div>
                <div className={`lobby-player__status ${player.isConnected ? 'online' : 'offline'}`}>
                  {player.isConnected ? 'Online' : 'Offline'}
                </div>
                {player.id === lobby.hostId && <span className="lobby-player__host">Host</span>}
              </div>
            ))}
          </div>
          <div className="lobby-card__controls">
            <button type="button" onClick={onStartGame} disabled={!canStart}>
              Start Game
            </button>
            <button type="button" onClick={onLeaveGame} disabled={!lobby}>
              Leave Lobby
            </button>
          </div>
          <p className="lobby-card__phase">
            Phase: <strong>{lobby?.phase ?? 'LOBBY'}</strong>
          </p>
          <p className="lobby-card__readiness">
            {lobby?.readiness.canStart ? 'Ready to start' : 'Waiting for more artists'}
          </p>
        </article>
      </div>
      {error && <div className="lobby-view__error">Error: {error}</div>}
    </section>
  );
};

export default LobbyView;
