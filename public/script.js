const socket = io();

let roomCode = "";
let myPlayerNum = 0;
let currentPlayer = 1;
let isMyTurn = false;

let scores = [0, 0];
let lockBoard = false;

/* --- SALAS --- */

function createRoom() {
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById('input-room').value = roomCode;
    socket.emit('joinRoom', roomCode);
}

function joinRoom() {
    const input = document.getElementById('input-room');
    if (input.value) {
        roomCode = input.value.toUpperCase();
        socket.emit('joinRoom', roomCode);
    }
}

socket.on('playerAssigned', (num) => {
    myPlayerNum = num;
    document.getElementById('current-room-code').textContent = roomCode;
});

socket.on('initGame', () => {
    document.getElementById('lobby-overlay').style.display = 'none';
    document.getElementById('game-ui').classList.remove('hidden');
    startGame();
});

/* --- TURNOS --- */

socket.on('nextTurn', (turn) => {
    currentPlayer = turn;
    isMyTurn = (turn === myPlayerNum);

    document.querySelectorAll('.player-box')
        .forEach(p => p.classList.remove('active'));

    document.getElementById(`p${turn}-ui`)
        .classList.add('active');
});

/* --- JUEGO --- */

const rawData = [
    { id: 1, text: "Célula" },
    { id: 2, text: "ADN" },
    { id: 3, text: "Gen" },
    { id: 4, text: "Cromosoma" }
];

function startGame() {
    const board = document.getElementById('game-board');
    board.innerHTML = "";

    let deck = [];

    rawData.forEach(i => {
        deck.push({ id: i.id, content: i.text });
        deck.push({ id: i.id, content: i.text });
    });

    deck.sort(() => Math.random() - 0.5);

    deck.forEach((data, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = data.id;

        card.innerHTML = `
            <div class="card-face card-front"></div>
            <div class="card-face card-back">
                <span>${data.content}</span>
            </div>
        `;

        card.onclick = () => {
            if (!isMyTurn || lockBoard || card.classList.contains('flipped')) return;

            socket.emit('flipCard', {
                room: roomCode,
                cardIndex: index,
                cardId: data.id
            });
        };

        board.appendChild(card);
    });
}

/* --- EVENTOS --- */

socket.on('flipCardGlobal', (index) => {
    const cards = document.querySelectorAll('.card');
    cards[index].classList.add('flipped');
});

socket.on('matchResult', ({ indexes, match }) => {
    const cards = document.querySelectorAll('.card');
    const [a, b] = indexes.map(i => cards[i]);

    if (match) {
        a.classList.add('correct');
        b.classList.add('correct');

        scores[currentPlayer - 1]++;
        document.getElementById(`score${currentPlayer}`).textContent = scores[currentPlayer - 1];
    } else {
        lockBoard = true;

        setTimeout(() => {
            a.classList.remove('flipped');
            b.classList.remove('flipped');
            lockBoard = false;
        }, 800);
    }
});