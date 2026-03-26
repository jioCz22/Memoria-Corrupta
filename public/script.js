const socket = io();

// ESTADO GLOBAL
let roomCode = "";
let myPlayerNum = 0;
let isMyTurn = false;
let currentPlayer = 1;
let scores = [0, 0];
let lockBoard = false;
let timers = [120, 120]; 
let countdownInterval = null;

/* ========================= */
/* 🔗 LOBBY & SALAS */
/* ========================= */

function createRoom() {
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const input = document.getElementById('input-room');
    if (input) input.value = roomCode; 
    socket.emit('joinRoom', roomCode);
}

function joinRoom() {
    const input = document.getElementById('input-room');
    if (input && input.value) {
        roomCode = input.value.toUpperCase();
        socket.emit('joinRoom', roomCode);
    } else {
        alert("Por favor, ingresa un código de sala.");
    }
}

// Asignación de jugador
socket.on('playerAssigned', (num) => {
    myPlayerNum = num;
    isMyTurn = (num === 1);
    const roomDisplay = document.getElementById('current-room-code');
    const roomInfo = document.getElementById('room-info');
    if (roomDisplay) roomDisplay.textContent = roomCode;
    if (roomInfo) roomInfo.textContent = "SALA: " + roomCode;
});

// Inicio oficial de la partida
socket.on('initGame', () => {
    document.getElementById('lobby-overlay').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    document.getElementById('game-board').classList.remove('hidden');
    
    startGame();
    startCountdown();
});

/* ========================= */
/* 🧠 DATA & LÓGICA DE JUEGO */
/* ========================= */

const rawData = [
    { id: 1, text: "Célula: Unidad básica, estructural y funcional de todos los seres vivos.", img: "/img/celula.jpg" },
    { id: 2, text: "ADN: Molécula que contiene la información genética de los seres vivos.", img: "/img/adn.jpg" },
    { id: 3, text: "Gen: Segmento de ADN que contiene la instrucción para un rasgo específico.", img: "/img/gen.jpg" },
    { id: 4, text: "Cromosoma: Estructura formada por ADN condensado presente en el núcleo.", img: "/img/cromosoma.jpg" },
    { id: 5, text: "Gregor Mendel: Monje científico considerado el padre de la genética moderna.", img: "/img/mendel.jpg" },
    { id: 6, text: "Mutación: Cambio aleatorio en la secuencia del ADN que genera variación.", img: "/img/mutacion.jpg" },
    { id: 7, text: "Adenina: Base nitrogenada que siempre se empareja con la Timina.", img: "/img/adenina.jpg" },
    { id: 8, text: "Timina: Base nitrogenada exclusiva del ADN que se une a la Adenina.", img: "/img/timina.jpg" },
    { id: 9, text: "Guanina: Base nitrogenada que siempre se empareja con la Citosina.", img: "/img/guanina.png" },
    { id: 10, text: "Citosina: Base nitrogenada que se une a la Guanina mediante tres puentes.", img: "/img/citosina.jpg" },
    { id: 11, text: "Fenotipo: Expresión física o rasgos observables de un individuo.", img: "/img/fenotipo.jpg" },
    { id: 12, text: "Genotipo: Conjunto de genes que posee un organismo en su ADN.", img: "/img/genotipo.jpg" },
    { id: 13, text: "Alelo: Cada una de las formas alternativas que puede tener un mismo gen.", img: "/img/alelo.jpg" },
    { id: 14, text: "Homocigoto: Individuo con dos alelos iguales para un gen (AA o aa).", img: "/img/homocigoto.jpg" },
    { id: 15, text: "Heterocigoto: Individuo con dos alelos diferentes para un gen (Aa).", img: "/img/heterocigoto.jpg" },
    { id: 16, text: "Herencia Dominante: Rasgo que se expresa siempre que el alelo está presente.", img: "/img/dominante.jpg" },
    { id: 17, text: "Herencia Recesiva: Rasgo que solo se expresa si ambos alelos son iguales.", img: "/img/recesiva.jpg" },
    { id: 18, text: "H. Codominante: Tipo de herencia donde ambos alelos se expresan por igual.", img: "/img/codominante.jpg" },
    { id: 19, text: "Herencia Intermedia: Los rasgos se mezclan creando un fenotipo nuevo (ej. rosa).", img: "/img/intermedia.jpg" },
    { id: 20, text: "1ra Ley de Mendel: Ley de Uniformidad de los híbridos de la primera generación.", img: "/img/ley1.jpg" },
    { id: 21, text: "2da Ley de Mendel: Ley de Segregación de los caracteres en la segunda generación.", img: "/img/ley2.jpg" },
    { id: 22, text: "3ra Ley de Mendel: Ley de la Transmisión Independiente de los caracteres.", img: "/img/ley3.jpg" }
];

