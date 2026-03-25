const socket = io();

// ESTADOS DEL JUEGO
let roomCode = "";
let myPlayerNum = 0;
let isMyTurn = false;
let currentPlayer = 1;
let scores = [0, 0];
let lockBoard = false;

// TIEMPOS INDIVIDUALES (2 MINUTOS CADA UNO)
let timers = [120, 120]; 
let countdownInterval = null;

/* ========================= */
/* 🔗 GESTIÓN DE SALAS (LOBBY) */
/* ========================= */

function createRoom() {
    roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    alert("CÓDIGO DE SALA: " + roomCode);
    socket.emit('joinRoom', roomCode);
}

function joinRoom() {
    const input = document.getElementById('input-room');
    const code = input.value.toUpperCase();
    if (code) {
        roomCode = code;
        socket.emit('joinRoom', roomCode);
    }
}

// Se ejecuta cuando entras a la sala (pero falta el rival)
socket.on('playerAssigned', (num) => {
    myPlayerNum = num;
    // Ocultar elementos de interacción del lobby mientras espera
    document.getElementById('room-info').textContent = "CONECTADO | ESPERANDO RIVAL...";
    console.log("Asignado como Jugador " + num);
});

// SE EJECUTA CUANDO AMBOS ESTÁN CONECTADOS
socket.on('initGame', () => {
    console.log("¡Partida Iniciada!");
    
    // 1. Limpieza visual: Activar clase para que el CSS oculte el lobby
    document.body.classList.add('game-active');
    
    // 2. Asegurar que el contenedor del lobby desaparezca
    const lobby = document.getElementById('lobby-overlay');
    if (lobby) lobby.style.display = 'none';

    // 3. Mostrar el tablero y la info de sala
    document.getElementById('game-board').classList.remove('hidden');
    document.getElementById('room-info').textContent = "SALA: " + roomCode;
    
    // 4. Arrancar mecánica
    startGame();
    startGlobalTimer();
});

/* ========================= */
/* ⏳ SISTEMA DE TIEMPO (2 MIN) */
/* ========================= */

function startGlobalTimer() {
    // Si ya había un reloj corriendo, lo limpiamos
    if(countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        // Solo resta tiempo al jugador que tiene el turno actual
        timers[currentPlayer - 1]--;
        
        updateTimerUI();
        
        // Verificación de derrota por tiempo
        if(timers[currentPlayer - 1] <= 0) {
            clearInterval(countdownInterval);
            const winnerText = currentPlayer === 1 ? "GANADOR: J2 (POR TIEMPO)" : "GANADOR: J1 (POR TIEMPO)";
            endGame(winnerText);
        }
    }, 1000);
}

function updateTimerUI() {
    const formatTime = (s) => {
        if (s < 0) s = 0;
        const min = Math.floor(s / 60);
        const seg = s % 60;
        return `${min}:${seg.toString().padStart(2, '0')}`;
    };

    const t1 = document.getElementById('timer1');
    const t2 = document.getElementById('timer2');
    
    if(t1) t1.textContent = formatTime(timers[0]);
    if(t2) t2.textContent = formatTime(timers[1]);

    // Feedback visual de "Poco tiempo" (rojo)
    if(t1) t1.style.color = timers[0] < 15 ? "var(--error)" : "white";
    if(t2) t2.style.color = timers[1] < 15 ? "var(--error)" : "white";
}

/* ========================= */
/* 🎮 LÓGICA DE CARTAS */
/* ========================= */

