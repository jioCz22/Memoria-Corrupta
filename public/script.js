const socket = io();



let roomCode = "";

let myPlayerNum = 0;

let isMyTurn = false;

let currentPlayer = 1;

let scores = [0, 0];

let lockBoard = false;

let timers = [120, 120]; // 2 minutos cada uno

let countdownInterval = null;



/* --- LÓGICA DE SALAS --- */

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

    startGlobalTimer();

});



/* --- CRONÓMETRO --- */

function startGlobalTimer() {

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {

        timers[currentPlayer - 1]--;

        updateTimerUI();



        if (timers[currentPlayer - 1] <= 0) {

            clearInterval(countdownInterval);

            endGame(currentPlayer === 1 ? "GANA J2 (TIEMPO J1 AGOTADO)" : "GANA J1 (TIEMPO J2 AGOTADO)");

        }

    }, 1000);

}



function updateTimerUI() {

    const format = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    document.getElementById('timer1').textContent = format(timers[0]);

    document.getElementById('timer2').textContent = format(timers[1]);

}



/* --- JUEGO --- */

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

    board.innerHTML = "";

    let deck = [];

    rawData.forEach(i => {

        deck.push({ id: i.id, type: 'text', content: i.text });

        deck.push({ id: i.id, type: 'img', content: i.img });

    });



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

            <div class="card-face card-back">${data.type === 'img' ? `<img src="${data.content}">` : `<span>${data.content}</span>`}</div>

        `;

        card.onclick = () => {

            if (!isMyTurn || lockBoard || card.classList.contains('flipped')) return;

            socket.emit('flipCard', { room: roomCode, cardIndex: index, cardId: data.id });

        };

        board.appendChild(card);

    });

}



socket.on('flipCardGlobal', (index) => {

    const cards = document.querySelectorAll('.card');

    if (cards[index]) cards[index].classList.add('flipped');

});



socket.on('matchResult', ({ indexes, match }) => {

    const cards = document.querySelectorAll('.card');

    const [c1, c2] = indexes.map(i => cards[i]);

    if (match) {

        c1.classList.add('correct'); c2.classList.add('correct');

        scores[currentPlayer - 1]++;

        document.getElementById(`score${currentPlayer}`).textContent = scores[currentPlayer - 1];

        if (scores[0] + scores[1] === 22) endGame(scores[0] > scores[1] ? "GANA J1" : "GANA J2");

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

    document.querySelectorAll('.player-info').forEach(p => p.classList.remove('active'));

    document.getElementById(`p${turn}-ui`).classList.add('active');

});



function endGame(msg) {

    clearInterval(countdownInterval);

    document.getElementById('win-modal').classList.remove('hidden');

    document.getElementById('grand-winner-name').textContent = msg;

}

