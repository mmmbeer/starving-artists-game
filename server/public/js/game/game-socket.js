// Game Socket Event Handlers

function setupGameSocket(socket, gameId, playerId) {
  // Join game room
  socket.emit('join-game', { gameId, playerId });

  // Game state updates
  socket.on('game-state', (gameState) => {
    console.log('Game state received:', gameState);
    
    if (window.gameUI) {
      window.gameUI.updateGameState(gameState);
    }
  });

  // Action performed by any player
  socket.on('action-performed', (data) => {
    console.log('Action performed:', data);
    
    const actionMessages = {
      work: `${getPlayerName(data.playerId)} drew ${data.cubesDrawn || 3} paint cubes`,
      'buy-canvas': `${getPlayerName(data.playerId)} bought a canvas`,
      paint: `${getPlayerName(data.playerId)} painted ${data.paintingsCount || 'some'} square(s)`,
      'end-turn': `${getPlayerName(data.playerId)} ended their turn`
    };
    
    const message = actionMessages[data.action] || 'Action performed';
    
    // Don't show toast for own actions
    if (data.playerId !== playerId) {
      showToast('Player Action', message, 'info', 3000);
    }
  });

  // Turn changed
  socket.on('turn-changed', (data) => {
    console.log('Turn changed:', data);
    
    const isMyTurn = data.currentPlayerId === playerId;
    
    if (isMyTurn) {
      showToast('Your Turn!', "It's your turn to act", 'success');
      
      // Play sound or visual effect
      if (window.gameUI) {
        document.body.classList.add('bounce');
        setTimeout(() => document.body.classList.remove('bounce'), 500);
      }
    }
    
    // Update UI
    if (window.gameUI) {
      window.gameUI.currentPlayerId = data.currentPlayerId;
      window.gameUI.updateTurnIndicator();
      window.gameUI.updateActionButtons();
    }
  });

  // Game ended
  socket.on('game-ended', (data) => {
    console.log('Game ended:', data);
    showWinModal(data.winner, data.finalScores);
  });

  // Player connected/disconnected
  socket.on('player-connected', (data) => {
    console.log('Player connected:', data.playerId);
  });

  socket.on('player-disconnected', (data) => {
    console.log('Player disconnected:', data.playerId);
    showToast('Player Disconnected', getPlayerName(data.playerId) + ' disconnected', 'warning');
  });

  // Action errors
  socket.on('action-error', (data) => {
    console.error('Action error:', data);
    showToast('Action Failed', data.message, 'danger');
  });

  // Ping/pong for keep-alive
  setInterval(() => {
    if (socket.connected) {
      socket.emit('ping');
    }
  }, 30000);

  socket.on('pong', () => {
    // Connection is alive
  });
}

function getPlayerName(playerId) {
  if (!window.gameUI || !window.gameUI.gameState) return 'A player';
  
  const player = window.gameUI.gameState.players.find(p => p.id === playerId);
  return player ? player.name : 'A player';
}

function showWinModal(winner, finalScores) {
  const modal = document.createElement('div');
  modal.className = 'win-modal';
  
  let scoresHTML = '';
  finalScores.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return b.paintings_completed - a.paintings_completed;
  }).forEach((player, index) => {
    scoresHTML += `
      <div class="score-item ${player.id === winner.id ? 'winner' : ''}">
        <span>
          ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
          ${player.name}
        </span>
        <span>
          ⭐ ${player.score} points | 🎨 ${player.paintings_completed} paintings
        </span>
      </div>
    `;
  });
  
  modal.innerHTML = `
    <div class="win-content">
      <div class="win-icon">🏆</div>
      <h2 class="win-title">${winner.name} Wins!</h2>
      <p class="lead">
        Final Score: ${winner.score} points<br>
        Completed Paintings: ${winner.paintings_completed}
      </p>
      <div class="final-scores">
        <h4>Final Standings</h4>
        ${scoresHTML}
      </div>
      <div class="mt-4">
        <a href="/" class="btn btn-primary btn-lg">New Game</a>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}