const rawData = [
    { id: 1, text: "Célula", img: "/img/celula.jpg" },
    { id: 2, text: "ADN", img: "/img/adn.jpg" },
    { id: 3, text: "Gen", img: "/img/gen.jpg" },
    { id: 4, text: "Cromosoma", img: "/img/cromosoma.jpg" },
    { id: 5, text: "Mendel", img: "/img/mendel.jpg" },
    { id: 6, text: "Mutación", img: "/img/mutacion.jpg" },
    { id: 7, text: "Adenina", img: "/img/adenina.jpg" },
    { id: 8, text: "Timina", img: "/img/timina.jpg" },
    { id: 9, text: "Guanina", img: "/img/guanina.jpg" },
    { id: 10, text: "Citosina", img: "/img/citosina.jpg" },
    { id: 11, text: "Fenotipo", img: "/img/fenotipo.jpg" },
    { id: 12, text: "Genotipo", img: "/img/genotipo.jpg" },
    { id: 13, text: "Alelo", img: "/img/alelo.jpg" },
    { id: 14, text: "Homocigoto", img: "/img/homocigoto.jpg" },
    { id: 15, text: "Heterocigoto", img: "/img/heterocigoto.jpg" },
    { id: 16, text: "Dominante", img: "/img/dominante.jpg" },
    { id: 17, text: "Recesiva", img: "/img/recesiva.jpg" },
    { id: 18, text: "Codominante", img: "/img/codominante.jpg" },
    { id: 19, text: "Intermedia", img: "/img/intermedia.jpg" },
    { id: 20, text: "1ra Ley", img: "/img/ley1.jpg" },
    { id: 21, text: "2da Ley", img: "/img/ley2.jpg" },
    { id: 22, text: "3ra Ley", img: "/img/ley3.jpg" }
];

function startGame() {
    const board = document.getElementById('game-board');
    board.innerHTML = "";
    
    let deck = [];
    rawData.forEach(item => {
        deck.push({ id: item.id, content: item.text, type: 'text' });
        deck.push({ id: item.id, content: item.img, type: 'img' });
    });

    // Mezcla sincronizada usando el código de sala como semilla
    let seed = roomCode.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const seededRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

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
            <div class="card-back card-face">
                ${data.type === 'img' 
                    ? `<img src="${data.content}" loading="lazy">` 
                    : `<span>${data.content}</span>`}
            </div>
        `;
        card.onclick = () => {
            if (!isMyTurn || lockBoard || card.classList.contains('flipped')) return;
            socket.emit('flipCard', { room: roomCode, cardIndex: index, cardId: card.dataset.id });
        };
        board.appendChild(card);
    });
}

/* ========================= */
/* 🔄 SYNC EVENTOS (SOCKETS) */
/* ========================= */

socket.on('flipCardGlobal', (index) => {
    const cards = document.querySelectorAll('.card');
    if(cards[index]) cards[index].classList.add('flipped');
});

socket.on('matchResult', ({ indexes, match }) => {
    const cards = document.querySelectorAll('.card');
    const [c1, c2] = indexes.map(i => cards[i]);

    if (!c1 || !c2) return;

    if (match) {
        c1.classList.add('correct');
        c2.classList.add('correct');
        scores[currentPlayer - 1]++;
        
        const scoreElem = document.getElementById(`score${currentPlayer}`);
        if(scoreElem) scoreElem.textContent = scores[currentPlayer - 1];
        
        // Verificar si se encontraron todos los pares
        if (scores[0] + scores[1] === 22) {
            let finalMsg = scores[0] === scores[1] ? "EMPATE" : (scores[0] > scores[1] ? "GANADOR: J1" : "GANADOR: J2");
            endGame(finalMsg);
        }
    } else {
        lockBoard = true;
        c1.classList.add('wrong');
        c2.classList.add('wrong');
        setTimeout(() => {
            c1.classList.remove('flipped', 'wrong');
            c2.classList.remove('flipped', 'wrong');
            lockBoard = false;
        }, 800);
    }
});

socket.on('nextTurn', (turn) => {
    currentPlayer = turn;
    isMyTurn = (turn === myPlayerNum);
    
    // Actualizar UI visual de turno activo
    document.querySelectorAll('.player-box').forEach(b => b.classList.remove('active'));
    const activeBox = document.getElementById(`p${turn}-ui`);
    if(activeBox) activeBox.classList.add('active');
});

function endGame(msg) {
    if(countdownInterval) clearInterval(countdownInterval);
    const modal = document.getElementById('win-modal');
    const winText = document.getElementById('grand-winner-name');
    
    if(modal) modal.classList.remove('hidden');
    if(winText) winText.textContent = msg;
}