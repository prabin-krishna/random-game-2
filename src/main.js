let app = null;
(async () => {
    app = new PIXI.Application();
    await app.init({ background: '#1099bb', resizeTo: window });
    window.__PIXI_DEVTOOLS__ = {
        app: app,
    };
    document.body.appendChild(app.canvas);
    let machine = new SlotMachine(app);
})();
const NO_ROW = 3;
const NO_COLUMN = 3;
const SYMBOL_SIZE = 70;
const SYMBOLS = ['🍎', '💎', '🔔', '⭐', '🍋'];
const SYMBOL_PER_REEL = 8;
const REEL_POSITION = [-100, 0, 100];
const REVERSE_OFFSET = 100;
const SPIN_TIME = 2000;
const SPIN_SPEED = 35;
const DECELERATION_TIME = 800;
const MIN_SPEED = 2;
const POSITIONING_SPEED = 8;
const WIN_SYMBOL_ID = 1; const WIN_POSITION = 3;
class SlotMachine {
    constructor(app) {
        this.firstPosY = 0;
        this.lastPosY = 0;
        this.spinTimeout = null;
        this.reels = [];
        this.reeldata = [];
        let reel1 = [4, 2, 0, 1, 3, 2, WIN_SYMBOL_ID, 4];
        let reel2 = [3, 1, 4, 2, 0, 3, WIN_SYMBOL_ID, 4];
        let reel3 = [2, 0, 3, 1, 4, 2, WIN_SYMBOL_ID, 3];
        this.reeldata.push(reel1);
        this.reeldata.push(reel2);
        this.reeldata.push(reel3);
        this.reelContainer = new PIXI.Container();
        this.container = new PIXI.Container();
        this.spinning = false;
        this.container.addChild(this.reelContainer);
        this.container.x = (app.screen.width - this.container.width) / 2;
        this.container.y = (app.screen.height - this.container.height) / 4;
        app.stage.addChild(this.container);
        this.initializeReel();
        this.addSpinButton();
        this.addStopButton();
        this.addForceWinToggle();
        this.resultText = new PIXI.Text('', {
            fontSize: 32,
            fill: 0xffff00,
            align: 'center'
        });
        this.resultText.x = 200;
        this.resultText.y = 450;
        this.container.addChild(this.resultText);
        this.forceWin = false;
        this.debugText = new PIXI.Text('Force Win: OFF', {
            fontSize: 18,
            fill: 0xffffff,
            align: 'center'
        });
        this.debugText.x = 200;
        this.debugText.y = 600;
        this.container.addChild(this.debugText);
    }
    addForceWinToggle() {
        this.forceWinButton = new PIXI.Graphics()
            .rect(0, 0, 120, 50, 15)
            .fill(0x666666)
            .lineStyle(2, 0xffffff)
            .rect(0, 0, 120, 50, 15)
            .endFill();
        let buttonText = new PIXI.Text('FORCE WIN', {
            fontSize: 16,
            fill: 0xffffff,
            align: 'center'
        });
        buttonText.anchor.set(0.5);
        buttonText.x = this.forceWinButton.width / 2;
        buttonText.y = this.forceWinButton.height / 2;
        this.forceWinButton.addChild(buttonText);
        this.container.addChild(this.forceWinButton);
        this.forceWinButton.interactive = true;
        this.forceWinButton.buttonMode = true;
        this.forceWinButton.x = 130;
        this.forceWinButton.y = 550;
        this.forceWinButton.on('pointerdown', () => {
            this.toggleForceWin();
        });
    }
    toggleForceWin() {
        this.forceWin = !this.forceWin;
        this.forceWinButton.clear();
        const color = this.forceWin ? 0x00ff00 : 0x666666;
        this.forceWinButton.rect(0, 0, 120, 50, 15)
            .fill(color)
            .lineStyle(2, 0xffffff)
            .rect(0, 0, 120, 50, 15)
            .endFill();
        this.debugText.text = `Force Win: ${this.forceWin ? 'ON' : 'OFF'}`;
            }
    addSpinButton() {
        this.spinButton = new PIXI.Graphics()
            .rect(0, 0, 100, 50, 15)
            .fill(0x000000)
            .lineStyle(2, 0xffffff)
            .rect(0, 0, 100, 50, 15)
            .endFill();
        let buttonText = new PIXI.Text('SPIN', {
            fontSize: 24,
            fill: 0xffffff,
            align: 'center'
        });
        buttonText.anchor.set(0.5);
        buttonText.x = this.spinButton.width / 2;
        buttonText.y = this.spinButton.height / 2;
        this.spinButton.addChild(buttonText);
        this.container.addChild(this.spinButton);
        this.spinButton.interactive = true;
        this.spinButton.buttonMode = true;
        buttonText.interactive = true;
        buttonText.buttonMode = true;
        this.spinButton.x = 0;
        this.spinButton.y = 100;
        this.spinButton.on('pointerdown', () => {
            this.onSpinClick();
        });
    }
    addStopButton() {
        this.stopButton = new PIXI.Graphics()
            .rect(0, 0, 100, 50, 15)
            .fill(0x000000)
            .lineStyle(2, 0xffffff)
            .rect(0, 0, 100, 50, 15)
            .endFill();
        let buttonText = new PIXI.Text('STOP', {
            fontSize: 24,
            fill: 0xffffff,
            align: 'center'
        });
        buttonText.anchor.set(0.5);
        buttonText.x = this.stopButton.width / 2;
        buttonText.y = this.stopButton.height / 2;
        this.stopButton.addChild(buttonText);
        this.container.addChild(this.stopButton);
        this.stopButton.visible = false;
        this.stopButton.interactive = false;
        this.stopButton.buttonMode = false;
        buttonText.interactive = true;
        buttonText.buttonMode = true;
        this.stopButton.x = 0;
        this.stopButton.y = 550;
        this.stopButton.on('pointerdown', () => {
            this.onStopClick();
        });
    }
    onStopClick() {
                this.spinning = false;
        clearTimeout(this.spinTimeout);
        this.enableStopButton(false);
        this.enableSpinButton(true);
        for (let i = 0; i < NO_COLUMN; i++) {
            this.reels[i].setForceWin(this.forceWin, WIN_SYMBOL_ID, WIN_POSITION);
            setTimeout(() => {
                this.reels[i].startGradualStop();
                if (i === NO_COLUMN - 1) {
                    setTimeout(() => {
                        this.checkWinLoss();
                    }, DECELERATION_TIME + 500);
                }
            }, i * REVERSE_OFFSET);
        }
    }
    checkWinLoss() {
        const winPositionSymbols = this.reels.map(reel => {
            let symbolAtWinPosition = null;
            for (let symbol of reel.symbols) {
                const relativePosition = Math.round((symbol.container.y - reel.initPosy) / SYMBOL_SIZE);
                if (relativePosition === WIN_POSITION) {
                    symbolAtWinPosition = symbol;
                    break;
                }
            }
            return symbolAtWinPosition;
        });
                const ids = winPositionSymbols.map(symbol => symbol ? symbol.id : -1);
        const win = ids.length === NO_COLUMN && ids.every(id => id === ids[0] && id !== -1);
        if (this.forceWin) {
            this.resultText.text = `YOU WON`;
            this.resultText.style.fill = 0x00ff00;
                    } else {
            this.resultText.text = 'TRY AGAIN';
            this.resultText.style.fill = 0xff0000;
                    }
    }
    onSpinClick() {
                if (this.spinning) return;
        this.resultText.text = '';
        this.spinTimeout = setTimeout(() => {
            this.onStopClick();
        }, SPIN_TIME);
        this.spinning = true;
        this.enableSpinButton(false);
        this.enableStopButton(true);
        for (let i = 0; i < NO_COLUMN; i++) {
            setTimeout(() => {
                this.reels[i].spinstart();
            }, i * REVERSE_OFFSET);
        }
    }
    enableSpinButton(status) {
        if (status) {
            this.spinButton.interactive = true;
            this.spinButton.visible = true;
        }
        else {
            this.spinButton.interactive = false;
            this.spinButton.visible = false;
        }
    }
    enableStopButton(status) {
        if (status) {
            this.stopButton.interactive = true;
            this.stopButton.visible = true;
        }
        else {
            this.stopButton.interactive = false;
            this.stopButton.visible = false;
        }
    }
    initializeReel() {
        let mask = new PIXI.Graphics();
        mask.beginFill(0xffffff);
        mask.drawRect(-150, 100, SYMBOL_SIZE * NO_COLUMN + 100, SYMBOL_SIZE * NO_ROW);
        mask.endFill();
        this.reelContainer.addChild(mask);
        this.reelContainer.mask = mask;
        for (let i = 0; i < NO_COLUMN; i++) {
            let reel = new Reel(this.reeldata[i], app);
            reel.initPosy = reel.symbols[0].container.y;
            reel.lastPosy = reel.symbols[SYMBOL_PER_REEL - 1].container.y + SYMBOL_SIZE;
            reel.container.x = REEL_POSITION[i];
            this.reels.push(reel);
            this.reelContainer.addChild(reel.container);
        }
    }
}
class Reel {
    constructor(reelData, app) {
        this.app = app;
        this.container = new PIXI.Container();
        this.symbols = [];
        this.position = 0;
        this.previousPosition = 0;
        this.initPosy = 0;
        this.lastPosy = 0;
        this.reelData = reelData;
        this.spinning = false;
        this.stopping = false;
        this.positioning = false;
        this.currentSpeed = 0;
        this.targetSpeed = SPIN_SPEED;
        this.stopStartTime = 0;
        this.forceWin = false;
        this.targetWinSymbolId = null;
        this.targetWinPosition = null;
        this.forceWinPositioning = false;
        this.forceWinSpeed = 8;
        this.createReel();
        this.app.ticker.add((time) => {
            this.update(time);
        });
    }
    setForceWin(forceWin, symbolId, position) {
        this.forceWin = forceWin;
        this.targetWinSymbolId = symbolId;
        this.targetWinPosition = position;
            }
    createReel() {
        for (let i = 0; i < SYMBOL_PER_REEL; i++) {
            let symbol = new Symbol(0, i * SYMBOL_SIZE, this.reelData[i]);
            this.symbols.push(symbol);
            this.container.addChild(symbol.container);
        }
    }
    spinstart() {
        this.spinning = true;
        this.stopping = false;
        this.positioning = false;
        this.currentSpeed = 0;
        this.targetSpeed = SPIN_SPEED;
        for (let i = 0; i < SYMBOL_PER_REEL; i++) {
            this.symbols[i].onSpin();
        }
    }
    startGradualStop() {
        if (!this.spinning) return;
        this.stopping = true;
        this.stoppingReel();
        this.stopStartTime = Date.now();
        this.targetSpeed = 0;
    }
    update(time) {
        if (this.forceWinPositioning) {
            this.updateForceWinPositioning(time);
            return;
        }
        if (this.positioning) {
            this.updatePositioning(time);
            return;
        }
        if (!this.spinning) return;
        if (this.stopping) {
            const elapsed = Date.now() - this.stopStartTime;
            const progress = Math.min(elapsed / DECELERATION_TIME, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            this.currentSpeed = SPIN_SPEED * (1 - easedProgress);
            if (this.currentSpeed < MIN_SPEED || progress >= 1) {
                this.spinStop();
                return;
            }
        } else {
            this.currentSpeed = Math.min(this.currentSpeed + (SPIN_SPEED * 0.1), this.targetSpeed);
        }
        for (let i = this.symbols.length - 1; i >= 0; i--) {
            let symbol = this.symbols[i];
            symbol.container.y += this.currentSpeed * time.deltaTime;
            if (symbol.container.y > this.lastPosy) {
                symbol.container.y = this.initPosy;
            }
        }
    }
    updatePositioning(time) {
        let allInPosition = true;
        for (let i = 0; i < this.symbols.length; i++) {
            const symbol = this.symbols[i];
            const targetY = symbol.targetY;
            const currentY = symbol.container.y;
            const distance = targetY - currentY;
            if (Math.abs(distance) > 2) {
                allInPosition = false;
                const moveDistance = Math.abs(distance) * 0.15 * time.deltaTime;
                const minMoveDistance = 1 * time.deltaTime;
                const actualMoveDistance = Math.max(moveDistance, minMoveDistance);
                if (distance > 0) {
                    symbol.container.y = Math.min(currentY + actualMoveDistance, targetY);
                } else {
                    symbol.container.y = Math.max(currentY - actualMoveDistance, targetY);
                }
            } else {
                symbol.container.y = targetY;
            }
        }
        if (allInPosition) {
            this.positioning = false;
                    }
    }
    stoppingReel() {
        for (let i = 0; i < SYMBOL_PER_REEL; i++) {
            this.symbols[i].onStop();
        }
    }
    spinStop() {
        this.spinning = false;
        this.stopping = false;
        this.currentSpeed = 0;
        if (this.forceWin && this.targetWinSymbolId !== null) {
                        this.startForceWinPositioning();
        } else {
                        this.positioning = true;
            this.applyNormalPositioning();
        }
    }
    startForceWinPositioning() {
        let targetSymbol = null;
        let targetSymbolIndex = -1;
        for (let i = 0; i < this.symbols.length; i++) {
            if (this.symbols[i].id === this.targetWinSymbolId) {
                targetSymbol = this.symbols[i];
                targetSymbolIndex = i;
                break;
            }
        }
        if (targetSymbol) {
                        this.targetWinY = this.initPosy + (this.targetWinPosition * SYMBOL_SIZE);
            this.winSymbolIndex = targetSymbolIndex;
            this.forceWinPositioning = true;
                    } else {
                        this.positioning = true;
            this.applyNormalPositioning();
        }
    }
    updateForceWinPositioning(time) {
        if (!this.forceWinPositioning) return;
        const targetSymbol = this.symbols[this.winSymbolIndex];
        const currentY = targetSymbol.container.y;
        const targetY = this.targetWinY;
        let distance = targetY - currentY;
        const totalHeight = this.symbols.length * SYMBOL_SIZE;
        if (distance <= 0) {
            distance += totalHeight;
        }
        if (distance <= 3) {
            this.snapToFinalForceWinPosition();
            return;
        }
        const moveSpeed = this.forceWinSpeed * time.deltaTime;
        const actualMove = Math.min(distance, moveSpeed);
        for (let i = 0; i < this.symbols.length; i++) {
            this.symbols[i].container.y += actualMove;
            if (this.symbols[i].container.y > this.lastPosy) {
                this.symbols[i].container.y -= totalHeight;
            }
        }
    }
    snapToFinalForceWinPosition() {
                const targetSymbol = this.symbols[this.winSymbolIndex];
        targetSymbol.container.y = this.targetWinY;
        for (let i = 0; i < this.symbols.length; i++) {
            if (i !== this.winSymbolIndex) {
                const relativeIndex = i - this.winSymbolIndex;
                let symbolY = this.targetWinY + (relativeIndex * SYMBOL_SIZE);
                const totalHeight = this.symbols.length * SYMBOL_SIZE;
                while (symbolY >= this.lastPosy) {
                    symbolY -= totalHeight;
                }
                while (symbolY < this.initPosy - SYMBOL_SIZE) {
                    symbolY += totalHeight;
                }
                this.symbols[i].container.y = symbolY;
            }
        }
        this.forceWinPositioning = false;
            }
    applyNormalPositioning() {
        let closestSymbolIndex = 0;
        let minDistance = Infinity;
        for (let i = 0; i < this.symbols.length; i++) {
            const distance = Math.abs(this.symbols[i].container.y - this.initPosy);
            if (distance < minDistance) {
                minDistance = distance;
                closestSymbolIndex = i;
            }
        }
        for (let i = 0; i < this.symbols.length; i++) {
            const symbol = this.symbols[i];
            const relativeIndex = (i - closestSymbolIndex + this.symbols.length) % this.symbols.length;
            let targetY = this.initPosy + (relativeIndex * SYMBOL_SIZE);
            if (targetY >= this.lastPosy) {
                targetY = this.initPosy + (targetY - this.lastPosy);
            } else if (targetY < this.initPosy - SYMBOL_SIZE) {
                targetY = this.lastPosy + (targetY - this.initPosy + SYMBOL_SIZE);
            }
            symbol.targetY = targetY;
        }
    }
}
class Symbol {
    constructor(x, y, id) {
        this.id = id;
        this.container = new PIXI.Container();
        this.container.x = x;
        this.container.y = y;
        this.targetY = y;
        let symbolText = new PIXI.Text(
            SYMBOLS[id],
            {
                fontSize: 60,
                align: 'center'
            }
        );
        symbolText.anchor.set(0.5);
        this.blur = new PIXI.BlurFilter();
        this.blur.blurX = 0;
        this.blur.blurY = 0;
        this.container.filters = [this.blur];
        this.container.addChild(symbolText);
    }
    onSpin() {
        this.blur.blurY = 10;
    }
    onStop() {
        this.blur.blurY = 0;
    }
}