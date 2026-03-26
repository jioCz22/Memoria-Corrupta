const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 1. Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('joinRoom', (roomCode) => {
        // Inicializar sala si no existe
        if (!rooms[roomCode]) {
            rooms[roomCode] = {
                players: [],
                turn: 1,
                flipped: [],
                flippedIds: [],
                lock: false,
                pairsFound: 0
            };
        }

        const room = rooms[roomCode];

        if (room.players.length < 2) {
            room.players.push(socket.id);
            socket.join(roomCode);
            
            // Asignar número de jugador (1 o 2)
            const playerNum = room.players.length;
            socket.emit('playerAssigned', playerNum);

            console.log(`Jugador ${playerNum} se unió a: ${roomCode}`);

            // Iniciar juego cuando estén los 2
            if (room.players.length === 2) {
                io.to(roomCode).emit('initGame');
                io.to(roomCode).emit('nextTurn', 1);
            }
        } else {
            socket.emit('errorMsg', 'La sala está llena');
        }
    });

    socket.on('flipCard', ({ roomCode, cardIndex, cardId }) => {
        const room = rooms[roomCode];
        if (!room || room.lock) return;

        const playerIndex = room.players.indexOf(socket.id) + 1;
        
        // Validar turno y que la carta no esté ya volteada
        if (playerIndex !== room.turn) return;
        if (room.flipped.includes(cardIndex)) return;

        room.flipped.push(cardIndex);
        room.flippedIds.push(cardId);

        io.to(roomCode).emit('flipCardGlobal', cardIndex);

        if (room.flipped.length === 2) {
            room.lock = true;
            const isMatch = room.flippedIds[0] === room.flippedIds[1];

            // Tiempo de espera para que los jugadores vean las cartas
            setTimeout(() => {
                io.to(roomCode).emit('matchResult', {
                    indexes: room.flipped,
                    match: isMatch
                });

                if (isMatch) {
                    room.pairsFound++;
                    // El turno NO cambia si hay acierto
                } else {
                    // Cambiar turno solo si falla
                    room.turn = room.turn === 1 ? 2 : 1;
                }

                // Notificar quién sigue
                io.to(roomCode).emit('nextTurn', room.turn);

                // Resetear estado de la jugada
                room.flipped = [];
                room.flippedIds = [];
                room.lock = false;
            }, 1000);
        }
    });

    socket.on('disconnect', () => {
        for (let code in rooms) {
            const room = rooms[code];
            if (room.players.includes(socket.id)) {
                room.players = room.players.filter(id => id !== socket.id);
                io.to(code).emit('errorMsg', 'El oponente se ha desconectado.');
                if (room.players.length === 0) delete rooms[code];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));