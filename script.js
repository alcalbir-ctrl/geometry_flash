// ---------- Configuración general ----------
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Pantallas
const screens = {
    main: document.getElementById('main-menu'),
    levelSelect: document.getElementById('level-select'),
    shop: document.getElementById('shop-screen'),
    game: document.getElementById('game-screen')
};

// Overlays
const pauseOverlay = document.getElementById('pause-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const completeOverlay = document.getElementById('complete-overlay');

// Elementos de monedas
const menuCoinsSpan = document.getElementById('menu-coins');
const shopCoinsSpan = document.getElementById('shop-coins');
const gameCoinsSpan = document.getElementById('game-coins');
const completeCoinsSpan = document.getElementById('complete-coins');

// Variables del juego
let gameState = {
    currentScreen: 'main',
    currentLevel: 0,          // índice del nivel (0,1,2)
    coins: 100,                // monedas iniciales
    playerColor: '#ffd966',     // color por defecto (amarillo)
    purchasedColors: ['#ffd966'] // colores comprados (por defecto el amarillo)
};

// Niveles predefinidos
const levels = [
    {
        name: '🌾 Campo',
        speed: 5,
        obstacles: [
            { x: 400, width: 30, height: 40 },
            { x: 700, width: 40, height: 60 },
            { x: 1100, width: 30, height: 40 },
            { x: 1500, width: 50, height: 80 },
        ]
    },
    {
        name: '🏔️ Montaña',
        speed: 7,
        obstacles: [
            { x: 350, width: 40, height: 50 },
            { x: 650, width: 30, height: 70 },
            { x: 1000, width: 45, height: 40 },
            { x: 1300, width: 60, height: 90 },
            { x: 1700, width: 35, height: 55 },
        ]
    },
    {
        name: '🌌 Cielo',
        speed: 9,
        obstacles: [
            { x: 300, width: 35, height: 45 },
            { x: 600, width: 40, height: 80 },
            { x: 900, width: 30, height: 40 },
            { x: 1200, width: 55, height: 70 },
            { x: 1550, width: 40, height: 100 },
            { x: 1900, width: 30, height: 50 },
        ]
    }
];

// Tienda: colores disponibles
const shopColors = [
    { id: 'yellow', color: '#ffd966', name: 'Amarillo', price: 0, default: true },
    { id: 'red', color: '#ff6b6b', name: 'Rojo', price: 50 },
    { id: 'blue', color: '#6b9fff', name: 'Azul', price: 50 },
    { id: 'green', color: '#6bcf7f', name: 'Verde', price: 50 },
    { id: 'purple', color: '#c77dff', name: 'Morado', price: 70 },
    { id: 'orange', color: '#ffb347', name: 'Naranja', price: 70 },
];

// Variables dinámicas del juego
let gameRunning = false;
let gamePaused = false;
let animationId = null;
let player = { x: 150, y: 300, vy: 0, width: 30, height: 30, grounded: true };
let obstacles = [];
let levelSpeed = 5;
let levelObstacles = [];
let gameScore = 0; // metros / distancia (opcional)
let levelComplete = false;

// ---------- Inicialización y persistencia ----------
function loadGameState() {
    const saved = localStorage.getItem('gdClone');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            gameState.coins = parsed.coins || 100;
            gameState.purchasedColors = parsed.purchasedColors || ['#ffd966'];
            gameState.playerColor = parsed.playerColor || '#ffd966';
        } catch (e) {}
    }
    updateCoinDisplays();
}

function saveGameState() {
    localStorage.setItem('gdClone', JSON.stringify({
        coins: gameState.coins,
        purchasedColors: gameState.purchasedColors,
        playerColor: gameState.playerColor
    }));
}

function updateCoinDisplays() {
    menuCoinsSpan.textContent = gameState.coins;
    shopCoinsSpan.textContent = gameState.coins;
    gameCoinsSpan.textContent = gameState.coins;
}

