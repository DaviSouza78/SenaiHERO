const lanes = document.querySelectorAll('.lane');
const fretboard = document.querySelector('.fretboard');
const scoreElement = document.getElementById('score');
const comboElement = document.getElementById('combo');
const speedDisplay = document.getElementById('speed-display');
const feedbackText = document.getElementById('feedback-text');
const healthBar = document.getElementById('health-bar');
const gameOverScreen = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const victoryScreen = document.getElementById('victory-screen');
const victoryScoreDisplay = document.getElementById('victory-score');
const statPerfectDisplay = document.getElementById('stat-perfect');
const statGoodDisplay = document.getElementById('stat-good');
const statBadDisplay = document.getElementById('stat-bad');
const statMissDisplay = document.getElementById('stat-miss');
const statMaxComboDisplay = document.getElementById('stat-max-combo');
const victoryMenuBtn = document.getElementById('victory-menu-btn');
const victoryRestartBtn = document.getElementById('victory-restart-btn');
const startMenu = document.getElementById('start-menu');
const gameUI = document.getElementById('game-ui');
const diffButtons = document.querySelectorAll('.diff-btn');
const controlsInstruction = document.getElementById('controls-instruction');
const songProgressBar = document.getElementById('song-progress-bar');

// Song Selection Elements
const songSelectionMenu = document.getElementById('song-selection-menu');
const songButtons = document.querySelectorAll('.song-btn');
const selectedSongNameDisplay = document.getElementById('selected-song-name');
const backToSongsBtn = document.getElementById('back-to-songs-btn');

// Pause Elements
const pauseModal = document.getElementById('pause-modal');
const resumeBtn = document.getElementById('resume-btn');
const restartPauseBtn = document.getElementById('restart-pause-btn');
const menuPauseBtn = document.getElementById('menu-pause-btn');

// Settings Elements
const openSettingsBtnMain = document.getElementById('open-settings-btn-main');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingsModal = document.getElementById('settings-modal');
const keyConfigBtns = document.querySelectorAll('.key-config-btn');
const upscrollToggle = document.getElementById('upscroll-toggle');

let score = 0;
let combo = 0;
let maxCombo = 0;
let health = 100;
let gameActive = false;
let isPaused = false;
let notes = [];
let selectedDifficulty = 'hard';
let selectedSong = null;
let audio = new Audio();

// Statistics
let stats = {
    perfect: 0,
    good: 0,
    bad: 0,
    miss: 0
};

// Key Mapping Settings
let keyMap = {
    'd': 0, 'f': 1, 'j': 2, 'k': 3,
    'D': 0, 'F': 1, 'J': 2, 'K': 3
};
let laneKeys = ['D', 'F', 'J', 'K'];
let waitingForKey = null;
let isUpscroll = false;

// Difficulty parameters
const difficultySettings = {
    easy: { noteSpeed: 3.5, spawnInterval: 1000, doubleNoteChance: 0.1, speedScale: 10000, spawnScale: 400, minSpawnInterval: 600 },
    medium: { noteSpeed: 4, spawnInterval: 800, doubleNoteChance: 0.2, speedScale: 8000, spawnScale: 300, minSpawnInterval: 450 },
    hard: { noteSpeed: 5, spawnInterval: 600, doubleNoteChance: 0.3, speedScale: 6000, spawnScale: 200, minSpawnInterval: 300 },
    extreme: { noteSpeed: 6.5, spawnInterval: 400, doubleNoteChance: 0.5, speedScale: 4000, spawnScale: 100, minSpawnInterval: 200 }
};

let currentNoteSpeed = 4;
let currentSpawnInterval = 400;
let lastSpawnTime = 0;
let lastTimestamp = 0;

const strikeLinePosDown = 550;
const strikeLinePosUp = 50;
const noteHeight = 50;

// Hitboxes super expandidas (Distância do centro)
const PERFECT_WINDOW = 40; // Aumentado de 25
const GOOD_WINDOW = 90;    // Aumentado de 60
const BAD_WINDOW = 100;    // Aumentado de 100

