const socket = io();

let roomCode = "";
let myPlayerNum = 0;
let isMyTurn = false;

let currentPlayer = 0;
let scores = [0, 0];
let times = [0, 0];

let timerInterval;
let flippedCards = [];
let pairsFound = 0;
let isProcessing = false;

/* ========================= */
/* 🔥 OCULTAR MODAL AL INICIO */
/* ========================= */
window.onload = () => {
    const winModal = document.getElementById('win-modal');
    if (winModal) winModal.classList.add('hidden');
};

/* ========================= */
/* 🧠 LOBBY */
/* ========================= */
const lobby = document.createElement('div');
lobby.id = 'lobby-ui';

lobby.innerHTML = `
    <div class="modal">
        <div class="modal-content">
            <h2 style="color:#00ffcc; font-family:'Orbitron';">Corruptotes</h2>

            <button id="btn-crear" class="reload-btn">CREAR SALA</button>

            <p style="color:#88a1a5; margin:15px 0;">— O —</p>

            <input type="text" id="input-room" maxlength="5" placeholder="CÓDIGO">

            <button id="btn-unir" class="reload-btn">UNIRSE</button>
        </div>
    </div>
`;

document.body.prepend(lobby);

/* ========================= */
/* 🎮 BOTONES */
/* ========================= */
document.getElementById('btn-crear').onclick = () => {
    roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    alert("CÓDIGO DE SALA: " + roomCode);
    socket.emit('joinRoom', roomCode);
};

document.getElementById('btn-unir').onclick = () => {
    roomCode = document.getElementById('input-room').value.toUpperCase();
    if (roomCode) socket.emit('joinRoom', roomCode);
};

/* ========================= */
/* 🔌 SOCKETS */
/* ========================= */
socket.on('playerAssigned', (num) => {
    myPlayerNum = num;
    isMyTurn = (num === 1);

    // 🔥 ocultar lobby
    document.getElementById('lobby-ui').classList.add('hidden');

    // 🔥 asegurar que win modal esté oculto
    document.getElementById('win-modal').classList.add('hidden');
});

socket.on('initGame', () => startGame());

socket.on('opponentFlipped', (index) => handleCardClick(index, false));

/* ========================= */
/* 🧬 DATA */
/* ========================= */
const rawData = [
    { id: 1, text: "Célula: Unidad básica", img: "img/celula.jpg" },
    { id: 2, text: "Cromosoma: ADN denso", img: "img/cromosoma.jpg" },
    { id: 3, text: "ADN: Doble hélice", img: "img/adn.jpg" },
    { id: 4, text: "Gen: Info hereditaria", img: "img/gen.jpg" },
    { id: 5, text: "Adenina: Se une a Timina", img: "img/adenina.jpg" },
    { id: 6, text: "Timina: Exclusiva ADN", img: "img/timina.jpg" },
    { id: 7, text: "Guanina: Se une a Citosina", img: "img/guanina.jpg" },
    { id: 8, text: "Citosina: Se une a Guanina", img: "img/citosina.jpg" },
    { id: 9, text: "Alelo: Versión de un gen", img: "img/alelo.jpg" },
    { id: 10, text: "Genotipo: Genes internos", img: "img/genotipo.jpg" },
    { id: 11, text: "Fenotipo: Rasgos físicos", img: "img/fenotipo.jpg" },
    { id: 12, text: "Homocigoto: Alelos AA/aa", img: "img/homocigoto.jpg" },
    { id: 13, text: "Heterocigoto: Alelos Aa", img: "img/heterocigoto.jpg" },
    { id: 14, text: "H. Dominante: Rasgo líder", img: "img/dominante.jpg" },
    { id: 15, text: "H. Recesiva: Rasgo oculto", img: "img/recesiva.jpg" },
    { id: 16, text: "H. Codominante: Doble rasgo", img: "img/codominante.jpg" },
    { id: 17, text: "H. Intermedia: Mezcla", img: "img/intermedia.jpg" },
    { id: 18, text: "Gregor Mendel: El Padre", img: "img/mendel.jpg" },
    { id: 19, text: "1ª Ley: Uniformidad", img: "img/ley1.jpg" },
    { id: 20, text: "2ª Ley: Segregación", img: "img/ley2.jpg" },
    { id: 21, text: "3ª Ley: Independencia", img: "img/ley3.jpg" },
    { id: 22, text: "Mutación: Cambio ADN", img: "img/mutacion.jpg" }
];