// ---------- Cambio de pantallas ----------
function showScreen(screenId) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenId].classList.add('active');
    gameState.currentScreen = screenId;
    if (screenId === 'game') {
        startLevel(gameState.currentLevel);
    } else if (screenId === 'shop') {
        renderShop();
    } else if (screenId === 'levelSelect') {
        renderLevels();
    }
}

// ---------- Niveles ----------
function renderLevels() {
    const container = document.getElementById('levels-container');
    container.innerHTML = '';
    levels.forEach((lvl, index) => {
        const card = document.createElement('div');
        card.className = 'level-card';
        card.textContent = lvl.name;
        card.addEventListener('click', () => {
            gameState.currentLevel = index;
            showScreen('game');
        });
        container.appendChild(card);
    });
}

// ---------- Tienda ----------
function renderShop() {
    const container = document.getElementById('shop-container');
    container.innerHTML = '';
    shopColors.forEach(item => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div class="shop-color" style="background: ${item.color};"></div>
            <div>${item.name}</div>
            <div>💰 ${item.price}</div>
            <button data-id="${item.id}" data-color="${item.color}" data-price="${item.price}" ${item.default ? 'disabled' : ''}>
                ${gameState.purchasedColors.includes(item.color) ? 'Seleccionar' : 'Comprar'}
            </button>
        `;
        container.appendChild(div);
    });

    // Eventos de botones de la tienda
    document.querySelectorAll('.shop-item button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            const color = btn.dataset.color;
            const price = parseInt(btn.dataset.price);
            const alreadyOwned = gameState.purchasedColors.includes(color);

            if (alreadyOwned) {
                // Seleccionar color
                gameState.playerColor = color;
                saveGameState();
                renderShop(); // refresca botones (se marcará el seleccionado)
            } else {
                // Comprar
                if (gameState.coins >= price) {
                    gameState.coins -= price;
                    gameState.purchasedColors.push(color);
                    gameState.playerColor = color; // lo equipa automáticamente
                    saveGameState();
                    updateCoinDisplays();
                    renderShop();
                } else {
                    alert('¡No tienes suficientes monedas!');
                }
            }
        });
    });

    // Marcar el botón del color actualmente seleccionado
    document.querySelectorAll('.shop-item button').forEach(btn => {
        const color = btn.dataset.color;
        if (color === gameState.playerColor) {
            btn.textContent = '✔ Seleccionado';
            btn.style.background = '#28a745';
            btn.disabled = true;
        } else if (gameState.purchasedColors.includes(color)) {
            btn.textContent = 'Seleccionar';
            btn.style.background = '#4c9aff';
            btn.disabled = false;
        } else {
            btn.textContent = 'Comprar';
            btn.style.background = '#4c9aff';
            btn.disabled = false;
        }
    });
}

// ---------- Lógica del juego ----------
function startLevel(levelIndex) {
    const level = levels[levelIndex];
    levelSpeed = level.speed;
    // Clonar obstáculos para no modificar el original
    levelObstacles = level.obstacles.map(obs => ({ ...obs, x: obs.x }));
    obstacles = [...levelObstacles];
    player.y = 300;
    player.vy = 0;
    gameRunning = true;
    gamePaused = false;
    levelComplete = false;
    pauseOverlay.classList.remove('active');
    gameoverOverlay.classList.remove('active');
    completeOverlay.classList.remove('active');
    document.querySelector('.level-name').textContent = level.name;
    if (animationId) cancelAnimationFrame(animationId);
    gameLoop();
}

function resetLevel() {
    startLevel(gameState.currentLevel);
}

function gameLoop() {
    if (!gameRunning) return;
    if (!gamePaused && !levelComplete) {
        update();
    }
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

function update() {
    // Gravedad
    player.vy += 0.5;
    player.y += player.vy;

    // Suelo
    if (player.y + player.height > 370) { // suelo en y=370 (canvas 400, altura 30)
        player.y = 370 - player.height;
        player.vy = 0;
        player.grounded = true;
    } else {
        player.grounded = false;
    }

    // Mover obstáculos hacia la izquierda
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= levelSpeed;
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
        }
    }

    // Detectar colisiones
    for (let obs of obstacles) {
        if (rectCollide(
            player.x, player.y, player.width, player.height,
            obs.x, 370 - obs.height, obs.width, obs.height // los obstáculos están en el suelo
        )) {
            gameOver();
            return;
        }
    }

    // Si no quedan obstáculos, nivel completado
    if (obstacles.length === 0 && !levelComplete) {
        levelCompleted();
    }
}

function rectCollide(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function jump() {
    if (player.grounded && gameRunning && !gamePaused && !levelComplete) {
        player.vy = -10;
        player.grounded = false;
    }
}

function gameOver() {
    gameRunning = false;
    gameoverOverlay.classList.add('active');
}

function levelCompleted() {
    levelComplete = true;
    gameRunning = false;
    const reward = 20 + gameState.currentLevel * 10; // 20,30,40
    gameState.coins += reward;
    saveGameState();
    updateCoinDisplays();
    completeCoinsSpan.textContent = reward;
    completeOverlay.classList.add('active');
}

function draw() {
    ctx.clearRect(0, 0, 800, 400);

    // Suelo
    ctx.fillStyle = '#4a3f2b';
    ctx.fillRect(0, 370, 800, 30);
    ctx.fillStyle = '#6b5a3e';
    ctx.fillRect(0, 375, 800, 25);

    // Obstáculos
    ctx.fillStyle = '#aa4a4a';
    obstacles.forEach(obs => {
        ctx.fillRect(obs.x, 370 - obs.height, obs.width, obs.height);
        // Sombra
        ctx.fillStyle = '#733333';
        ctx.fillRect(obs.x + 5, 370 - obs.height + 5, obs.width, obs.height);
        ctx.fillStyle = '#aa4a4a';
    });

    // Jugador (cubo)
    ctx.fillStyle = gameState.playerColor;
    ctx.shadowColor = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 15;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    // Ojo
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(player.x + 20, player.y + 10, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(player.x + 22, player.y + 8, 2, 0, 2 * Math.PI);
    ctx.fill();
}

// ---------- Eventos de teclado y botones ----------
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        jump();
    }
});

// Botones de la interfaz
document.getElementById('btn-play').addEventListener('click', () => {
    gameState.currentLevel = 0;
    showScreen('game');
});
document.getElementById('btn-levels').addEventListener('click', () => showScreen('levelSelect'));
document.getElementById('btn-shop').addEventListener('click', () => showScreen('shop'));

document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => showScreen('main'));
});

document.getElementById('exit-game-btn').addEventListener('click', () => {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    showScreen('main');
});

document.getElementById('pause-btn').addEventListener('click', () => {
    gamePaused = true;
    pauseOverlay.classList.add('active');
});

document.getElementById('resume-btn').addEventListener('click', () => {
    gamePaused = false;
    pauseOverlay.classList.remove('active');
});

document.getElementById('restart-btn').addEventListener('click', () => {
    pauseOverlay.classList.remove('active');
    resetLevel();
});

document.getElementById('menu-btn').addEventListener('click', () => {
    gameRunning = false;
    pauseOverlay.classList.remove('active');
    showScreen('main');
});

// Game over
document.getElementById('restart-gameover-btn').addEventListener('click', () => {
    gameoverOverlay.classList.remove('active');
    resetLevel();
});
document.getElementById('menu-gameover-btn').addEventListener('click', () => {
    gameoverOverlay.classList.remove('active');
    showScreen('main');
});

// Nivel completado
document.getElementById('next-level-btn').addEventListener('click', () => {
    if (gameState.currentLevel + 1 < levels.length) {
        gameState.currentLevel++;
        completeOverlay.classList.remove('active');
        startLevel(gameState.currentLevel);
    } else {
        alert('¡Felicidades! Completaste todos los niveles.');
        completeOverlay.classList.remove('active');
        showScreen('main');
    }
});
document.getElementById('menu-complete-btn').addEventListener('click', () => {
    completeOverlay.classList.remove('active');
    showScreen('main');
});

// Inicializar
loadGameState();
showScreen('main');
