// Game UI Manager

class GameUI {
  constructor(gameState) {
    this.gameState = gameState;
    this.currentPlayerId = gameState.game.current_player_id;
    this.myPlayerId = null;
  }

  setMyPlayerId(playerId) {
    this.myPlayerId = playerId;
  }

  isMyTurn() {
    return this.currentPlayerId === this.myPlayerId;
  }

  updateGameState(newState) {
    this.gameState = newState;
    this.currentPlayerId = newState.game.current_player_id;
    this.render();
  }

  render() {
    this.updatePhaseIndicator();
    this.updateTurnIndicator();
    this.updatePlayersList();
    this.updateMarkets();
    this.updatePlayerStudio();
    this.updateActionButtons();
  }

  updatePhaseIndicator() {
    const indicator = document.getElementById('phaseIndicator');
    if (!indicator) return;
    
    const phase = this.gameState.game.current_phase;
    const phaseNames = {
      morning: '☀️ Morning',
      day: '🌤️ Day',
      night: '🌙 Night',
      selling: '💰 Selling'
    };
    
    indicator.textContent = phaseNames[phase] || phase;
    indicator.className = `phase-indicator ${phase}`;
  }

  updateTurnIndicator() {
    const indicator = document.getElementById('turnIndicator');
    if (!indicator) return;
    
    const currentPlayer = this.gameState.players.find(
      p => p.id === this.currentPlayerId
    );
    
    if (this.isMyTurn()) {
      indicator.textContent = '✨ Your Turn!';
      indicator.className = 'turn-indicator your-turn';
    } else if (currentPlayer) {
      indicator.textContent = `${currentPlayer.name}'s Turn`;
      indicator.className = 'turn-indicator not-your-turn';
    }
  }

