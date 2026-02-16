// Game UI Manager

class GameUI {
  constructor(gameState) {
    this.gameState = gameState;
    this.currentPlayerId = gameState.game.current_player_id;
    this.myPlayerId = null;

    if (!window.__canvasOverlayResizeBound) {
      window.addEventListener('resize', () => {
        this.refreshCanvasOverlays();
        this.updateCanvasMarketOverlap();
      });
      window.__canvasOverlayResizeBound = true;
    }
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
    this.updateActionCount();
    this.refreshCanvasOverlays();
  }

  updatePhaseIndicator() {
    const indicator = document.getElementById('phaseIndicator');
    const label = document.getElementById('phaseLabel');
    if (!indicator) return;

    const phase = this.gameState.game.current_phase;
    const phaseNames = {
      morning: 'Morning',
      day: 'Afternoon',
      night: 'Evening',
      selling: 'Selling'
    };

    indicator.setAttribute('data-phase', phase);
    if (label) label.textContent = phaseNames[phase] || phase;
  }

  updateTurnIndicator() {
    const indicator = document.getElementById('turnStatus');
    const headerName = document.getElementById('currentTurnName');
    if (!indicator && !headerName) return;

    const currentPlayer = this.gameState.players.find(
      p => p.id === this.currentPlayerId
    );

    if (this.isMyTurn()) {
      if (indicator) indicator.textContent = 'Your turn';
      if (headerName) headerName.textContent = currentPlayer?.name || 'You';
    } else if (currentPlayer) {
      if (indicator) indicator.textContent = `Waiting for ${currentPlayer.name}`;
      if (headerName) headerName.textContent = currentPlayer.name;
    }
  }

  updateActionCount() {
    const countEl = document.getElementById('actionCountValue');
    const leftEl = document.getElementById('actionsLeftValue');
    const freeEl = document.getElementById('freeActionValue');
    if (!countEl) return;
    const actionsTaken = this.gameState.gameState.actions_taken || 0;
    const actionsLeft = Math.max(0, 2 - actionsTaken);
    countEl.textContent = actionsTaken;
    if (leftEl) leftEl.textContent = actionsLeft;
    if (freeEl) {
      freeEl.textContent = this.isFreeActionAvailable() ? 'Available' : 'Used';
    }
  }

