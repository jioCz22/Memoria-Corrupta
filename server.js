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
        if (!rooms[roomCode]) {
            rooms[roomCode] = {
                players: [],
                turn: 1,
                flipped: [],
                flippedIds: [],
                lock: false
            };
        }

        const room = rooms[roomCode];

        if (room.players.length >= 2) {
            socket.emit('errorMsg', 'Sala llena');
            return;
        }

        room.players.push(socket.id);
        socket.join(roomCode);

        const playerNum = room.players.length;
        socket.emit('playerAssigned', playerNum);

        if (room.players.length === 2) {
            io.to(roomCode).emit('initGame');
            io.to(roomCode).emit('nextTurn', 1); // 🔥 IMPORTANTE
        }
    });

    socket.on('flipCard', ({ room: roomCode, cardIndex, cardId }) => {
        const room = rooms[roomCode];
        if (!room || room.lock) return;

        const playerIndex = room.players.indexOf(socket.id) + 1;
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

                if (!isMatch) {
                    room.turn = room.turn === 1 ? 2 : 1;
                }

                io.to(roomCode).emit('nextTurn', room.turn);

                room.flipped = [];
                room.flippedIds = [];
                room.lock = false;

            }, 900);
        }
    });

    socket.on('disconnect', () => {
        for (let roomCode in rooms) {
            let room = rooms[roomCode];
            room.players = room.players.filter(id => id !== socket.id);

            if (room.players.length === 0) {
                delete rooms[roomCode];
            }
        }
    });
});

server.listen(3000, () => console.log('Servidor en http://localhost:3000'));