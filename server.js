const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let rooms = {};

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('joinRoom', (roomCode) => {
        // Si la sala no existe, la creamos
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
            
            const playerNum = room.players.length;
            socket.emit('playerAssigned', playerNum);

            console.log(`Jugador ${playerNum} se unió a sala: ${roomCode}`);

            // Cuando llega el segundo jugador, iniciamos para TODOS en la sala
            if (room.players.length === 2) {
                io.to(roomCode).emit('initGame');
                // Enviamos el primer turno explícitamente para activar los relojes
                io.to(roomCode).emit('nextTurn', 1);
            }
        } else {
            socket.emit('errorMsg', 'La sala está llena');
        }
    });

    socket.on('flipCard', ({ room: roomCode, cardIndex, cardId }) => {
        const room = rooms[roomCode];
        if (!room || room.lock) return;

        const playerIndex = room.players.indexOf(socket.id) + 1;
        
        // VALIDACIÓN: Solo el jugador de turno puede mover
        if (playerIndex !== room.turn) return; 
        if (room.flipped.includes(cardIndex)) return;

        room.flipped.push(cardIndex);
        room.flippedIds.push(cardId);

        io.to(roomCode).emit('flipCardGlobal', cardIndex);

        if (room.flipped.length === 2) {
            room.lock = true;
            const isMatch = room.flippedIds[0] === room.flippedIds[1];

            setTimeout(() => {
                io.to(roomCode).emit('matchResult', {
                    indexes: room.flipped,
                    match: isMatch
                });

                if (isMatch) {
                    room.pairsFound++;
                    // El jugador que acierta SIGUE teniendo el turno
                    // Opcional: puedes emitir nextTurn aquí también para resetear animaciones
                } else {
                    // Si falla, cambiamos de turno
                    room.turn = room.turn === 1 ? 2 : 1;
                    io.to(roomCode).emit('nextTurn', room.turn);
                }

                // Limpiar estado de la jugada
                room.flipped = [];
                room.flippedIds = [];
                room.lock = false;
            }, 800);
        }
    });

    socket.on('disconnect', () => {
        for (let roomCode in rooms) {
            let room = rooms[roomCode];
            if (room.players.includes(socket.id)) {
                room.players = room.players.filter(id => id !== socket.id);
                // Notificar al oponente que el otro se fue (opcional)
                io.to(roomCode).emit('errorMsg', 'El oponente se ha desconectado.');
                
                if (room.players.length === 0) {
                    delete rooms[roomCode];
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));