  updatePlayersList() {
    const container = document.getElementById('turnInfoList');
    if (!container) return;

    const orderedPlayers = [...this.gameState.players].sort(
      (a, b) => (a.turn_order || 0) - (b.turn_order || 0)
    );
    const phase = this.gameState.game.current_phase;
    const canvasesByPlayer = this.gameState.playerCanvases || {};
    const sellingCandidates = new Set();

    if (phase === 'night' || phase === 'selling') {
      orderedPlayers.forEach(player => {
        const canvases = canvasesByPlayer[player.id] || [];
        if (canvases.some(canvas => canvas.completed)) {
          sellingCandidates.add(player.id);
        }
      });
    }

    if (phase === 'selling' && this.gameState.gameState.selling_phase_data?.order) {
      this.gameState.gameState.selling_phase_data.order.forEach(entry => {
        sellingCandidates.add(entry.playerId);
      });
    }

    const html = orderedPlayers.map(player => {
      const isActive = player.id === this.currentPlayerId;
      const isMe = player.id === this.myPlayerId;
      const showSelling = sellingCandidates.has(player.id);
      const actionsText = isActive ? `${this.gameState.gameState.actions_taken}/2` : '-';

      return `
        <div class="turn-info-item ${isActive ? 'active' : ''} ${isMe ? 'me' : ''}" data-player-id="${player.id}" data-selling="${showSelling}">
          <div class="turn-info-content">
            <span class="turn-field"><span class="turn-label">Name:</span> <span class="turn-name">${player.name}</span></span>
            <span class="turn-field"><span class="turn-label">Points:</span> <span class="turn-value">${player.score}</span></span>
            <span class="turn-field"><span class="turn-label">Nutrition:</span> <span class="turn-value">${player.nutrition}</span></span>
            <span class="turn-field turn-actions"><span class="turn-label">Actions:</span> <span class="turn-value">${actionsText}</span></span>
          </div>
          ${isMe || showSelling ? `
            <div class="turn-badges">
              ${isMe ? '<span class="turn-you">You</span>' : ''}
              ${showSelling ? '<span class="turn-selling">Selling</span>' : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  updateMarkets() {
    this.updateCanvasMarket();
    this.updateCanvasDeckCount();
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
    this.updateCanvasMarketOverlap();
  }

  updateCanvasDeckCount() {
    const countEl = document.getElementById('canvasDeckCount');
    if (!countEl) return;
    const count = this.gameState.gameState.canvas_deck?.length || 0;
    countEl.textContent = count;
  }

  updateCanvasMarketOverlap() {
    const container = document.getElementById('canvasMarket');
    if (!container) return;

    const applyState = () => {
      const needsOverlap = container.scrollWidth > container.clientWidth + 4;
      container.classList.toggle('is-overflowing', needsOverlap);
    };

    requestAnimationFrame(applyState);
  }

  renderMarketCanvas(canvas, cost, slotIndex) {
    return `
      <div class="market-canvas-card" tabindex="0" aria-label="Canvas ${canvas.name}" data-slot-index="${slotIndex}">
        <div class="canvas-cost">Cost ${cost}</div>
        ${this.renderMarketCanvasMedia(canvas)}
        <div class="canvas-hover-meta">Stars ${canvas.star_value} | Paint ${canvas.paint_value} | Food ${canvas.food_value}</div>
      </div>
    `;
  }

  renderMarketCanvasMedia(canvas) {
    if (canvas.filename) {
      return `
        <div class="market-canvas-media">
          <div class="market-canvas-frame">
            <img src="/assets/canvases/${canvas.filename}" alt="${canvas.name}" class="canvas-thumbnail">
            ${this.renderMarketSquareMarkers(canvas)}
          </div>
        </div>
      `;
    }

    return `
      <div class="market-canvas-media">
        ${this.renderCanvasGrid(canvas.layout_json.squares, true)}
      </div>
    `;
  }

  renderMarketSquareMarkers(canvas) {
    if (!canvas.layout_json || !canvas.layout_json.squares) return '';
    const markers = canvas.layout_json.squares.map(square => {
      const left = (square.position && square.position.x !== undefined) ? square.position.x : (square.x || 0);
      const top = (square.position && square.position.y !== undefined) ? square.position.y : (square.y || 0);
      return `
        <div 
          class="canvas-square-marker" 
          data-x="${left}"
          data-y="${top}"
          data-allowed-colors="${square.allowedColors.join(',')}"
          title="${square.allowedColors.join(', ')}"
        ></div>
      `;
    }).join('');

    return `<div class="canvas-squares-overlay preview">${markers}</div>`;
  }

  renderCanvasGrid(squares, isMarket = false) {
    // Calculate grid dimensions
    const maxX = Math.max(...squares.map(s => (s.position && s.position.x !== undefined) ? s.position.x : (s.x || 0)));
    const maxY = Math.max(...squares.map(s => (s.position && s.position.y !== undefined) ? s.position.y : (s.y || 0)));
    
    const gridClass = isMarket ? 'canvas-grid canvas-preview' : 'canvas-grid';
    const gridSize = isMarket ? 24 : 40;
    let html = `<div class="${gridClass}" style="grid-template-columns: repeat(${maxX + 1}, ${gridSize}px);">`;
    
    squares.forEach(square => {
      const colors = square.allowedColors.map(c => getPaintColor(c)).join(', ');
      const gridX = (square.position && square.position.x !== undefined) ? square.position.x : (square.x || 0);
      const gridY = (square.position && square.position.y !== undefined) ? square.position.y : (square.y || 0);
      html += `
        <div 
          class="canvas-square ${isMarket ? '' : 'drop-zone'}" 
          data-square-id="${square.id}"
          data-allowed-colors="${square.allowedColors.join(',')}"
          style="grid-column: ${gridX + 1}; grid-row: ${gridY + 1}; background: linear-gradient(45deg, ${colors});"
        ></div>
      `;
    });
    
    html += '</div>';
    return html;
  }

  updatePaintMarket() {
    const container = document.getElementById('paintMarket');
    if (!container) return;

    const colorOrder = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'wild'];
    const marketGroups = {};
    colorOrder.forEach(color => { marketGroups[color] = []; });
    this.gameState.gameState.paint_market.forEach(cube => {
      marketGroups[cube.color].push(cube);
    });

      const html = colorOrder.map(color => {
      const cubes = marketGroups[color];
      const cubesHtml = cubes.map((cube, index) => this.renderPaintCube(cube, true, index)).join('');
      return `
        <div class="paint-slot" data-color="${color}" title="${color}">
          <div class="paint-slot-pile" aria-hidden="true">
            ${cubesHtml}
          </div>
          <div class="paint-slot-meta">
            <span class="slot-count">${cubes.length}</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  renderPaintCube(cube, inMarket = false, pileIndex = 0) {
    const tilt = getCubeTilt(cube.id) * (inMarket ? 0.7 : 1);
    const pileStyle = getCubePileStyle(cube.id, pileIndex);
    return `
      <div 
        class="paint-cube ${inMarket ? 'in-market' : 'in-tray'}" 
        draggable="${inMarket ? 'false' : 'true'}"
        data-cube-id="${cube.id}"
        data-color="${cube.color}"
        data-is-wild="${cube.is_wild}"
        style="--cube-tilt: ${tilt}deg; ${pileStyle}"
        title="${cube.color}${cube.is_wild ? ' (Wild)' : ''}"
      ></div>
    `;
  }

  updatePlayerStudio() {
    this.updatePlayerStats();
    this.updatePlayerCubes();
    this.updatePlayerCanvases();
  }

  updatePlayerStats() {
    const scoreEl = document.getElementById('playerScore');
    const nutritionEl = document.getElementById('nutritionValue');
    const player = this.gameState.players.find(p => p.id === this.myPlayerId);
    if (!player) return;
    if (scoreEl) scoreEl.textContent = player.score;
    if (nutritionEl) nutritionEl.textContent = player.nutrition;
  }

  updatePlayerCubes() {
    const container = document.getElementById('playerCubes');
    if (!container) return;
    
    const cubes = this.gameState.playerPaintCubes[this.myPlayerId] || [];

    const colorOrder = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'wild'];
    const playerGroups = {};
    colorOrder.forEach(color => { playerGroups[color] = []; });
    cubes.forEach(cube => { playerGroups[cube.color].push(cube); });

    if (cubes.length === 0) {
      container.innerHTML = '<div class="text-muted text-center">No paint cubes</div>';
    } else {
      const html = colorOrder.map(color => {
        const colorCubes = playerGroups[color];
        const cubesHtml = colorCubes.map((cube, index) => this.renderPaintCube(cube, false, index)).join('');
        return `
          <div class="paint-slot" data-color="${color}" title="${color}">
            <div class="paint-slot-pile">
              ${cubesHtml}
            </div>
            <div class="paint-slot-meta">
              <span class="slot-count">${colorCubes.length}</span>
            </div>
          </div>
        `;
      }).join('');
      container.innerHTML = html;
    }
    
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

    this.bindCarouselInteractions();
    
    // Refresh drag and drop
    if (window.dragDropManager) {
      window.dragDropManager.refresh();
    }
  }

  refreshCanvasOverlays() {
    const frames = document.querySelectorAll('.canvas-painting-frame, .market-canvas-frame');
    frames.forEach(frame => {
      const img = frame.querySelector('img');
      if (!img) return;

      const applyPositions = () => {
        if (!img.naturalWidth || !img.naturalHeight) return;
        const rect = img.getBoundingClientRect();
        const scaleX = rect.width / img.naturalWidth;
        const scaleY = rect.height / img.naturalHeight;
        const scale = Math.min(scaleX, scaleY) || 1;
        frame.style.setProperty('--overlay-scale', scale.toFixed(4));

        frame.querySelectorAll('.paint-drop-zone').forEach(zone => {
          const x = parseFloat(zone.dataset.x || '0');
          const y = parseFloat(zone.dataset.y || '0');
          zone.style.left = `${x * scaleX}px`;
          zone.style.top = `${y * scaleY}px`;
        });

        frame.querySelectorAll('.canvas-square-marker').forEach(marker => {
          const x = parseFloat(marker.dataset.x || '0');
          const y = parseFloat(marker.dataset.y || '0');
          marker.style.left = `${x * scaleX}px`;
          marker.style.top = `${y * scaleY}px`;
        });
      };

      if (img.complete) {
        applyPositions();
      } else {
        img.addEventListener('load', applyPositions, { once: true });
      }
    });
  }

  renderPlayerCanvas(canvas) {
    return `
      <div class="canvas-card ${canvas.completed ? 'completed' : ''}" data-canvas-id="${canvas.id}">
        ${this.renderPlayerCanvasBody(canvas)}
      </div>
    `;
  }

  renderPlayerCanvasBody(canvas) {
    if (canvas.definition && canvas.definition.filename) {
      return this.renderPlayerCanvasImage(canvas);
    }
    return this.renderPlayerCanvasGrid(canvas);
  }

  renderPlayerCanvasImage(canvas) {
    const paintedMap = new Map(
      canvas.painted_squares.map(ps => [ps.squareId, ps])
    );

    const squares = canvas.definition.layout_json.squares;
    const overlaySquares = squares.map(square => {
      const painted = paintedMap.get(square.id);
      const isPainted = !!painted;
      const paintedStyle = isPainted ? `background-color: ${getPaintColor(painted.color)};` : '';
      const cubeColor = isPainted ? `data-cube-color="${painted.color}"` : '';
      const cubeMarkup = isPainted ? `<div class="paint-cube in-canvas" data-color="${painted.color}"></div>` : '';
      const allowedColors = square.allowedColors || [];
      const borderColors = allowedColors.map(color => getPaintColor(color));
      const isMulti = borderColors.length > 1;
      const borderStyle = borderColors.length
        ? (isMulti
          ? `border: 2px solid transparent; border-image: linear-gradient(135deg, ${borderColors.join(', ')}); border-image-slice: 1;`
          : `border-color: ${borderColors[0]};`)
        : '';
      const left = (square.position && square.position.x !== undefined) ? square.position.x : (square.x || 0);
      const top = (square.position && square.position.y !== undefined) ? square.position.y : (square.y || 0);
      return `
        <div 
          class="paint-drop-zone ${isPainted ? 'painted' : 'drop-zone'} ${isMulti ? 'multi-color' : ''}" 
          data-square-id="${square.id}"
          data-allowed-colors="${square.allowedColors.join(',')}"
          data-x="${left}"
          data-y="${top}"
          style="${paintedStyle} ${borderStyle}"
          ${cubeColor}
          title="${isPainted ? 'Painted: ' + painted.color : 'Allowed: ' + square.allowedColors.join(', ')}"
        >
          ${cubeMarkup}
        </div>
      `;
    }).join('');

    return `
      <div class="canvas-painting-container" data-orientation="${canvas.definition.layout_json?.orientation || 'landscape'}">
        <div class="canvas-painting-frame">
          <img src="/assets/canvases/${canvas.definition.filename}" alt="${canvas.definition.name}" class="canvas-painting-img">
          <div class="canvas-paint-overlay">
            ${overlaySquares}
          </div>
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
          class="canvas-square ${isPainted ? 'painted' : 'drop-zone'} ${square.allowedColors.length > 1 ? 'multi-color' : ''}" 
          data-square-id="${square.id}"
          data-allowed-colors="${square.allowedColors.join(',')}"
          style="
            grid-column: ${square.x + 1}; 
            grid-row: ${square.y + 1};
            ${isPainted ? `background-color: ${getPaintColor(painted.color)};` : ''}
            ${square.allowedColors.length > 1
              ? `border: 2px solid transparent; border-image: linear-gradient(135deg, ${square.allowedColors.map(color => getPaintColor(color)).join(', ')}); border-image-slice: 1;`
              : `border-color: ${getPaintColor(square.allowedColors[0])};`}
          "
          ${isPainted ? `data-cube-color="${painted.color}"` : ''}
        >
          ${isPainted ? `<div class="paint-cube in-canvas" data-color="${painted.color}"></div>` : ''}
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }

  bindCarouselInteractions() {
    const container = document.getElementById('playerCanvases');
    if (!container) return;

    const cards = Array.from(container.querySelectorAll('.canvas-card'));
    if (cards.length === 0) return;

    cards.forEach((card, index) => {
      card.addEventListener('click', () => {
        cards.forEach(el => el.classList.remove('is-active'));
        card.classList.add('is-active');
        card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
      if (index === 0) card.classList.add('is-active');
    });

    const prevBtn = document.getElementById('canvasPrevBtn');
    const nextBtn = document.getElementById('canvasNextBtn');
    const scrollBy = () => container.clientWidth * 0.7;

    if (prevBtn) {
      prevBtn.onclick = () => container.scrollBy({ left: -scrollBy(), behavior: 'smooth' });
    }

    if (nextBtn) {
      nextBtn.onclick = () => container.scrollBy({ left: scrollBy(), behavior: 'smooth' });
    }
  }

  updateActionButtons() {
    const isMyTurn = this.isMyTurn();
    const phase = this.gameState.game.current_phase;
    
    const workBtn = document.getElementById('actionWorkBtn');
    const passBtn = document.getElementById('actionPassBtn');
    const sellBtn = document.getElementById('actionSellBtn');
    const buyBtn = document.getElementById('actionBuyBtn');
    const paintBtn = document.getElementById('actionPaintBtn');
    const freeBtn = document.getElementById('actionFreeBtn');
    const tradeBtn = document.querySelector('[data-free-action="trade"]');
    const resetBtn = document.querySelector('[data-free-action="reset-market"]');
    const actionsTaken = this.gameState.gameState.actions_taken || 0;
    const actionsExhausted = actionsTaken >= 2;
    const freeAvailable = this.isFreeActionAvailable();
    
    const regularDisabled = !isMyTurn || phase === 'selling' || phase === 'night' || actionsExhausted;

    if (workBtn) workBtn.disabled = regularDisabled;
    if (buyBtn) buyBtn.disabled = regularDisabled;
    if (paintBtn) paintBtn.disabled = regularDisabled;
    if (passBtn) passBtn.disabled = !isMyTurn || phase === 'selling' || phase === 'night';
    if (sellBtn) sellBtn.disabled = !isMyTurn || phase !== 'night';

    const freeDisabled = !isMyTurn || phase === 'selling' || phase === 'night' || !freeAvailable;
    if (freeBtn) freeBtn.disabled = freeDisabled;
    if (tradeBtn) tradeBtn.disabled = freeDisabled;
    if (resetBtn) resetBtn.disabled = freeDisabled;
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

  isFreeActionAvailable() {
    const player = this.gameState.players.find(p => p.id === this.myPlayerId);
    if (!player) return false;
    const lastUsed = player.last_free_action_day || 0;
    return lastUsed < this.gameState.game.day_number;
  }
}

function getCubeTilt(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 360;
  }
  const tilt = (hash % 9) - 4;
  return tilt;
}

function getCubePileStyle(id, index) {
  let hash = 0;
  const seedText = `${id}:${index}`;
  for (let i = 0; i < seedText.length; i += 1) {
    hash = (hash * 33 + seedText.charCodeAt(i)) % 100000;
  }

  const x = (hash % 22) - 6;
  const y = (Math.floor(hash / 7) % 16) - 6;
  const r = (Math.floor(hash / 17) % 28) - 14;
  const z = 10 + index;
  return `--pile-x:${x}px; --pile-y:${y}px; --pile-r:${r}deg; --pile-z:${z};`;
}
