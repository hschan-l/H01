/*
  push-step-puzzle.module.js
  ES module extracted from Push & Step Puzzle.html
  - Exports PushStepPuzzle class (default)
  - Auto-instantiates on DOMContentLoaded and attaches to window.pushStepPuzzle
*/

export default class PushStepPuzzle {
  constructor() {
    // Config
    this.GRID_SIZE = 6;
    this.NUM_OBSTACLES = 10;

    // State
    this.obstacles = [];
    this.rings = [];

    this.savedObstacles = [];
    this.savedRings = [];
    this.moveHistory = [];

    this.selectedRingIndex = null;
    this.isGameOver = false;

    // Touch tracking
    this.touchStartX = 0;
    this.touchStartY = 0;

    // DOM
    this.gameContainer = document.getElementById('game-container');
    this.gridEl = document.getElementById('grid');
    this.messageEl = document.getElementById('message');

    // Buttons by id (expect these IDs in the HTML)
    this.btnUp = document.getElementById('dbtn-up');
    this.btnLeft = document.getElementById('dbtn-left');
    this.btnDown = document.getElementById('dbtn-down');
    this.btnRight = document.getElementById('dbtn-right');

    this.btnUndo = document.getElementById('btn-undo');
    this.btnReset = document.getElementById('btn-reset');
    this.btnNew = document.getElementById('btn-new');

    // Bind events
    this._bindControls();
    this._bindTouch();

    // Start
    this.newRandomGame();
  }

  _bindControls() {
    if (this.btnUp) this.btnUp.addEventListener('click', () => this.moveSelectedRing(-1, 0));
    if (this.btnLeft) this.btnLeft.addEventListener('click', () => this.moveSelectedRing(0, -1));
    if (this.btnDown) this.btnDown.addEventListener('click', () => this.moveSelectedRing(1, 0));
    if (this.btnRight) this.btnRight.addEventListener('click', () => this.moveSelectedRing(0, 1));

    if (this.btnUndo) this.btnUndo.addEventListener('click', () => this.undoLastMove());
    if (this.btnReset) this.btnReset.addEventListener('click', () => this.resetCurrentLevel());
    if (this.btnNew) this.btnNew.addEventListener('click', () => this.newRandomGame());
  }

  _bindTouch() {
    if (!this.gameContainer) return;
    this.gameContainer.addEventListener('touchstart', (e) => {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }, { passive: true });

    this.gameContainer.addEventListener('touchend', (e) => {
      if (this.selectedRingIndex === null || this.isGameOver) return;

      let touchEndX = e.changedTouches[0].clientX;
      let touchEndY = e.changedTouches[0].clientY;

      let diffX = touchEndX - this.touchStartX;
      let diffY = touchEndY - this.touchStartY;

      if (Math.max(Math.abs(diffX), Math.abs(diffY)) > 25) {
        if (Math.abs(diffX) > Math.abs(diffY)) {
          this.moveSelectedRing(0, diffX > 0 ? 1 : -1);
        } else {
          this.moveSelectedRing(diffY > 0 ? 1 : -1, 0);
        }
      }
    }, { passive: true });
  }

  newRandomGame() {
    this.selectedRingIndex = null;
    this.moveHistory = [];
    this.isGameOver = false;
    if (this.messageEl) this.messageEl.innerText = '';

    // Generate Crosses ensuring no 3-in-a-row initially
    while (true) {
      this.obstacles = Array(this.GRID_SIZE).fill(null).map(() => Array(this.GRID_SIZE).fill(0));
      let placedObstacles = 0;
      while (placedObstacles < this.NUM_OBSTACLES) {
        let r = Math.floor(Math.random() * this.GRID_SIZE);
        let c = Math.floor(Math.random() * this.GRID_SIZE);
        if (this.obstacles[r][c] === 0) {
          this.obstacles[r][c] = 1;
          placedObstacles++;
        }
      }
      if (!this.checkThreeInALine(this.obstacles)) break;
    }

    // Generate Rings
    this.generateRandomNonLineRings();

    this.savedObstacles = JSON.parse(JSON.stringify(this.obstacles));
    this.savedRings = JSON.parse(JSON.stringify(this.rings));

    this.renderGrid();
  }

  resetCurrentLevel() {
    this.selectedRingIndex = null;
    this.moveHistory = [];
    this.isGameOver = false;
    if (this.messageEl) this.messageEl.innerText = '';
    this.obstacles = JSON.parse(JSON.stringify(this.savedObstacles));
    this.rings = JSON.parse(JSON.stringify(this.savedRings));
    this.renderGrid();
  }

  generateRandomNonLineRings() {
    const emptyCells = [];
    for (let r = 0; r < this.GRID_SIZE; r++) {
      for (let c = 0; c < this.GRID_SIZE; c++) {
        if (this.obstacles[r][c] === 0) {
          emptyCells.push({ r, c });
        }
      }
    }

    while (true) {
      let shuffled = [...emptyCells].sort(() => 0.5 - Math.random());
      let candidateRings = [shuffled[0], shuffled[1], shuffled[2]];

      if (!this.isRingLineAlignment(candidateRings)) {
        this.rings = candidateRings;
        break;
      }
    }
  }

