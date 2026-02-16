// Drag and Drop functionality for painting

class DragDropManager {
  constructor() {
    this.draggedCube = null;
    this.draggedCubeData = null;
    this.dropZones = [];
    this.pendingPaints = []; // Store paints before committing
  }

  initialize() {
    this.setupDraggableCubes();
    this.setupDropZones();
  }

  setupDraggableCubes() {
    const cubes = document.querySelectorAll('.paint-cube:not(.in-market):not(.in-canvas)');
    const canPaintNow = this.canPaintRightNow();
    
    cubes.forEach(cube => {
      cube.setAttribute('draggable', canPaintNow ? 'true' : 'false');
      
      cube.addEventListener('dragstart', (e) => this.handleDragStart(e));
      cube.addEventListener('dragend', (e) => this.handleDragEnd(e));
    });
  }

  setupDropZones() {
    const squares = document.querySelectorAll('.canvas-square.drop-zone:not(.painted), .paint-drop-zone.drop-zone:not(.painted)');
    
    squares.forEach(square => {
      square.addEventListener('dragover', (e) => this.handleDragOver(e));
      square.addEventListener('dragenter', (e) => this.handleDragEnter(e));
      square.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      square.addEventListener('drop', (e) => this.handleDrop(e));
    });
    
    this.dropZones = Array.from(squares);
  }

  handleDragStart(e) {
    if (!this.canPaintRightNow()) {
      e.preventDefault();
      showToast('Paint Unavailable', 'You can only paint on your turn while actions remain', 'warning');
      return;
    }

    this.draggedCube = e.target;
    this.draggedCubeData = {
      id: e.target.dataset.cubeId,
      color: e.target.dataset.color,
      isWild: e.target.dataset.isWild === 'true'
    };
    
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.cubeId);
    
    // Visual feedback
    this.highlightValidDropZones();
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
    e.target.classList.remove('drag-valid');
    this.removeAllHighlights();
    this.draggedCube = null;
    this.draggedCubeData = null;
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  handleDragEnter(e) {
    e.preventDefault();
    
    const square = e.target.closest('.canvas-square, .paint-drop-zone');
    if (square && !square.classList.contains('painted')) {
      if (this.canPaintSquare(square)) {
        square.classList.add('drag-over');
        if (this.draggedCube) {
          this.draggedCube.classList.add('drag-valid');
        }
      }
    }
  }