  updatePlayersList() {
    const container = document.getElementById('playersList');
    if (!container) return;
    
    let html = '';
    this.gameState.players.forEach(player => {
      const isActive = player.id === this.currentPlayerId;
      const isMe = player.id === this.myPlayerId;
      
      html += `
        <div class="sidebar-player ${isActive ? 'active' : ''}">
          <div class="sidebar-player-name">
            ${player.name}
            ${isMe ? '<span class="badge bg-primary ms-2">You</span>' : ''}
          </div>
          <div class="sidebar-player-stats">
            <span>❤️ ${player.nutrition}</span>
            <span>⭐ ${player.score}</span>
            <span>🎨 ${player.paintings_completed}</span>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }

  updateMarkets() {
    this.updateCanvasMarket();
    this.updatePaintMarket();
  }

  updateCanvasMarket() {
    const container = document.getElementById('canvasMarket');
    if (!container) return;
    
    let html = '';
    const costs = [1, 2, 3];
    
    this.gameState.gameState.canvas_market.forEach((canvas, index) => {
      if (canvas) {
        html += this.renderMarketCanvas(canvas, costs[index], index);
      } else {
        html += `
          <div class="market-canvas-card empty">
            <div class="text-center text-muted">Empty Slot</div>
          </div>
        `;
      }
    });
    
    container.innerHTML = html;
  }

  renderMarketCanvas(canvas, cost, slotIndex) {
    return `
      <div class="market-canvas-card" data-slot-index="${slotIndex}">
        <div class="canvas-cost">💎 ${cost}</div>
        <div class="canvas-header">
          <div class="canvas-name">${canvas.name}</div>
        </div>
        <div class="canvas-values">
          <span title="Stars">⭐ ${canvas.star_value}</span>
          <span title="Paint">🎨 ${canvas.paint_value}</span>
          <span title="Food">🍎 ${canvas.food_value}</span>
        </div>
        ${this.renderCanvasGrid(canvas.layout_json.squares, true)}
      </div>
    `;
  }

  renderCanvasGrid(squares, isMarket = false) {
    // Calculate grid dimensions
    const maxX = Math.max(...squares.map(s => s.x));
    const maxY = Math.max(...squares.map(s => s.y));
    
    let html = `<div class="canvas-grid" style="grid-template-columns: repeat(${maxX + 1}, 40px);">`;
    
    squares.forEach(square => {
      const colors = square.allowedColors.map(c => getPaintColor(c)).join(', ');
      html += `
        <div 
          class="canvas-square ${isMarket ? '' : 'drop-zone'}" 
          data-square-id="${square.id}"
          data-allowed-colors="${square.allowedColors.join(',')}"
          style="grid-column: ${square.x + 1}; grid-row: ${square.y + 1}; background: linear-gradient(45deg, ${colors});"
        ></div>
      `;
    });
    
    html += '</div>';
    return html;
  }

  updatePaintMarket() {
    const container = document.getElementById('paintMarket');
    if (!container) return;
    
    let html = '';
    this.gameState.gameState.paint_market.forEach(cube => {
      html += this.renderPaintCube(cube, true);
    });
    
    container.innerHTML = html;
  }

  renderPaintCube(cube, inMarket = false) {
    return `
      <div 
        class="paint-cube ${inMarket ? 'in-market' : ''}" 
        data-cube-id="${cube.id}"
        data-color="${cube.color}"
        data-is-wild="${cube.is_wild}"
        title="${cube.color}"
      ></div>
    `;
  }

  updatePlayerStudio() {
    this.updatePlayerCubes();
    this.updatePlayerCanvases();
  }

  updatePlayerCubes() {
    const container = document.getElementById('playerCubes');
    if (!container) return;
    
    const cubes = this.gameState.playerPaintCubes[this.myPlayerId] || [];
    
    let html = '';
    cubes.forEach(cube => {
      html += this.renderPaintCube(cube, false);
    });
    
    if (cubes.length === 0) {
      html = '<div class="text-muted text-center">No paint cubes</div>';
    }
    
    container.innerHTML = html;
    
    // Refresh drag and drop
    if (window.dragDropManager) {
      window.dragDropManager.refresh();
    }
  }

  updatePlayerCanvases() {
    const container = document.getElementById('playerCanvases');
    if (!container) return;
    
    const canvases = this.gameState.playerCanvases[this.myPlayerId] || [];
    
    let html = '';
    canvases.forEach(canvas => {
      html += this.renderPlayerCanvas(canvas);
    });
    
    if (canvases.length === 0) {
      html = '<div class="text-muted text-center">No canvases yet. Buy one from the market!</div>';
    }
    
    container.innerHTML = html;
    
    // Refresh drag and drop
    if (window.dragDropManager) {
      window.dragDropManager.refresh();
    }
  }

  renderPlayerCanvas(canvas) {
    const painted = canvas.painted_squares.length;
    const total = canvas.definition.layout_json.squares.length;
    const percentage = (painted / total) * 100;
    
    return `
      <div class="canvas-card ${canvas.completed ? 'completed' : ''}" data-canvas-id="${canvas.id}">
        <div class="canvas-header">
          <div class="canvas-name">${canvas.definition.name}</div>
          <div class="canvas-values">
            <span>⭐ ${canvas.definition.star_value}</span>
            <span>🎨 ${canvas.definition.paint_value}</span>
            <span>🍎 ${canvas.definition.food_value}</span>
          </div>
        </div>
        ${this.renderPlayerCanvasGrid(canvas)}
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${percentage}%"></div>
        </div>
        <div class="text-center mt-2">
          <small class="progress-text">${painted}/${total} painted</small>
        </div>
      </div>
    `;
  }

  renderPlayerCanvasGrid(canvas) {
    const squares = canvas.definition.layout_json.squares;
    const paintedMap = new Map(
      canvas.painted_squares.map(ps => [ps.squareId, ps])
    );
    
    const maxX = Math.max(...squares.map(s => s.x));
    const maxY = Math.max(...squares.map(s => s.y));
    
    let html = `<div class="canvas-grid" style="grid-template-columns: repeat(${maxX + 1}, 40px);">`;
    
    squares.forEach(square => {
      const painted = paintedMap.get(square.id);
      const isPainted = !!painted;
      
      html += `
        <div 
          class="canvas-square ${isPainted ? 'painted' : 'drop-zone'}" 
          data-square-id="${square.id}"
          data-allowed-colors="${square.allowedColors.join(',')}"
          style="
            grid-column: ${square.x + 1}; 
            grid-row: ${square.y + 1};
            ${isPainted ? `background-color: ${getPaintColor(painted.color)};` : ''}
          "
          ${isPainted ? `data-cube-color="${painted.color}"` : ''}
        >
          ${isPainted ? '<span style="color: white; font-size: 20px;">✓</span>' : ''}
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }

  updateActionButtons() {
    const isMyTurn = this.isMyTurn();
    const phase = this.gameState.game.current_phase;
    
    const workBtn = document.getElementById('workBtn');
    const endTurnBtn = document.getElementById('endTurnBtn');
    
    if (workBtn) {
      workBtn.disabled = !isMyTurn || phase === 'selling';
    }
    
    if (endTurnBtn) {
      endTurnBtn.disabled = !isMyTurn || phase === 'selling';
    }
  }

  handleCanvasPurchase(slotIndex) {
    if (!this.isMyTurn()) {
      showToast('Not Your Turn', 'Wait for your turn to buy canvases', 'warning');
      return;
    }
    
    if (window.openCanvasPurchase) {
      window.openCanvasPurchase(slotIndex);
    }
  }

  refreshPlayerStudio() {
    // Request fresh game state
    if (window.socket) {
      window.socket.emit('request-game-state', { gameId: this.gameState.game.id });
    }
  }
}