/* ========================= */
/* 🚀 START GAME */
/* ========================= */
function startGame() {
    const board = document.getElementById('game-board');
    board.innerHTML = "";
    board.classList.remove('hidden');

    document.getElementById('game-info').classList.remove('hidden');

    let deck = [];

    rawData.forEach(item => {
        deck.push({ id: item.id, content: item.text, type: 'text' });
        deck.push({ id: item.id, content: item.img, type: 'img' });
    });

    // 🔥 shuffle sincronizado
    let seed = roomCode.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const seededRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    deck.sort(() => seededRandom() - 0.5);

    deck.forEach((data, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = data.id;

        card.innerHTML = `
            <div class="card-face card-front"></div>
            <div class="card-face card-back">
                ${data.type === 'img'
                    ? `<img src="${data.content}">`
                    : `<span>${data.content}</span>`}
            </div>
        `;

        card.onclick = () => handleCardClick(index, true);
        board.appendChild(card);
    });

    startTimer();
}

/* ========================= */
/* 🃏 CLICK CARTA */
/* ========================= */
function handleCardClick(index, isLocal) {
    if (isLocal && !isMyTurn) return;
    if (isProcessing) return;

    const cards = document.querySelectorAll('.card');
    const card = cards[index];

    if (card.classList.contains('flipped') || flippedCards.length >= 2) return;

    card.classList.add('flipped');
    flippedCards.push(card);

    if (isLocal) {
        socket.emit('flipCard', { room: roomCode, cardIndex: index });
    }

    if (flippedCards.length === 2) {
        isProcessing = true;
        setTimeout(checkMatch, 700);
    }
}

/* ========================= */
/* 🧪 MATCH */
/* ========================= */
function checkMatch() {
    const [c1, c2] = flippedCards;

    if (c1.dataset.id === c2.dataset.id) {
        c1.classList.add('correct');
        c2.classList.add('correct');

        scores[currentPlayer]++;
        document.getElementById(`score${currentPlayer + 1}`).textContent = scores[currentPlayer];

        pairsFound++;
        document.getElementById('pairs-left').textContent = 22 - pairsFound;

        if (pairsFound === 22) {
            endGame();
        }

        flippedCards = [];
        isProcessing = false;

    } else {
        c1.classList.add('wrong');
        c2.classList.add('wrong');

        setTimeout(() => {
            c1.classList.remove('flipped', 'wrong');
            c2.classList.remove('flipped', 'wrong');

            flippedCards = [];
            isProcessing = false;

            switchPlayer();
        }, 900);
    }
}

/* ========================= */
/* 🔄 CAMBIAR TURNO */
/* ========================= */
function switchPlayer() {
    currentPlayer = currentPlayer === 0 ? 1 : 0;
    isMyTurn = (currentPlayer + 1 === myPlayerNum);

    document.querySelectorAll('.player-box').forEach(b => b.classList.remove('active'));
    document.getElementById(`p${currentPlayer + 1}-ui`).classList.add('active');
}

/* ========================= */
/* ⏱️ TIMER */
/* ========================= */
function startTimer() {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        times[currentPlayer]++;

        const m = Math.floor(times[currentPlayer] / 60).toString().padStart(2, '0');
        const s = (times[currentPlayer] % 60).toString().padStart(2, '0');

        document.getElementById(`timer${currentPlayer + 1}`).textContent = `${m}:${s}`;
    }, 1000);
}

/* ========================= */
/* 🏁 FIN */
/* ========================= */
function endGame() {
    clearInterval(timerInterval);

    // 🔥 asegurar que lobby esté oculto
    document.getElementById('lobby-ui')?.classList.add('hidden');

    document.getElementById('win-modal').classList.remove('hidden');

    document.getElementById('final-score1').textContent = scores[0];
    document.getElementById('final-score2').textContent = scores[1];

    document.getElementById('grand-winner-name').textContent =
        scores[0] > scores[1] ? "GANA J1" : "GANA J2";
}