  // Checks if 3 items (rings) are aligned continuously
  isRingLineAlignment(testRings) {
    if (testRings[0].r === testRings[1].r && testRings[1].r === testRings[2].r) {
      let cols = testRings.map(p => p.c).sort((a, b) => a - b);
      if (cols[2] - cols[1] === 1 && cols[1] - cols[0] === 1) return true;
    }

    if (testRings[0].c === testRings[1].c && testRings[1].c === testRings[2].c) {
      let rows = testRings.map(p => p.r).sort((a, b) => a - b);
      if (rows[2] - rows[1] === 1 && rows[1] - rows[0] === 1) return true;
    }

    let sorted = [...testRings].sort((a, b) => a.r - b.r || a.c - b.c);
    let dr1 = sorted[1].r - sorted[0].r;
    let dc1 = sorted[1].c - sorted[0].c;
    let dr2 = sorted[2].r - sorted[1].r;
    let dc2 = sorted[2].c - sorted[1].c;

    if (Math.abs(dr1) === 1 && Math.abs(dc1) === 1 && dr1 === dr2 && dc1 === dc2) {
      return true;
    }

    return false;
  }

  // General function to check if 3 crosses exist in a line (horizontal, vertical, diagonal)
  checkThreeInALine(grid) {
    for (let r = 0; r < this.GRID_SIZE; r++) {
      for (let c = 0; c < this.GRID_SIZE; c++) {
        if (grid[r][c] === 1) {
          // Horizontal (Right)
          if (c + 2 < this.GRID_SIZE && grid[r][c+1] === 1 && grid[r][c+2] === 1) return true;
          // Vertical (Down)
          if (r + 2 < this.GRID_SIZE && grid[r+1][c] === 1 && grid[r+2][c] === 1) return true;
          // Diagonal (Down-Right)
          if (r + 2 < this.GRID_SIZE && c + 2 < this.GRID_SIZE && grid[r+1][c+1] === 1 && grid[r+2][c+2] === 1) return true;
          // Diagonal (Down-Left)
          if (r + 2 < this.GRID_SIZE && c - 2 >= 0 && grid[r+1][c-1] === 1 && grid[r+2][c-2] === 1) return true;
        }
      }
    }
    return false;
  }

  renderGrid() {
    if (!this.gridEl) return;
    this.gridEl.innerHTML = '';

    for (let r = 0; r < this.GRID_SIZE; r++) {
      for (let c = 0; c < this.GRID_SIZE; c++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');

        if (this.obstacles[r][c] === 1) {
          cell.classList.add('obstacle');
          cell.innerText = '✖';
        } else {
          // ensure cell text is empty for non-obstacle cells
          cell.innerText = '';
        }

        const ringIndex = this.rings.findIndex(ring => ring.r === r && ring.c === c);
        if (ringIndex !== -1) {
          const ringEl = document.createElement('div');
          ringEl.classList.add('ring');
          if (ringIndex === this.selectedRingIndex) {
            ringEl.classList.add('selected');
          }
          ringEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.isGameOver) this.selectRing(ringIndex);
          });
          cell.appendChild(ringEl);
        }

        this.gridEl.appendChild(cell);
      }
    }
  }

  selectRing(index) {
    this.selectedRingIndex = index;
    this.renderGrid();
  }

  saveStateToHistory() {
    this.moveHistory.push({
      obstacles: JSON.parse(JSON.stringify(this.obstacles)),
      rings: JSON.parse(JSON.stringify(this.rings)),
      selectedRingIndex: this.selectedRingIndex
    });
  }

  undoLastMove() {
    if (this.moveHistory.length === 0) return;
    const lastState = this.moveHistory.pop();
    this.obstacles = lastState.obstacles;
    this.rings = lastState.rings;
    this.selectedRingIndex = lastState.selectedRingIndex;
    this.isGameOver = false;
    if (this.messageEl) this.messageEl.innerText = '';
    this.renderGrid();
  }

  moveSelectedRing(dr, dc) {
    if (this.selectedRingIndex === null || this.isGameOver) return;

    let ring = this.rings[this.selectedRingIndex];
    let targetR = ring.r + dr;
    let targetC = ring.c + dc;

    if (targetR < 0 || targetR >= this.GRID_SIZE || targetC < 0 || targetC >= this.GRID_SIZE) return;
    if (this.rings.some(r => r.r === targetR && r.c === targetC)) return;

    if (this.obstacles[targetR][targetC] === 1) {
      let crossNextR = targetR + dr;
      let crossNextC = targetC + dc;

      let isCrossNextValid =
        crossNextR >= 0 && crossNextR < this.GRID_SIZE &&
        crossNextC >= 0 && crossNextC < this.GRID_SIZE &&
        this.obstacles[crossNextR][crossNextC] === 0 &&
        !this.rings.some(r => r.r === crossNextR && r.c === crossNextC);

      if (isCrossNextValid) {
        this.saveStateToHistory();
        this.obstacles[targetR][targetC] = 0;
        this.obstacles[crossNextR][crossNextC] = 1;
        ring.r = targetR;
        ring.c = targetC;
        this.renderGrid();
        this.evaluateGameState();
      }
    } else {
      this.saveStateToHistory();
      ring.r = targetR;
      ring.c = targetC;
      this.renderGrid();
      this.evaluateGameState();
    }
  }

  evaluateGameState() {
    // Check cross 3-in-a-line loss condition first
    if (this.checkThreeInALine(this.obstacles)) {
      this.isGameOver = true;
      if (this.messageEl) this.messageEl.innerText = '💥 3 Crosses in a line! You Lost!';
      return;
    }

    // Check ring 3-in-a-line win condition
    if (this.isRingLineAlignment(this.rings)) {
      this.isGameOver = true;
      if (this.messageEl) this.messageEl.innerText = '🎉 Puzzle Solved!';
    }
  }
}

// Auto-instantiate and attach to window for convenience
document.addEventListener('DOMContentLoaded', () => {
  // attach to window for debugging/legacy access if desired
  window.pushStepPuzzle = new PushStepPuzzle();
});
