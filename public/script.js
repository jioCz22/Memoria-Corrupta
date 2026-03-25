const socket = io();

// ESTADO GLOBAL
let roomCode = "";
let myPlayerNum = 0;
let isMyTurn = false;
let currentPlayer = 1;
let scores = [0, 0];
let lockBoard = false;
let timers = [120, 120]; // 2 minutos por jugador
let countdownInterval = null;

/* --- SISTEMA DE SALAS --- */

// Crea código, rellena el input automáticamente y emite unión
function createRoom() {
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const input = document.getElementById('input-room');
    if (input) input.value = roomCode; 
    socket.emit('joinRoom', roomCode);
}

// Une al jugador usando el valor del input
function joinRoom() {
    const input = document.getElementById('input-room');
    if (input && input.value) {
        roomCode = input.value.toUpperCase();
        socket.emit('joinRoom', roomCode);
    } else {
        alert("Por favor, ingresa un código de sala.");
    }
}

// Asignación de número de jugador y muestra de código en UI
socket.on('playerAssigned', (num) => {
    myPlayerNum = num;
    const roomDisplay = document.getElementById('current-room-code');
    if (roomDisplay) roomDisplay.textContent = roomCode;
    console.log(`Conectado a la sala ${roomCode} como Jugador ${num}`);
});

// Inicio oficial de la partida (cuando hay 2 jugadores)
socket.on('initGame', () => {
    // Ocultar lobby, mostrar juego
    const lobby = document.getElementById('lobby-overlay');
    const gameUI = document.getElementById('game-ui');
    if (lobby) lobby.style.display = 'none';
    if (gameUI) gameUI.classList.remove('hidden');

    startGame();
    startCountdown();
});

/* --- LÓGICA DEL TIEMPO --- */

function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        // Solo descuenta tiempo al jugador que posee el turno
        timers[currentPlayer - 1]--;
        
        updateTimerDisplay();
        
        if (timers[currentPlayer - 1] <= 0) {
            clearInterval(countdownInterval);
            const msg = currentPlayer === 1 ? "GANA JUGADOR 2 (TIEMPO AGOTADO)" : "GANA JUGADOR 1 (TIEMPO AGOTADO)";
            endGame(msg);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const format = (s) => {
        const seg = s < 0 ? 0 : s;
        return `${Math.floor(seg / 60)}:${(seg % 60).toString().padStart(2, '0')}`;
    };
    
    const t1 = document.getElementById('timer1');
    const t2 = document.getElementById('timer2');
    
    if (t1) t1.textContent = format(timers[0]);
    if (t2) t2.textContent = format(timers[1]);
}

/* --- MECÁNICAS DEL JUEGO --- */

const rawData = [
    { id: 1, text: "Célula", img: "/img/celula.jpg" }, { id: 2, text: "ADN", img: "/img/adn.jpg" },
    { id: 3, text: "Gen", img: "/img/gen.jpg" }, { id: 4, text: "Cromosoma", img: "/img/cromosoma.jpg" },
    { id: 5, text: "Mendel", img: "/img/mendel.jpg" }, { id: 6, text: "Mutación", img: "/img/mutacion.jpg" },
    { id: 7, text: "Adenina", img: "/img/adenina.jpg" }, { id: 8, text: "Timina", img: "/img/timina.jpg" },
    { id: 9, text: "Guanina", img: "/img/guanina.jpg" }, { id: 10, text: "Citosina", img: "/img/citosina.jpg" },
    { id: 11, text: "Fenotipo", img: "/img/fenotipo.jpg" }, { id: 12, text: "Genotipo", img: "/img/genotipo.jpg" },
    { id: 13, text: "Alelo", img: "/img/alelo.jpg" }, { id: 14, text: "Homocigoto", img: "/img/homocigoto.jpg" },
    { id: 15, text: "Heterocigoto", img: "/img/heterocigoto.jpg" }, { id: 16, text: "Dominante", img: "/img/dominante.jpg" },
    { id: 17, text: "Recesiva", img: "/img/recesiva.jpg" }, { id: 18, text: "Codominante", img: "/img/codominante.jpg" },
    { id: 19, text: "Intermedia", img: "/img/intermedia.jpg" }, { id: 20, text: "1ra Ley", img: "/img/ley1.jpg" },
    { id: 21, text: "2da Ley", img: "/img/ley2.jpg" }, { id: 22, text: "3ra Ley", img: "/img/ley3.jpg" }
];

function startGame() {
    const board = document.getElementById('game-board');
    if (!board) return;
    board.innerHTML = "";
    
    let deck = [];
    rawData.forEach(i => {
        deck.push({ id: i.id, type: 'text', content: i.text });
        deck.push({ id: i.id, type: 'img', content: i.img });
    });

    // Mezcla determinista basada en el código de sala (igual para ambos)
    let seed = roomCode.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const seededRandom = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    deck.forEach((data, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = data.id;
        card.innerHTML = `
            <div class="card-face card-front"></div>
            <div class="card-face card-back">
                ${data.type === 'img' ? `<img src="${data.content}">` : `<span>${data.content}</span>`}
            </div>
        `;
        card.onclick = () => {
            if (!isMyTurn || lockBoard || card.classList.contains('flipped')) return;
            socket.emit('flipCard', { room: roomCode, cardIndex: index, cardId: data.id });
        };
        board.appendChild(card);
    });
}

/* --- EVENTOS DE RED --- */

socket.on('flipCardGlobal', (index) => {
    const cards = document.querySelectorAll('.card');
    if (cards[index]) cards[index].classList.add('flipped');
});

socket.on('matchResult', ({ indexes, match }) => {
    const cards = document.querySelectorAll('.card');
    const [c1, c2] = indexes.map(i => cards[i]);
    
    if (match) {
        c1.classList.add('correct'); 
        c2.classList.add('correct');
        scores[currentPlayer - 1]++;
        
        const scoreDisplay = document.getElementById(`score${currentPlayer}`);
        if (scoreDisplay) scoreDisplay.textContent = scores[currentPlayer - 1];
        
        // Victoria por completar parejas
        if (scores[0] + scores[1] === 22) {
            let winMsg = scores[0] === scores[1] ? "EMPATE TÉCNICO" : 
                         (scores[0] > scores[1] ? "GANA JUGADOR 1" : "GANA JUGADOR 2");
            endGame(winMsg);
        }
    } else {
        lockBoard = true;
        setTimeout(() => {
            c1.classList.remove('flipped');
            c2.classList.remove('flipped');
            lockBoard = false;
        }, 1000);
    }
});

socket.on('nextTurn', (turn) => {
    currentPlayer = turn;
    isMyTurn = (turn === myPlayerNum);
    
    // Feedback visual de turno activo
    document.querySelectorAll('.player-info').forEach(p => p.classList.remove('active'));
    const activeUI = document.getElementById(`p${turn}-ui`);
    if (activeUI) activeUI.classList.add('active');
});

function endGame(msg) {
    if (countdownInterval) clearInterval(countdownInterval);
    const modal = document.getElementById('win-modal');
    const winText = document.getElementById('grand-winner-name');
    if (modal) modal.classList.remove('hidden');
    if (winText) winText.textContent = msg;
}