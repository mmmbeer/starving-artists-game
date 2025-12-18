import PhaseOnePanel from './components/PhaseOnePanel';
import './App.css';

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Starving Artists Online</h1>
        <p>Phase 1 rules engine sandbox</p>
      </header>
      <main>
        <PhaseOnePanel />
      </main>
    </div>
  );
}

export default App;