  handleDragLeave(e) {
    const square = e.target.closest('.canvas-square, .paint-drop-zone');
    if (square) {
      square.classList.remove('drag-over');
    }
    if (this.draggedCube) {
      this.draggedCube.classList.remove('drag-valid');
    }
  }

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!this.canPaintRightNow()) {
      showToast('Paint Unavailable', 'You cannot apply paint right now', 'warning');
      return false;
    }
    
    const square = e.target.closest('.canvas-square, .paint-drop-zone');
    if (!square || square.classList.contains('painted')) {
      return false;
    }

    if (this.pendingPaints.length >= 4) {
      showToast('Paint Limit Reached', 'You can place up to 4 cubes per painting action', 'warning');
      return false;
    }
    
    // Validate the drop
    if (!this.canPaintSquare(square)) {
      showToast('Invalid Move', 'This cube color cannot be used on this square', 'warning');
      return false;
    }
    
    // Add to pending paints
    this.addPendingPaint(square, this.draggedCubeData);
    
    // Visual update
    this.paintSquare(square, this.draggedCubeData.color);
    
    // Remove cube from studio
    if (this.draggedCube) {
      this.draggedCube.classList.remove('drag-valid');
      this.draggedCube.remove();
    }
    
    square.classList.remove('drag-over');
    
    // Check if we can commit (up to 4 cubes per action)
    if (this.pendingPaints.length >= 4) {
      this.promptCommitPaints();
    }
    
    return false;
  }

  canPaintSquare(square) {
    if (!this.draggedCubeData) return false;
    
    const allowedColors = square.dataset.allowedColors?.split(',') || [];
    
    // Wild cubes can go anywhere, but check if canvas already has a wild
    if (this.draggedCubeData.isWild) {
      const canvas = square.closest('.canvas-card');
      if (canvas) {
        const hasWild = canvas.querySelector('[data-cube-color="wild"]');
        if (hasWild) {
          return false; // Canvas already has a wild cube
        }
      }
      return true;
    }
    
    // Regular cube - check if color is allowed
    return allowedColors.includes(this.draggedCubeData.color);
  }

  paintSquare(square, color) {
    square.classList.add('painted');
    square.classList.remove('drop-zone', 'drag-over');
    square.style.backgroundColor = getPaintColor(color);
    square.dataset.cubeColor = color;
    
    const cube = document.createElement('div');
    cube.className = 'paint-cube in-canvas';
    cube.dataset.color = color;
    if (this.draggedCubeData?.id) {
      cube.dataset.cubeId = this.draggedCubeData.id;
    }
    square.innerHTML = '';
    square.appendChild(cube);
    
    // Update progress bar
    this.updateCanvasProgress(square.closest('.canvas-card'));
  }

  addPendingPaint(square, cubeData) {
    const canvasCard = square.closest('.canvas-card');
    if (!canvasCard) return;
    
    const canvasId = canvasCard.dataset.canvasId;
    const squareId = square.dataset.squareId;
    
    this.pendingPaints.push({
      canvasId,
      squareId,
      cubeId: cubeData.id
    });
    
    // Update pending count display
    this.updatePendingCount();
  }

  updatePendingCount() {
    const countElement = document.getElementById('pendingPaintsCount');
    if (countElement) {
      countElement.textContent = this.pendingPaints.length;
    }
    
    const commitBtn = document.getElementById('commitPaintsBtn');
    if (commitBtn) {
      commitBtn.disabled = this.pendingPaints.length === 0;
      if (this.pendingPaints.length > 0) {
        commitBtn.textContent = `Apply ${this.pendingPaints.length} Paint${this.pendingPaints.length !== 1 ? 's' : ''}`;
      } else {
        commitBtn.textContent = 'Apply Paints';
      }
    }
  }

  promptCommitPaints() {
    if (this.pendingPaints.length > 0) {
      showToast(
        'Ready to Commit', 
        `You have ${this.pendingPaints.length} pending paint(s). Click "Apply Paints" to commit.`,
        'info'
      );
    }
  }

  async commitPaints() {
    if (this.pendingPaints.length === 0) {
      showToast('No Paints', 'No paints to apply', 'warning');
      return;
    }

    if (!this.canPaintRightNow()) {
      showToast('Paint Unavailable', 'You can only paint on your turn while actions remain', 'warning');
      return;
    }
    
    try {
      const gameId = window.gameId;
      const response = await api.post(`/game/${gameId}/action/paint`, {
        paintings: this.pendingPaints
      });
      
      if (response.success) {
        showToast('Success', 'Paints applied successfully!', 'success');
        if (window.applyGameState && response.gameState) {
          window.applyGameState(response.gameState);
        }
        
        this.pendingPaints = [];
        this.updatePendingCount();
      }
    } catch (error) {
      showToast('Error', error.message, 'danger');
      // Revert paints
      this.revertPendingPaints();
    }
  }

  revertPendingPaints() {
    // Remove visual paints and restore cubes
    this.pendingPaints.forEach(paint => {
      const canvas = document.querySelector(`[data-canvas-id="${paint.canvasId}"]`);
      const square = canvas?.querySelector(`[data-square-id="${paint.squareId}"]`);
      
      if (square) {
        square.classList.remove('painted');
        square.classList.add('drop-zone');
        square.style.backgroundColor = '';
        square.innerHTML = '';
        delete square.dataset.cubeColor;
      }
    });
    
    this.pendingPaints = [];
    this.updatePendingCount();
    
    // Refresh cubes
    if (window.gameUI) {
      window.gameUI.refreshPlayerStudio();
    }
  }

  updateCanvasProgress(canvasCard) {
    if (!canvasCard) return;
    
    const squares = canvasCard.querySelectorAll('.canvas-square, .paint-drop-zone');
    const painted = canvasCard.querySelectorAll('.canvas-square.painted, .paint-drop-zone.painted');
    const percentage = (painted.length / squares.length) * 100;
    
    const progressBar = canvasCard.querySelector('.progress-bar');
    if (progressBar) {
      progressBar.style.width = percentage + '%';
    }
    
    const progressText = canvasCard.querySelector('.progress-text');
    if (progressText) {
      progressText.textContent = `${painted.length}/${squares.length} painted`;
    }
    
    // Check if completed
    if (painted.length === squares.length) {
      canvasCard.classList.add('completed');
      showToast('Canvas Complete!', 'You completed a painting!', 'success');
    }
  }

  highlightValidDropZones() {
    if (!this.draggedCubeData) return;
    
    this.dropZones.forEach(square => {
      if (this.canPaintSquare(square)) {
        square.classList.add('valid-drop');
        square.classList.remove('invalid-drop');
      } else {
        square.classList.add('invalid-drop');
        square.classList.remove('valid-drop');
      }
    });
  }

  removeAllHighlights() {
    this.dropZones.forEach(square => {
      square.classList.remove('valid-drop', 'invalid-drop');
      square.classList.remove('drag-over');
    });
  }

  reset() {
    this.pendingPaints = [];
    this.updatePendingCount();
    this.removeAllHighlights();
  }

  refresh() {
    this.dropZones = [];
    this.setupDraggableCubes();
    this.setupDropZones();
  }

  canPaintRightNow() {
    const state = window.gameUI?.gameState;
    if (!state || !window.gameUI?.isMyTurn?.()) {
      return false;
    }

    const phase = state.game?.current_phase;
    if (phase !== 'morning' && phase !== 'day') {
      return false;
    }

    const actionsTaken = state.gameState?.actions_taken || 0;
    return actionsTaken < 2;
  }
}

// Create global instance
const dragDropManager = new DragDropManager();
window.dragDropManager = dragDropManager;
