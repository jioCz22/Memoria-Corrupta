const socket = io();

let roomCode = "";
let myPlayerNum = 0;
let isMyTurn = false;

let currentPlayer = 0;
let scores = [0, 0];
let times = [0, 0];

let flippedCards = [];
let pairsFound = 0;

let lockBoard = false;
let timerInterval;

/* ========================= */
/* 🧠 LOBBY */
/* ========================= */
const lobby = document.createElement('div');
lobby.id = 'lobby-ui';

lobby.innerHTML = `
<div class="modal">
    <div class="modal-content">
        <h2 style="color:#00ffcc;">Corruptotes</h2>

        <button id="btn-crear" class="reload-btn">CREAR SALA</button>

        <p>— O —</p>

        <input id="input-room" maxlength="5" placeholder="CÓDIGO">

        <button id="btn-unir" class="reload-btn">UNIRSE</button>
    </div>
</div>
`;

document.body.prepend(lobby);

/* ========================= */
/* 📋 TOAST */
/* ========================= */
function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);

    setTimeout(() => t.classList.add('show'), 50);
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 300);
    }, 2000);
}

/* ========================= */
/* 🎮 BOTONES */
/* ========================= */
document.getElementById('btn-crear').onclick = () => {
    roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

    navigator.clipboard.writeText(roomCode);
    showToast("Código copiado: " + roomCode);

    socket.emit('joinRoom', roomCode);
};

document.getElementById('btn-unir').onclick = () => {
    roomCode = document.getElementById('input-room').value.toUpperCase();
    if (roomCode) socket.emit('joinRoom', roomCode);
};

/* ========================= */
/* 🔌 SOCKET */
/* ========================= */
socket.on('playerAssigned', (num) => {
    myPlayerNum = num;
    isMyTurn = (num === 1);

    document.getElementById('lobby-ui').classList.add('hidden');
});

socket.on('initGame', () => {
    startGame();
});

/* 🔥 NUEVO EVENTO GLOBAL */
socket.on('flipCardGlobal', (index) => {
    handleCardClick(index, false);
});

/* 🔄 TURNO DESDE SERVIDOR */
socket.on('nextTurn', (turn) => {
    currentPlayer = turn - 1;
    isMyTurn = (turn === myPlayerNum);

    document.querySelectorAll('.player-box').forEach(b => b.classList.remove('active'));
    document.getElementById(`p${turn}-ui`).classList.add('active');
});

/* ========================= */
/* 🧬 DATA */
/* ========================= */
const rawData = [
    { id: 1, text: "Célula", img: "img/celula.jpg" },
    { id: 2, text: "Cromosoma", img: "img/cromosoma.jpg" },
    { id: 3, text: "ADN", img: "img/adn.jpg" },
    { id: 4, text: "Gen", img: "img/gen.jpg" },
    { id: 5, text: "Adenina", img: "img/adenina.jpg" },
    { id: 6, text: "Timina", img: "img/timina.jpg" },
    { id: 7, text: "Guanina", img: "img/guanina.jpg" },
    { id: 8, text: "Citosina", img: "img/citosina.jpg" },
    { id: 9, text: "Alelo", img: "img/alelo.jpg" },
    { id: 10, text: "Genotipo", img: "img/genotipo.jpg" },
    { id: 11, text: "Fenotipo", img: "img/fenotipo.jpg" },
    { id: 12, text: "Homocigoto", img: "img/homocigoto.jpg" },
    { id: 13, text: "Heterocigoto", img: "img/heterocigoto.jpg" },
    { id: 14, text: "Dominante", img: "img/dominante.jpg" },
    { id: 15, text: "Recesiva", img: "img/recesiva.jpg" },
    { id: 16, text: "Codominante", img: "img/codominante.jpg" },
    { id: 17, text: "Intermedia", img: "img/intermedia.jpg" },
    { id: 18, text: "Mendel", img: "img/mendel.jpg" },
    { id: 19, text: "Ley1", img: "img/ley1.jpg" },
    { id: 20, text: "Ley2", img: "img/ley2.jpg" },
    { id: 21, text: "Ley3", img: "img/ley3.jpg" },
    { id: 22, text: "Mutación", img: "img/mutacion.jpg" }
];

/* ========================= */
/* 🚀 START */
/* ========================= */
function startGame() {

    const board = document.getElementById('game-board');
    board.innerHTML = "";
    board.classList.remove('hidden');

    flippedCards = [];
    pairsFound = 0;
    scores = [0, 0];

    document.getElementById('score1').textContent = "0";
    document.getElementById('score2').textContent = "0";

    let deck = [];

    rawData.forEach(item => {
        deck.push({ id: item.id, content: item.text, type: 'text' });
        deck.push({ id: item.id, content: item.img, type: 'img' });
    });

    deck.sort(() => Math.random() - 0.5);

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

        card.onclick = () => {
            if (!isMyTurn) return;
            handleCardClick(index, true);
        };

        board.appendChild(card);
    });

    startTimer();
}

/* ========================= */
/* 🃏 CLICK */
/* ========================= */
function handleCardClick(index, isLocal) {

    if (lockBoard) return;

    const cards = document.querySelectorAll('.card');
    const card = cards[index];

    if (!card || card.classList.contains('flipped')) return;
    if (flippedCards.length >= 2) return;

    card.classList.add('flipped');
    flippedCards.push(card);

    if (navigator.vibrate) navigator.vibrate(30);

    if (isLocal) {
        socket.emit('flipCard', { room: roomCode, cardIndex: index });
    }

    if (flippedCards.length === 2) {
        lockBoard = true;
        setTimeout(checkMatch, 700);
    }
}

/* ========================= */
/* 🧪 MATCH */
/* ========================= */
function checkMatch() {

    const [c1, c2] = flippedCards;

    if (!c1 || !c2) return resetTurn();

    if (c1.dataset.id === c2.dataset.id) {

        c1.classList.add('correct');
        c2.classList.add('correct');

        scores[currentPlayer]++;
        document.getElementById(`score${currentPlayer + 1}`).textContent = scores[currentPlayer];

        pairsFound++;

        if (pairsFound === 22) {
            endGame();
            return;
        }

    } else {

        c1.classList.add('wrong');
        c2.classList.add('wrong');

        setTimeout(() => {
            c1.classList.remove('flipped', 'wrong');
            c2.classList.remove('flipped', 'wrong');
        }, 600);
    }

    resetTurn();
}

/* ========================= */
/* 🔄 RESET */
/* ========================= */
function resetTurn() {
    flippedCards = [];
    lockBoard = false;
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

    document.getElementById('win-modal').classList.remove('hidden');

    document.getElementById('grand-winner-name').textContent =
        scores[0] > scores[1] ? "GANA J1" : "GANA J2";
}