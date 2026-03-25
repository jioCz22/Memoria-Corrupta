const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};

io.on('connection', (socket) => {

    socket.on('joinRoom', (roomCode) => {

        if (!rooms[roomCode]) {
            rooms[roomCode] = {
                players: [],
                turn: 1,
                flipped: [],
                lock: false
            };
        }

        let room = rooms[roomCode];

        if (room.players.length >= 2) {
            socket.emit('errorMsg', 'Sala llena');
            return;
        }

        room.players.push(socket.id);
        socket.join(roomCode);

        let playerNum = room.players.length;

        socket.emit('playerAssigned', playerNum);

        if (room.players.length === 2) {
            io.to(roomCode).emit('initGame');
        }
    });

    /* ========================= */
    /* 🔥 CONTROL REAL DE JUEGO */
    /* ========================= */
    socket.on('flipCard', ({ room: roomCode, cardIndex }) => {

        let room = rooms[roomCode];
        if (!room) return;

        let playerIndex = room.players.indexOf(socket.id) + 1;

        /* 🔒 VALIDACIONES */
        if (room.lock) return;
        if (playerIndex !== room.turn) return;

        /* 📤 ENVIAR A TODOS */
        io.to(roomCode).emit('flipCardGlobal', cardIndex);

        room.flipped.push(cardIndex);

        if (room.flipped.length === 2) {
            room.lock = true;

            setTimeout(() => {

                /* 🔄 CAMBIO DE TURNO */
                room.turn = room.turn === 1 ? 2 : 1;

                room.flipped = [];
                room.lock = false;

                io.to(roomCode).emit('nextTurn', room.turn);

            }, 800);
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor activo en " + PORT));