function startGame() {
    const board = document.getElementById('game-board');
    if (!board) return;
    board.innerHTML = "";

    let deck = [];
    rawData.forEach(item => {
        deck.push({ id: item.id, content: item.text, type: 'text' });
        deck.push({ id: item.id, content: item.img, type: 'img' });
    });

    // Mezcla sincronizada
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
        card.classList.add('card');
        card.dataset.index = index;
        card.dataset.id = data.id;
        card.innerHTML = `
            <div class="card-face card-front"></div>
            <div class="card-face card-back">
                ${data.type === 'img' ? `<img src="${data.content}" loading="lazy">` : `<span>${data.content}</span>`}
            </div>
        `;
        card.onclick = () => handleClick(card, index);
        board.appendChild(card);
    });
}

function handleClick(card, index) {
    if (!isMyTurn || lockBoard || card.classList.contains('flipped')) return;
    socket.emit('flipCard', { roomCode: roomCode, cardIndex: index, cardId: card.dataset.id });
}

/* ========================= */
/* 🔄 SYNC & EVENTOS */
/* ========================= */

socket.on('flipCardGlobal', (index) => {
    const cards = document.querySelectorAll('.card');
    if (cards[index]) cards[index].classList.add('flipped');
});

socket.on('matchResult', ({ indexes, match }) => {
    const cards = document.querySelectorAll('.card');
    const [c1, c2] = indexes.map(i => cards[i]);

    if (!c1 || !c2) return;

    if (match) {
        c1.classList.add('correct');
        c2.classList.add('correct');
        scores[currentPlayer - 1]++;
        
        const scoreDisplay = document.getElementById(`score${currentPlayer}`);
        if (scoreDisplay) scoreDisplay.textContent = scores[currentPlayer - 1];

        if (scores[0] + scores[1] === rawData.length) {
            let winMsg = scores[0] === scores[1] ? "EMPATE TÉCNICO" : 
                         (scores[0] > scores[1] ? "GANA JUGADOR 1" : "GANA JUGADOR 2");
            endGame(winMsg);
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
    
    document.querySelectorAll('.player-box, .player-info').forEach(el => el.classList.remove('active'));
    const activeUI = document.getElementById(`p${turn}-ui`);
    if (activeUI) activeUI.classList.add('active');
});

/* ========================= */
/* ⏲️ TIEMPO & FIN */
/* ========================= */

function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        timers[currentPlayer - 1]--;
        updateTimerDisplay();
        
        if (timers[currentPlayer - 1] <= 0) {
            clearInterval(countdownInterval);
            endGame(currentPlayer === 1 ? "GANA JUGADOR 2 (TIEMPO)" : "GANA JUGADOR 1 (TIEMPO)");
        }
    }, 1000);
}

function updateTimerDisplay() {
    const format = (s) => {
        const seg = Math.max(0, s);
        return `${Math.floor(seg / 60)}:${(seg % 60).toString().padStart(2, '0')}`;
    };
    const t1 = document.getElementById('timer1');
    const t2 = document.getElementById('timer2');
    if (t1) t1.textContent = format(timers[0]);
    if (t2) t2.textContent = format(timers[1]);
}

function endGame(msg) {
    if (countdownInterval) clearInterval(countdownInterval);
    const modal = document.getElementById('win-modal');
    const winText = document.getElementById('grand-winner-name');
    if (modal) modal.classList.remove('hidden');
    if (winText) winText.textContent = msg;
}