const HEALTH_GAIN_PERFECT = 8;
const HEALTH_GAIN_GOOD = 4;
const HEALTH_GAIN_BAD = 1; // Agora ganha um pouco de vida em vez de perder
const HEALTH_LOSS_MISS = 15; // Perda de vida apenas se errar completamente
const HEALTH_LOSS_WRONG_KEY = 5; // Penalidade por apertar tecla errada

function loadSettings() {
    const savedKeys = localStorage.getItem('guitarHeroKeys');
    if (savedKeys) {
        laneKeys = JSON.parse(savedKeys);
        updateKeyMap();
        updateKeyUI();
    }
    const savedUpscroll = localStorage.getItem('guitarHeroUpscroll');
    if (savedUpscroll !== null) {
        isUpscroll = savedUpscroll === 'true';
        upscrollToggle.checked = isUpscroll;
        updateDirectionUI();
    }
}

function updateKeyMap() {
    keyMap = {};
    laneKeys.forEach((key, index) => {
        keyMap[key.toLowerCase()] = index;
        keyMap[key.toUpperCase()] = index;
    });
    lanes.forEach((lane, index) => {
        const indicator = lane.querySelector('.key-indicator');
        if (indicator) indicator.textContent = laneKeys[index];
    });
    if (controlsInstruction) {
        controlsInstruction.innerHTML = `Use as teclas <strong>${laneKeys.join(', ')}</strong> para tocar!`;
    }
}

function updateKeyUI() {
    keyConfigBtns.forEach((btn, index) => {
        btn.textContent = laneKeys[index];
    });
}

function updateDirectionUI() {
    if (isUpscroll) fretboard.classList.add('upscroll');
    else fretboard.classList.remove('upscroll');
}

function spawnNoteInLane(laneIndex) {
    const lane = lanes[laneIndex];
    const note = document.createElement('div');
    note.classList.add('note');
    note.classList.add(`lane-${laneIndex}-note`);
    const initialTop = isUpscroll ? 600 : -50;
    note.style.top = `${initialTop}px`;
    lane.appendChild(note);
    return { element: note, lane: laneIndex, top: initialTop, hit: false };
}

function updateDifficulty() {
    const settings = difficultySettings[selectedDifficulty];
    
    // Escala de velocidade baseada na pontuação (Limitada a 4x)
    let speedMultiplier = 1 + (score / settings.speedScale); 
    if (speedMultiplier > 4) speedMultiplier = 4;
    
    currentNoteSpeed = settings.noteSpeed * speedMultiplier;
    
    // Escala de spawn baseada na pontuação
    const intervalReduction = (score / settings.spawnScale); 
    currentSpawnInterval = Math.max(settings.minSpawnInterval, settings.spawnInterval - intervalReduction);

    if (speedDisplay) {
        speedDisplay.textContent = speedMultiplier.toFixed(1);
    }
}

function showFeedback(type) {
    feedbackText.textContent = type;
    feedbackText.className = 'feedback-text'; 
    void feedbackText.offsetWidth;
    feedbackText.classList.add(`feedback-${type.toLowerCase()}`);
}

function updateHealth(amount) {
    health = Math.min(100, Math.max(0, health + amount));
    healthBar.style.height = `${health}%`;
    if (health <= 0) endGame();
}

