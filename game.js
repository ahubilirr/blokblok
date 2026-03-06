/**
 * BlokBlok - Game Logic
 * 12x12 Grid, Drag and Drop, Line Clearing
 */

class BlokBlok {
    constructor() {
        this.gridSize = 12;
        this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('blokblok-highscore')) || 0;
        
        this.currentBlocks = [];
        this.selectedBlock = null;
        this.isGameOver = false;

        this.initUI();
        this.generateNewBlocks();
        this.render();
    }

    initUI() {
        this.gridCanvas = document.getElementById('grid-canvas');
        this.currentScoreEl = document.getElementById('current-score');
        this.highScoreEl = document.getElementById('high-score');
        this.highScoreEl.textContent = this.highScore;
        
        this.slots = [
            document.getElementById('slot-0'),
            document.getElementById('slot-1'),
            document.getElementById('slot-2')
        ];

        // Create Grid Cells
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                this.gridCanvas.appendChild(cell);
            }
        }

        // Restart listener
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
    }

    // Predefined Shapes
    getSHAPES() {
        return [
            { shape: [[1]], color: 1 }, // 1x1
            { shape: [[1, 1]], color: 2 }, // 1x2
            { shape: [[1], [1]], color: 2 }, // 2x1
            { shape: [[1, 1, 1]], color: 3 }, // 1x3
            { shape: [[1], [1], [1]], color: 3 }, // 3x1
            { shape: [[1, 1], [1, 1]], color: 4 }, // 2x2
            { shape: [[1, 1, 1], [0, 1, 0]], color: 5 }, // T
            { shape: [[1, 0], [1, 1], [0, 1]], color: 6 }, // Z
            { shape: [[1, 1, 1], [1, 0, 0]], color: 1 }, // L
            { shape: [[1, 1, 1, 1]], color: 4 }, // 1x4
            { shape: [[1], [1], [1], [1]], color: 4 }, // 4x1
            { shape: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: 2 }, // 3x3 (Big Square)
        ];
    }

    generateNewBlocks() {
        this.currentBlocks = [];
        const shapes = this.getSHAPES();
        
        for (let i = 0; i < 3; i++) {
            const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
            this.currentBlocks.push(randomShape);
            this.renderBlock(i, randomShape);
        }
    }

    renderBlock(index, blockData) {
        const slot = this.slots[index];
        slot.innerHTML = '';
        if (!blockData) return;

        const blockContainer = document.createElement('div');
        blockContainer.className = 'block-shape';
        blockContainer.style.gridTemplateColumns = `repeat(${blockData.shape[0].length}, 1fr)`;
        
        blockData.shape.forEach(row => {
            row.forEach(cell => {
                const cube = document.createElement('div');
                cube.className = cell ? `block-cube color-${blockData.color}` : 'block-cube transparent';
                blockContainer.appendChild(cube);
            });
        });

        slot.appendChild(blockContainer);
        slot.draggable = true;
        
        slot.onmousedown = (e) => this.handleDragStart(e, index);
    }

    handleDragStart(e, index) {
        if (this.isGameOver) return;
        const blockData = this.currentBlocks[index];
        if (!blockData) return;

        this.selectedBlock = { index, data: blockData };
        const slot = this.slots[index];
        const blockEl = slot.querySelector('.block-shape');
        
        // Create Ghost Element
        const ghost = blockEl.cloneNode(true);
        ghost.style.position = 'fixed';
        ghost.style.zIndex = '1000';
        ghost.style.pointerEvents = 'none';
        ghost.style.transform = 'scale(1) translate(-50%, -50%)';
        ghost.style.opacity = '0.8';
        document.body.appendChild(ghost);

        slot.style.visibility = 'hidden';

        const moveAt = (clientX, clientY) => {
            ghost.style.left = clientX + 'px';
            ghost.style.top = clientY + 'px';

            // Preview logic
            const target = document.elementFromPoint(clientX, clientY);
            const cell = target?.closest('.cell');
            this.clearPreview();
            
            if (cell) {
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);
                if (this.canPlace(r, c, blockData.shape)) {
                    this.showPreview(r, c, blockData);
                }
            }
        };

        moveAt(e.clientX, e.clientY);

        const onMouseMove = (ev) => moveAt(ev.clientX, ev.clientY);
        
        const onMouseUp = (ev) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.removeChild(ghost);
            slot.style.visibility = 'visible';
            
            const target = document.elementFromPoint(ev.clientX, ev.clientY);
            const cell = target?.closest('.cell');
            
            if (cell) {
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);
                this.tryPlaceBlock(r, c);
            }
            this.clearPreview();
            this.selectedBlock = null;
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    showPreview(row, col, blockData) {
        blockData.shape.forEach((rArr, ri) => {
            rArr.forEach((val, ci) => {
                if (val) {
                    const targetR = row + ri;
                    const targetC = col + ci;
                    const cell = document.querySelector(`.cell[data-row="${targetR}"][data-col="${targetC}"]`);
                    if (cell) cell.style.backgroundColor = `rgba(255, 255, 255, 0.2)`;
                }
            });
        });
    }

    clearPreview() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            if (this.grid[r][c] === 0) {
                cell.style.backgroundColor = '';
            }
        });
    }

    tryPlaceBlock(row, col) {
        const block = this.selectedBlock.data;
        if (!this.canPlace(row, col, block.shape)) return;

        // Place
        block.shape.forEach((rArr, ri) => {
            rArr.forEach((val, ci) => {
                if (val) {
                    this.grid[row + ri][col + ci] = block.color;
                }
            });
        });

        // Hide used block
        this.currentBlocks[this.selectedBlock.index] = null;
        this.slots[this.selectedBlock.index].innerHTML = '';

        // Check for cleared lines
        this.checkLines();
        
        if (this.currentBlocks.every(b => b === null)) {
            this.generateNewBlocks();
        }

        this.render();
        this.checkGameOver();
    }

    canPlace(row, col, shape) {
        for (let ri = 0; ri < shape.length; ri++) {
            for (let ci = 0; ci < shape[ri].length; ci++) {
                if (shape[ri][ci]) {
                    const targetR = row + ri;
                    const targetC = col + ci;
                    
                    if (targetR >= this.gridSize || targetC >= this.gridSize || this.grid[targetR][targetC] !== 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    checkLines() {
        let rowsToClear = [];
        let colsToClear = [];

        // Rows
        for (let r = 0; r < this.gridSize; r++) {
            if (this.grid[r].every(cell => cell !== 0)) {
                rowsToClear.push(r);
            }
        }

        // Cols
        for (let c = 0; c < this.gridSize; c++) {
            let full = true;
            for (let r = 0; r < this.gridSize; r++) {
                if (this.grid[r][c] === 0) {
                    full = false;
                    break;
                }
            }
            if (full) colsToClear.push(c);
        }

        // Scoring: 10 points per cell cleared
        const totalCleared = (rowsToClear.length * this.gridSize) + (colsToClear.length * this.gridSize) - (rowsToClear.length * colsToClear.length);
        if (totalCleared > 0) {
            this.score += totalCleared * 10;
            this.currentScoreEl.textContent = this.score;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.highScoreEl.textContent = this.highScore;
                localStorage.setItem('blokblok-highscore', this.highScore);
            }

            // Visual effects (simplified)
            rowsToClear.forEach(r => {
                for(let c=0; c<this.gridSize; c++) this.grid[r][c] = 0;
            });
            colsToClear.forEach(c => {
                for(let r=0; r<this.gridSize; r++) this.grid[r][c] = 0;
            });
        }
    }

    render() {
        const cells = Array.from(this.gridCanvas.children);
        cells.forEach(cell => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            const val = this.grid[r][c];
            
            // Reset classes
            cell.className = 'cell';
            if (val !== 0) {
                cell.classList.add(`color-${val}`, 'active');
            }
        });
    }

    checkGameOver() {
        // Can any remaining block be placed?
        const canPlaceAny = this.currentBlocks.some((block, idx) => {
            if (!block) return false;
            for (let r = 0; r < this.gridSize; r++) {
                for (let c = 0; c < this.gridSize; c++) {
                    if (this.canPlace(r, c, block.shape)) return true;
                }
            }
            return false;
        });

        if (!canPlaceAny && this.currentBlocks.some(b => b !== null)) {
            this.endGame();
        }
    }

    endGame() {
        this.isGameOver = true;
        document.getElementById('final-score').textContent = this.score;
        
        const hsMsg = document.getElementById('high-score-msg');
        if (this.score >= this.highScore && this.score > 0) {
            hsMsg.classList.remove('hidden');
        } else {
            hsMsg.classList.add('hidden');
        }

        document.getElementById('game-over-overlay').classList.remove('hidden');
    }

    restart() {
        this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        this.score = 0;
        this.isGameOver = false;
        this.currentScoreEl.textContent = '0';
        document.getElementById('game-over-overlay').classList.add('hidden');
        this.generateNewBlocks();
        this.render();
    }
}

// Start Game
window.onload = () => {
    new BlokBlok();
};
