const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};

io.on('connection', (socket) => {
    socket.on('joinRoom', (roomCode) => {
        if (!rooms[roomCode]) {
            rooms[roomCode] = { players: [] };
        }

        if (rooms[roomCode].players.length < 2) {
            const playerNum = rooms[roomCode].players.length + 1;
            rooms[roomCode].players.push(socket.id);
            socket.join(roomCode);
            
            socket.emit('playerAssigned', playerNum);

            if (rooms[roomCode].players.length === 2) {
                io.to(roomCode).emit('initGame');
            }
        } else {
            socket.emit('errorMsg', 'La sala está llena');
        }
    });

    socket.on('flipCard', (data) => {
        socket.to(data.room).emit('opponentFlipped', data.cardIndex);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));