function updateGame(timestamp) {
    if (!gameActive || isPaused) return;

    updateSongProgress();

    if (lastTimestamp === 0) lastTimestamp = timestamp;
    const deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    if (timestamp - lastSpawnTime > currentSpawnInterval) {
        const settings = difficultySettings[selectedDifficulty];
        const firstLane = Math.floor(Math.random() * 4);
        notes.push(spawnNoteInLane(firstLane));
        if (Math.random() < settings.doubleNoteChance) {
            let secondLane;
            do { secondLane = Math.floor(Math.random() * 4); } while (secondLane === firstLane);
            notes.push(spawnNoteInLane(secondLane));
        }
        lastSpawnTime = timestamp;
    }

    for (let i = notes.length - 1; i >= 0; i--) {
        const note = notes[i];
        if (isUpscroll) note.top -= currentNoteSpeed;
        else note.top += currentNoteSpeed;
        note.element.style.top = `${note.top}px`;

        let isMissed = isUpscroll ? note.top < -50 : note.top > 600;
        if (isMissed) {
            if (!note.hit) {
                resetCombo();
                updateHealth(-HEALTH_LOSS_MISS);
                stats.miss++;
            }
            note.element.remove();
            notes.splice(i, 1);
        }
    }

    requestAnimationFrame(updateGame);
}

function handleHit(laneIndex) {
    if (!gameActive || isPaused) return;
    triggerHitFlash(laneIndex);
    let hitFound = false;
    for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        if (note.lane === laneIndex && !note.hit) {
            const noteCenter = note.top + (noteHeight / 2);
            const strikeCenter = isUpscroll ? strikeLinePosUp : strikeLinePosDown;
            const distance = Math.abs(noteCenter - strikeCenter); 
            if (distance < BAD_WINDOW) {
                note.hit = true;
                note.element.style.display = 'none';
                let points = 0, type = "", healthChange = 0;
                if (distance < PERFECT_WINDOW) {
                    points = 100; // Pontuação cheia
                    type = "PERFECT";
                    healthChange = HEALTH_GAIN_PERFECT;
                    stats.perfect++;
                } else if (distance < GOOD_WINDOW) {
                    points = 50; // Metade da pontuação
                    type = "GOOD";
                    healthChange = HEALTH_GAIN_GOOD;
                    stats.good++;
                } else {
                    points = 10; // Pontuação mínima
                    type = "BAD";
                    healthChange = HEALTH_GAIN_BAD; // Agora ganha um pouquinho de vida
                    stats.bad++;
                }

                showFeedback(type);
                increaseScore(points);
                updateHealth(healthChange);
                hitFound = true;
                break;
            }
        }
    }

    if (!hitFound) {
        resetCombo();
        updateHealth(-HEALTH_LOSS_WRONG_KEY); // Penalidade menor por apertar sem nota
    }
}

function triggerHitFlash(laneIndex) {
    const indicator = lanes[laneIndex].querySelector('.key-indicator');
    if (!indicator) return;
    indicator.classList.remove('hit-flash');
    void indicator.offsetWidth;
    indicator.classList.add('hit-flash');
    setTimeout(() => { indicator.classList.remove('hit-flash'); }, 100);
}

function increaseScore(points) {
    score += points + (combo * 2);
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    updateDifficulty();
    updateDisplay();
}

function resetCombo() { combo = 0; updateDisplay(); }
function updateDisplay() {
    scoreElement.textContent = score;
    comboElement.textContent = combo;
}

function updateSongProgress() {
    if (audio && audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        if (songProgressBar) {
            songProgressBar.style.width = `${progress}%`;
        }
    }
}

function selectSong(songPath, songName) {
    selectedSong = songPath;
    selectedSongNameDisplay.textContent = songName;
    songSelectionMenu.classList.add('hidden');
    startMenu.classList.remove('hidden');
}

function startGame(diff) {
    selectedDifficulty = diff || selectedDifficulty;
    const settings = difficultySettings[selectedDifficulty];
    score = 0;
    combo = 0;
    maxCombo = 0;
    health = 100;
    stats = { perfect: 0, good: 0, bad: 0, miss: 0 };
    notes.forEach(note => note.element.remove());
    notes = [];
    currentNoteSpeed = settings.noteSpeed;
    currentSpawnInterval = settings.spawnInterval;
    lastSpawnTime = performance.now();
    lastTimestamp = 0;
    gameActive = true;
    isPaused = false;
    
    audio.src = selectedSong;
    audio.currentTime = 0;
    audio.play();

    startMenu.classList.add('hidden');
    gameUI.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    pauseModal.classList.add('hidden');
    
    updateDirectionUI();
    updateKeyMap(); 
    updateDifficulty();
    updateDisplay();
    updateHealth(0);
    requestAnimationFrame(updateGame);
}

