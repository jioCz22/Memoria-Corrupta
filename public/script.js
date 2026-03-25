const socket = io();

let roomCode = "";
let myPlayerNum = 0;
let isMyTurn = false;

let currentPlayer = 1;
let scores = [0, 0];
let flippedCards = [];
let lockBoard = false;

let timerInterval;
let seconds = 0;
let gameStarted = false;

/* ========================= */
/* 🔗 LOBBY */
/* ========================= */

// Creamos los botones de lobby dinámicamente si no están en el HTML
window.onload = () => {
    const lobbyDiv = document.createElement('div');
    lobbyDiv.id = "lobby-overlay";
    lobbyDiv.innerHTML = `
    <div class="modal" id="lobby-modal">
        <div class="modal-content">
            <h2 class="glitch-text">LOS CORRUPTOS</h2>
            
            <button class="reload-btn" onclick="createRoom()">CREAR SALA</button>
            
            <p style="margin:10px 0; opacity:0.5;">— O —</p>
            
            <input type="text" id="input-room" placeholder="CÓDIGO" maxlength="6">
            
            <button class="reload-btn" 
                    style="border-color:var(--accent2); color:var(--accent2);" 
                    onclick="joinRoom()">UNIRSE</button>
        </div>
    </div>
`;
    if(!document.getElementById('input-room')) document.body.prepend(lobbyDiv);
};

function createRoom() {
    roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    alert("Código de sala: " + roomCode);
    socket.emit('joinRoom', roomCode);
}

function joinRoom() {
    const input = document.getElementById('input-room');
    roomCode = input.value.toUpperCase();
    if (roomCode) socket.emit('joinRoom', roomCode);
}

socket.on('playerAssigned', (num) => {
    myPlayerNum = num;
    isMyTurn = (num === 1);
    document.getElementById('lobby-overlay').classList.add('hidden');
    document.getElementById('room-info').textContent = "SALA: " + roomCode;
});

socket.on('initGame', () => {
    startGame();
});

/* ========================= */
/* 🧠 DATA */
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

/* ========================= */
/* 🎮 GAME */
/* ========================= */

function startGame() {
    const board = document.getElementById('game-board');
    board.innerHTML = "";
    board.classList.remove('hidden');

    let deck = [];
    rawData.forEach(item => {
        deck.push({ id: item.id, content: item.text, type: 'text' });
        deck.push({ id: item.id, content: item.img, type: 'img' });
    });

    // MEZCLA SINCRONIZADA (Basada en el código de sala)
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
            <div class="card-face card-back">
                ${data.type === 'img' 
                    ? `<img src="${data.content}" loading="lazy">` 
                    : `<span>${data.content}</span>`}
            </div>
        `;
        card.onclick = () => handleClick(card, index);
        board.appendChild(card);
    });
}

function handleClick(card, index) {
    if (!isMyTurn || lockBoard || card.classList.contains('flipped')) return;

    socket.emit('flipCard', {
        room: roomCode,
        cardIndex: index,
        cardId: card.dataset.id
    });
}

/* ========================= */
/* 🔄 SYNC SOCKETS */
/* ========================= */

socket.on('flipCardGlobal', (index) => {
    const cards = document.querySelectorAll('.card');
    const card = cards[index];
    if (!card) return;
    card.classList.add('flipped');
});

// AQUÍ ESTÁ TU BLOQUE ACTUALIZADO Y COMPLETO
socket.on('matchResult', ({ indexes, match }) => {
    const cards = document.querySelectorAll('.card');
    const [c1, c2] = indexes.map(i => cards[i]);

    if (!c1 || !c2) return;

    if (match) {
        // Efecto visual de acierto
        c1.classList.add('correct', 'flipped');
        c2.classList.add('correct', 'flipped');
        
        // Sumar puntos al jugador actual
        scores[currentPlayer - 1]++;
        const scoreElement = document.getElementById(`score${currentPlayer}`);
        if(scoreElement) scoreElement.textContent = scores[currentPlayer - 1];
        
        // Verificar si terminó el juego (22 pares)
        const totalFound = scores[0] + scores[1];
        if(totalFound === 22) {
            document.getElementById('win-modal').classList.remove('hidden');
            document.getElementById('grand-winner-name').textContent = 
                scores[0] > scores[1] ? "GANADOR: J1" : "GANADOR: J2";
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

    document.querySelectorAll('.player-box').forEach(b => b.classList.remove('active'));
    const activeBox = document.getElementById(`p${turn}-ui`);
    if(activeBox) activeBox.classList.add('active');
});

function startTimer() {
    if (gameStarted) return; // Evita que se duplique el contador
    gameStarted = true;
    
    // Limpiamos cualquier intervalo previo por seguridad
    clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        seconds++;
        
        // Calculamos minutos y segundos
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        
        // Formateamos a 00:00
        const timeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        // Actualizamos los dos contadores (J1 y J2)
        const timer1 = document.getElementById('timer1');
        const timer2 = document.getElementById('timer2');
        
        if (timer1) timer1.textContent = timeString;
        if (timer2) timer2.textContent = timeString;
    }, 1000);
}