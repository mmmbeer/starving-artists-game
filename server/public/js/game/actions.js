// Game Actions Handler

class GameActions {
  constructor(gameId, playerId) {
    this.gameId = gameId;
    this.playerId = playerId;
    this.isProcessing = false;
  }

  async performWork() {
    if (this.isProcessing) return;
    
    const btn = document.getElementById('workBtn');
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

  async buyCanvas(slotIndex) {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      const response = await api.post(`/game/${this.gameId}/action/buy-canvas`, {
        slotIndex
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
    
    const btn = document.getElementById('endTurnBtn');
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
}
