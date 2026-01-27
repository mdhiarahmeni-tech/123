const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const gameOverDiv = document.getElementById('gameOver');
const startScreenDiv = document.getElementById('startScreen');
const finalScoreElement = document.getElementById('finalScore');
const finalLengthElement = document.getElementById('finalLength');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const boostBtn = document.getElementById('boostBtn');
const playerNameInput = document.getElementById('playerName');

canvas.width = 1000;
canvas.height = 600;

let gameRunning = false;
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
highScoreElement.textContent = highScore;

let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let isBoosting = false;

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 1500;
const MAX_SNAKE_LENGTH = 150;

class Snake {
    constructor(x, y, isPlayer = false, name = 'Bot') {
        this.segments = [];
        this.segmentSize = 8;
        this.length = 10;
        this.speed = isPlayer ? 3 : 2.5;
        this.maxSpeed = isPlayer ? 6 : 4;
        this.angle = Math.random() * Math.PI * 2;
        this.targetAngle = this.angle;
        this.turnSpeed = 0.08;
        this.isPlayer = isPlayer;
        this.name = name;
        this.alive = true;
        this.color = isPlayer ? '#00ff88' : this.randomColor();
        
        for (let i = 0; i < this.length; i++) {
            this.segments.push({
                x: x - i * this.segmentSize,
                y: y,
                size: this.segmentSize + (this.length - i) * 0.3
            });
        }
    }
    
    randomColor() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8', '#fdcb6e', '#e17055'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    update(targetX, targetY) {
        if (!this.alive) return;
        
        if (this.isPlayer) {
            const dx = targetX - this.segments[0].x;
            const dy = targetY - this.segments[0].y;
            this.targetAngle = Math.atan2(dy, dx);
            
            this.speed = isBoosting ? this.maxSpeed : 3;
            
            if (isBoosting && this.length > 10) {
                if (Math.random() < 0.1) {
                    this.length -= 0.5;
                    food.push(new Food(
                        this.segments[this.segments.length - 1].x,
                        this.segments[this.segments.length - 1].y,
                        3
                    ));
                }
            }
        } else {
            if (Math.random() < 0.02) {
                this.targetAngle += (Math.random() - 0.5) * 0.5;
            }
            
            const nearFood = food.find(f => {
                const dx = f.x - this.segments[0].x;
                const dy = f.y - this.segments[0].y;
                return Math.sqrt(dx * dx + dy * dy) < 150;
            });
            
            if (nearFood) {
                const dx = nearFood.x - this.segments[0].x;
                const dy = nearFood.y - this.segments[0].y;
                this.targetAngle = Math.atan2(dy, dx);
            }
            
            if (this.segments[0].x < 100) this.targetAngle = 0;
            if (this.segments[0].x > WORLD_WIDTH - 100) this.targetAngle = Math.PI;
            if (this.segments[0].y < 100) this.targetAngle = Math.PI / 2;
            if (this.segments[0].y > WORLD_HEIGHT - 100) this.targetAngle = -Math.PI / 2;
        }
        
        let angleDiff = this.targetAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.angle += angleDiff * this.turnSpeed;
        
        const head = this.segments[0];
        const newHead = {
            x: head.x + Math.cos(this.angle) * this.speed,
            y: head.y + Math.sin(this.angle) * this.speed,
            size: this.segmentSize + this.length * 0.3
        };
        
        this.segments.unshift(newHead);
        
        while (this.segments.length > this.length) {
            this.segments.pop();
        }
        
