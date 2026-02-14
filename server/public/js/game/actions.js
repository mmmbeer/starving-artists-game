// Game Actions Handler

class GameActions {
  constructor(gameId, playerId) {
    this.gameId = gameId;
    this.playerId = playerId;
    this.isProcessing = false;
  }

  async performWork() {
    if (this.isProcessing) return;
    
    const btn = document.getElementById('actionWorkBtn');
    if (!btn) return;
    
    this.isProcessing = true;
    setButtonLoading(btn, true);
    
    try {
      const response = await api.post(`/game/${this.gameId}/action/work`);
      
      if (response.success) {
        showToast('Work Complete', 'You drew 3 paint cubes!', 'success');
        if (window.applyGameState && response.gameState) {
          window.applyGameState(response.gameState);
        }
      }
    } catch (error) {
      showToast('Error', error.message, 'danger');
    } finally {
      this.isProcessing = false;
      setButtonLoading(btn, false);
    }
  }

  async buyCanvas(slotIndex, cubeIds) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      const response = await api.post(`/game/${this.gameId}/action/buy-canvas`, {
        slotIndex,
        cubeIds
      });
      
      if (response.success) {
        showToast('Canvas Purchased', 'Canvas added to your studio!', 'success');
        if (window.applyGameState && response.gameState) {
          window.applyGameState(response.gameState);
        }
      }
    } catch (error) {
      showToast('Error', error.message, 'danger');
    } finally {
      this.isProcessing = false;
    }
  }

  async endTurn() {
    if (this.isProcessing) return;
    
    const btn = document.getElementById('actionPassBtn');
    if (!btn) return;
    
    this.isProcessing = true;
    setButtonLoading(btn, true);
    
    try {
      const response = await api.post(`/game/${this.gameId}/action/end-turn`);
      
      if (response.success) {
        showToast('Turn Ended', 'Moving to next player...', 'info');
        if (window.applyGameState && response.gameState) {
          window.applyGameState(response.gameState);
        }
      }
    } catch (error) {
      showToast('Error', error.message, 'danger');
    } finally {
      this.isProcessing = false;
      setButtonLoading(btn, false);
    }
  }

  async submitSellIntents(canvasIds) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      const response = await api.post(`/game/${this.gameId}/action/sell`, {
        canvasIds
      });
      
      if (response.success) {
        showToast('Sell Intent Submitted', 'Waiting for other players...', 'info');
        
        // Emit socket event
        if (window.socket) {
          window.socket.emit('action:sell', {
            gameId: this.gameId,
            playerId: this.playerId,
            canvasIds
          });
        }
      }
    } catch (error) {
      showToast('Error', error.message, 'danger');
    } finally {
      this.isProcessing = false;
    }
  }

  async tradeForPaint(tradeCubeIds, marketCubeIds) {
    if (this.isProcessing) return;

    this.isProcessing = true;
    let success = false;

    try {
      const response = await api.post(`/game/${this.gameId}/action/trade-paint`, {
        tradeCubeIds,
        marketCubeIds
      });

      if (response.success) {
        success = true;
        showToast('Trade Complete', `Traded ${tradeCubeIds.length} cubes for ${marketCubeIds.length}`, 'success');
        if (window.applyGameState && response.gameState) {
          window.applyGameState(response.gameState);
        }
      }
    } catch (error) {
      showToast('Error', error.message, 'danger');
    } finally {
      this.isProcessing = false;
    }
    return success;
  }

  async resetCanvasMarket(cubeIds) {
    if (this.isProcessing) return;

    this.isProcessing = true;
    let success = false;

    try {
      const response = await api.post(`/game/${this.gameId}/action/reset-canvas-market`, {
        cubeIds
      });

      if (response.success) {
        success = true;
        showToast('Canvas Market Reset', 'Three new canvases have been revealed', 'success');
        if (window.applyGameState && response.gameState) {
          window.applyGameState(response.gameState);
        }
      }
    } catch (error) {
      showToast('Error', error.message, 'danger');
    } finally {
      this.isProcessing = false;
    }
    return success;
  }
}