function togglePause() {
    if (!gameActive) return;
    isPaused = !isPaused;
    if (isPaused) {
        audio.pause();
        pauseModal.classList.remove('hidden');
    } else {
        audio.play();
        pauseModal.classList.add('hidden');
        lastTimestamp = 0;
        requestAnimationFrame(updateGame);
    }
}

function endGame() {
    gameActive = false;
    audio.pause();
    
    // Se a vida for > 0, significa que terminou a música (Vitória)
    if (health > 0) {
        showVictoryScreen();
    } else {
        gameOverScreen.classList.remove('hidden');
        finalScoreElement.textContent = score;
    }
}

function showVictoryScreen() {
    victoryScreen.classList.remove('hidden');
    victoryScoreDisplay.textContent = score;
    statPerfectDisplay.textContent = stats.perfect;
    statGoodDisplay.textContent = stats.good;
    statBadDisplay.textContent = stats.bad;
    statMissDisplay.textContent = stats.miss;
    statMaxComboDisplay.textContent = maxCombo;
}

function showMenu() {
    gameActive = false;
    isPaused = false;
    audio.pause();
    songSelectionMenu.classList.remove('hidden');
    startMenu.classList.add('hidden');
    gameUI.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    pauseModal.classList.add('hidden');
    notes.forEach(note => note.element.remove());
    notes = [];
}

// Listeners
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        togglePause();
        return;
    }
    if (waitingForKey !== null) {
        laneKeys[waitingForKey] = e.key.toUpperCase();
        waitingForKey = null;
        keyConfigBtns.forEach(b => b.classList.remove('waiting'));
        updateKeyUI(); updateKeyMap();
        localStorage.setItem('guitarHeroKeys', JSON.stringify(laneKeys));
        return;
    }
    if (keyMap.hasOwnProperty(e.key)) {
        const laneIndex = keyMap[e.key];
        lanes[laneIndex].classList.add('active');
        handleHit(laneIndex);
    }
});

window.addEventListener('keyup', (e) => {
    if (keyMap.hasOwnProperty(e.key)) {
        lanes[keyMap[e.key]].classList.remove('active');
    }
});

songButtons.forEach(btn => {
    btn.addEventListener('click', () => selectSong(btn.getAttribute('data-song'), btn.textContent));
});

diffButtons.forEach(btn => {
    btn.addEventListener('click', () => startGame(btn.getAttribute('data-difficulty')));
});

backToSongsBtn.addEventListener('click', () => {
    startMenu.classList.add('hidden');
    songSelectionMenu.classList.remove('hidden');
});

restartBtn.addEventListener('click', () => startGame());
backToMenuBtn.addEventListener('click', showMenu);
victoryRestartBtn.addEventListener('click', () => startGame());
victoryMenuBtn.addEventListener('click', showMenu);
resumeBtn.addEventListener('click', togglePause);
restartPauseBtn.addEventListener('click', () => startGame());
menuPauseBtn.addEventListener('click', showMenu);

openSettingsBtnMain.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
    waitingForKey = null;
    keyConfigBtns.forEach(btn => btn.classList.remove('waiting'));
});

keyConfigBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        waitingForKey = parseInt(btn.getAttribute('data-lane'));
        keyConfigBtns.forEach(b => b.classList.remove('waiting'));
        btn.classList.add('waiting');
        btn.textContent = "...";
    });
});

upscrollToggle.addEventListener('change', (e) => {
    isUpscroll = e.target.checked;
    localStorage.setItem('guitarHeroUpscroll', isUpscroll);
    updateDirectionUI();
});

loadSettings();
updateKeyMap();
updateKeyUI();
audio.addEventListener('ended', endGame);