        for (let i = 1; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const prevSegment = this.segments[i - 1];
            segment.size = this.segmentSize + (this.length - i) * 0.2;
        }
    }
    
    draw(offsetX, offsetY) {
        if (!this.alive) return;
        
        for (let i = this.segments.length - 1; i >= 0; i--) {
            const segment = this.segments[i];
            const x = segment.x - offsetX;
            const y = segment.y - offsetY;
            
            if (x < -50 || x > canvas.width + 50 || y < -50 || y > canvas.height + 50) {
                continue;
            }
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, segment.size);
            
            if (i === 0) {
                gradient.addColorStop(0, this.color);
                gradient.addColorStop(1, this.darkenColor(this.color));
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, segment.size, 0, Math.PI * 2);
                ctx.fill();
                
                const eyeAngle1 = this.angle + Math.PI / 6;
                const eyeAngle2 = this.angle - Math.PI / 6;
                const eyeDist = segment.size * 0.5;
                
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(
                    x + Math.cos(eyeAngle1) * eyeDist,
                    y + Math.sin(eyeAngle1) * eyeDist,
                    segment.size * 0.25,
                    0, Math.PI * 2
                );
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(
                    x + Math.cos(eyeAngle2) * eyeDist,
                    y + Math.sin(eyeAngle2) * eyeDist,
                    segment.size * 0.25,
                    0, Math.PI * 2
                );
                ctx.fill();
                
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(
                    x + Math.cos(eyeAngle1) * eyeDist + Math.cos(this.angle) * 2,
                    y + Math.sin(eyeAngle1) * eyeDist + Math.sin(this.angle) * 2,
                    segment.size * 0.15,
                    0, Math.PI * 2
                );
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(
                    x + Math.cos(eyeAngle2) * eyeDist + Math.cos(this.angle) * 2,
                    y + Math.sin(eyeAngle2) * eyeDist + Math.sin(this.angle) * 2,
                    segment.size * 0.15,
                    0, Math.PI * 2
                );
                ctx.fill();
            } else {
                gradient.addColorStop(0, this.color);
                gradient.addColorStop(1, this.darkenColor(this.color));
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, segment.size, 0, Math.PI * 2);
                ctx.fill();
                
                if (i % 3 === 0) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.beginPath();
                    ctx.arc(x, y, segment.size * 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        if (!this.isPlayer && this.segments[0]) {
            const head = this.segments[0];
            const x = head.x - offsetX;
            const y = head.y - offsetY;
            
            if (x >= -50 && x <= canvas.width + 50 && y >= -50 && y <= canvas.height + 50) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.name, x, y - head.size - 10);
            }
        }
    }
    
    darkenColor(color) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgb(${r * 0.6}, ${g * 0.6}, ${b * 0.6})`;
    }
    
    grow() {
        if (this.length < MAX_SNAKE_LENGTH) {
            this.length += 3;
        }
    }
    
    checkCollision(otherSnake) {
        if (!this.alive || !otherSnake.alive || this === otherSnake) return false;
        
        const head = this.segments[0];
        const startIdx = this === otherSnake ? 10 : 0;
        
        for (let i = startIdx; i < otherSnake.segments.length; i++) {
            const segment = otherSnake.segments[i];
            const dx = head.x - segment.x;
            const dy = head.y - segment.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < head.size + segment.size - 5) {
                return true;
            }
        }
        
        return false;
    }
    
    die() {
        this.alive = false;
        for (let i = 0; i < this.segments.length; i += 2) {
            food.push(new Food(
                this.segments[i].x,
                this.segments[i].y,
                5
            ));
        }
    }
}

class Food {
    constructor(x = null, y = null, value = 1) {
        this.x = x !== null ? x : Math.random() * WORLD_WIDTH;
        this.y = y !== null ? y : Math.random() * WORLD_HEIGHT;
        this.size = 4 + value;
        this.value = value;
        this.color = this.randomColor();
        this.glowPhase = Math.random() * Math.PI * 2;
    }
    
    randomColor() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8', '#fdcb6e', '#e17055', '#74b9ff', '#a29bfe'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    draw(offsetX, offsetY) {
        const x = this.x - offsetX;
        const y = this.y - offsetY;
        
        if (x < -50 || x > canvas.width + 50 || y < -50 || y > canvas.height + 50) {
            return;
        }
        
        this.glowPhase += 0.05;
        const glow = Math.sin(this.glowPhase) * 0.3 + 0.7;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, this.size * glow);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, this.size * glow, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, this.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
}

let player;
let bots = [];
let food = [];
let camera = { x: 0, y: 0 };

function initGame() {
    const playerName = playerNameInput.value.trim() || 'Player';
    player = new Snake(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, true, playerName);
    bots = [];
    food = [];
    score = 0;
    
    const botNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Sigma', 'Zeta', 'Theta'];
    for (let i = 0; i < 8; i++) {
        bots.push(new Snake(
            Math.random() * WORLD_WIDTH,
            Math.random() * WORLD_HEIGHT,
            false,
            botNames[i]
        ));
    }
    
    for (let i = 0; i < 300; i++) {
        food.push(new Food());
    }
    
    gameRunning = true;
    startScreenDiv.classList.add('hidden');
    gameOverDiv.classList.add('hidden');
}

function updateCamera() {
    if (!player || !player.alive) return;
    
    const head = player.segments[0];
    camera.x = head.x - canvas.width / 2;
    camera.y = head.y - canvas.height / 2;
    
    camera.x = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, camera.y));
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;
    
    for (let x = startX; x < camera.x + canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - camera.x, 0);
        ctx.lineTo(x - camera.x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = startY; y < camera.y + canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y - camera.y);
        ctx.lineTo(canvas.width, y - camera.y);
        ctx.stroke();
    }
}

function gameLoop() {
    if (!gameRunning) return;
    
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawGrid();
    
    if (player && player.alive) {
        player.update(mouseX + camera.x, mouseY + camera.y);
        
        food.forEach((f, index) => {
            const head = player.segments[0];
            const dx = f.x - head.x;
            const dy = f.y - head.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < head.size + f.size) {
                food.splice(index, 1);
                player.grow();
                score += f.value;
                scoreElement.textContent = score;
                
                food.push(new Food());
            }
        });
        
        for (let bot of bots) {
            if (player.checkCollision(bot)) {
                player.die();
                endGame();
                break;
            }
        }
        
        if (player.checkCollision(player)) {
            player.die();
            endGame();
        }
    }
    
    bots.forEach(bot => {
        if (bot.alive) {
            bot.update(0, 0);
            
            food.forEach((f, index) => {
                const head = bot.segments[0];
                const dx = f.x - head.x;
                const dy = f.y - head.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < head.size + f.size) {
                    food.splice(index, 1);
                    bot.grow();
                    food.push(new Food());
                }
            });
            
            if (player && player.alive && bot.checkCollision(player)) {
                bot.die();
                return;
            }
            
            for (let otherBot of bots) {
                if (bot !== otherBot && bot.checkCollision(otherBot)) {
                    bot.die();
                    break;
                }
            }
            
            if (bot.checkCollision(bot)) {
                bot.die();
            }
        }
    });
    
    bots = bots.filter(bot => {
        if (!bot.alive) {
            const botNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Sigma', 'Zeta', 'Theta', 'Kappa', 'Lambda'];
            setTimeout(() => {
                if (gameRunning) {
                    bots.push(new Snake(
                        Math.random() * WORLD_WIDTH,
                        Math.random() * WORLD_HEIGHT,
                        false,
                        botNames[Math.floor(Math.random() * botNames.length)]
                    ));
                }
            }, 3000);
            return false;
        }
        return true;
    });
    
    updateCamera();
    
    food.forEach(f => f.draw(camera.x, camera.y));
    
    bots.forEach(bot => bot.draw(camera.x, camera.y));
    
    if (player) {
        player.draw(camera.x, camera.y);
        
        if (player.alive && player.segments[0]) {
            const head = player.segments[0];
            const x = head.x - camera.x;
            const y = head.y - camera.y;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(player.name, x, y - head.size - 15);
        }
    }
    
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-camera.x, -camera.y, WORLD_WIDTH, WORLD_HEIGHT);
    
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameRunning = false;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreElement.textContent = highScore;
    }
    
    finalScoreElement.textContent = score;
    finalLengthElement.textContent = player.length;
    gameOverDiv.classList.remove('hidden');
}

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
});

canvas.addEventListener('mousedown', () => {
    isBoosting = true;
});

canvas.addEventListener('mouseup', () => {
    isBoosting = false;
});

boostBtn.addEventListener('mousedown', () => {
    isBoosting = true;
});

boostBtn.addEventListener('mouseup', () => {
    isBoosting = false;
});

boostBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isBoosting = true;
});

boostBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    isBoosting = false;
});

startBtn.addEventListener('click', () => {
    initGame();
    gameLoop();
});

restartBtn.addEventListener('click', () => {
    initGame();
    gameLoop();
});

playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        initGame();
        gameLoop();
    }
});

window.addEventListener('resize', () => {
    const maxWidth = Math.min(window.innerWidth - 40, 1000);
    canvas.style.width = maxWidth + 'px';
});
