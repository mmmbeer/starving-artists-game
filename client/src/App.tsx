import { useState } from 'react';
import GamePlaceholder from './game/GameView';
import LobbyPlaceholder from './lobby/LobbyView';
import './App.css';

type ViewMode = 'lobby' | 'game';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('lobby');

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Starving Artists Online</h1>
        <p>Phase 0 - Lobby + Game placeholders</p>
      </header>
      <main>
        {viewMode === 'lobby' ? (
          <LobbyPlaceholder onEnterGame={() => setViewMode('game')} />
        ) : (
          <GamePlaceholder onReturn={() => setViewMode('lobby')} />
        )}
      </main>
    </div>
  );
}

export default App;
