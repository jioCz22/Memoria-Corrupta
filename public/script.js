const socket = io();
let roomCode = "", myPlayerNum = 0, isMyTurn = false;
let currentPlayer = 0, scores = [0, 0], times = [0, 0], timerInterval;
let flippedCards = [], pairsFound = 0, isProcessing = false;

// LOBBY DINÁMICO
const lobby = document.createElement('div');
lobby.id = 'lobby-ui';
lobby.innerHTML = `
    <div class="modal">
        <div class="modal-content">
            <h2 style="color:var(--accent); font-family:'Orbitron';">Los Corruptos</h2>
            <button id="btn-crear" class="reload-btn" style="width:100%">CREAR SALA</button>
            <p style="margin:15px 0; color:#88a1a5;">— O —</p>
            <input type="text" id="input-room" placeholder="CÓDIGO" maxlength="5" style="width:100%; padding:10px; box-sizing:border-box; text-align:center; background:#000; color:#fff; border:1px solid #333;">
            <button id="btn-unir" class="reload-btn" style="width:100%; background:none; border:1px solid var(--accent); color:var(--accent); margin-top:10px;">UNIRSE</button>
        </div>
    </div>
`;
document.body.prepend(lobby);

document.getElementById('btn-crear').onclick = () => {
    roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    alert("CÓDIGO DE SALA: " + roomCode);
    socket.emit('joinRoom', roomCode);
};

document.getElementById('btn-unir').onclick = () => {
    roomCode = document.getElementById('input-room').value.toUpperCase();
    if(roomCode) socket.emit('joinRoom', roomCode);
};

socket.on('playerAssigned', (num) => {
    myPlayerNum = num;
    isMyTurn = (num === 1);
    document.getElementById('lobby-ui').classList.add('hidden');
    document.getElementById('room-info').textContent = "SALA: " + roomCode;
});

socket.on('initGame', () => startGame());

const rawData = [
    { id: 1, text: "Célula", img: "img/celula.jpg" }, { id: 2, text: "ADN", img: "img/adn.jpg" },
    { id: 3, text: "Gen", img: "img/gen.jpg" }, { id: 4, text: "Cromosoma", img: "img/cromosoma.jpg" },
    { id: 5, text: "Mendel", img: "img/mendel.jpg" }, { id: 6, text: "Mutación", img: "img/mutacion.jpg" },
    { id: 7, text: "Adenina", img: "img/adenina.jpg" }, { id: 8, text: "Timina", img: "img/timina.jpg" },
    { id: 9, text: "Guanina", img: "img/guanina.jpg" }, { id: 10, text: "Citosina", img: "img/citosina.jpg" },
    { id: 11, text: "Fenotipo", img: "img/fenotipo.jpg" }, { id: 12, text: "Genotipo", img: "img/genotipo.jpg" },
    { id: 13, text: "Alelo", img: "img/alelo.jpg" }, { id: 14, text: "Homocigoto", img: "img/homocigoto.jpg" },
    { id: 15, text: "Heterocigoto", img: "img/heterocigoto.jpg" }, { id: 16, text: "Dominante", img: "img/dominante.jpg" },
    { id: 17, text: "Recesiva", img: "img/recesiva.jpg" }, { id: 18, text: "Codominante", img: "img/codominante.jpg" },
    { id: 19, text: "Intermedia", img: "img/intermedia.jpg" }, { id: 20, text: "1ra Ley", img: "img/ley1.jpg" },
    { id: 21, text: "2da Ley", img: "img/ley2.jpg" }, { id: 22, text: "3ra Ley", img: "img/ley3.jpg" }
];

function startGame() {
    const board = document.getElementById('game-board');
    board.innerHTML = ""; board.classList.remove('hidden');
    document.getElementById('game-info').classList.remove('hidden');
    
    let deck = [];
    rawData.forEach(item => {
        deck.push({ id: item.id, content: item.text, type: 'text' });
        deck.push({ id: item.id, content: item.img, type: 'img' });
    });
    
    let seed = roomCode.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const seededRandom = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    deck.sort(() => seededRandom() - 0.5);

    deck.forEach((data, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = data.id;
        card.innerHTML = `<div class="card-face card-front"></div>
            <div class="card-face card-back">
                ${data.type === 'img' ? `<img src="${data.content}">` : `<span>${data.content}</span>`}
            </div>`;
        card.onclick = () => handleCardClick(index, true);
        board.appendChild(card);
    });
    startTimer();
}

function handleCardClick(index, isLocal) {
    if ((isLocal && !isMyTurn) || isProcessing) return;
    const cards = document.querySelectorAll('.card');
    const card = cards[index];
    if (card.classList.contains('flipped') || flippedCards.length >= 2) return;

    card.classList.add('flipped');
    flippedCards.push(card);

    if (isLocal) socket.emit('flipCard', { room: roomCode, cardIndex: index });
    if (flippedCards.length === 2) {
        isProcessing = true;
        setTimeout(checkMatch, 800);
    }
}

socket.on('opponentFlipped', (index) => handleCardClick(index, false));

function checkMatch() {
    const [c1, c2] = flippedCards;
    if (c1.dataset.id === c2.dataset.id) {
        scores[currentPlayer]++;
        document.getElementById(`score${currentPlayer + 1}`).textContent = scores[currentPlayer];
        pairsFound++;
        document.getElementById('pairs-left').textContent = 22 - pairsFound;
        if (pairsFound === 22) endGame();
    } else {
        c1.classList.remove('flipped');
        c2.classList.remove('flipped');
        switchPlayer();
    }
    flippedCards = [];
    isProcessing = false;
}

function switchPlayer() {
    currentPlayer = currentPlayer === 0 ? 1 : 0;
    isMyTurn = (currentPlayer + 1 === myPlayerNum);
    document.querySelectorAll('.player-box').forEach(b => b.classList.remove('active'));
    document.getElementById(`p${currentPlayer + 1}-ui`).classList.add('active');
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        times[currentPlayer]++;
        const m = Math.floor(times[currentPlayer] / 60).toString().padStart(2, '0');
        const s = (times[currentPlayer] % 60).toString().padStart(2, '0');
        document.getElementById(`timer${currentPlayer + 1}`).textContent = `${m}:${s}`;
    }, 1000);
}

function endGame() {
    clearInterval(timerInterval);
    document.getElementById('win-modal').classList.remove('hidden');
    document.getElementById('grand-winner-name').textContent = scores[0] > scores[1] ? "GANA J1" : "GANA J2";
}