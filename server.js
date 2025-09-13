// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  // Untuk dev lokal; di production gunakan origin spesifik
  cors: { origin: "*" }
});


// ✅ tambahin ini biar kalau buka URL root nggak error
app.get("/", (req, res) => {
  res.json({ message: "Server running ✅" });
});

// serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join', ({ room, userId, name }) => {
    socket.join(room);
    socket.data.userId = userId;
    socket.data.name = name;
    socket.data.room = room;
    console.log(`${name} (${userId}) joined ${room}`);
    // beri tahu anggota room bahwa ada yang join (opsional)
    socket.to(room).emit('peerJoined', { userId, name });
  });

  socket.on('locationUpdate', (payload) => {
    // payload: { room, userId, name, lat, lng, ts }
    const room = payload.room || socket.data.room;
    if (!room) return;
    // Broadcast ke semua di room (termasuk pengirim jika perlu)
    io.to(room).emit('locationUpdate', {
      userId: payload.userId,
      name: payload.name,
      lat: payload.lat,
      lng: payload.lng,
      ts: payload.ts || Date.now()
    });
  });

  socket.on('stopSharing', () => {
    const { room, userId, name } = socket.data;
    if (room) socket.to(room).emit('peerStopped', { userId, name });
  });

  socket.on('disconnect', () => {
    const { room, userId, name } = socket.data;
    if (room) socket.to(room).emit('peerDisconnected', { userId, name });
    console.log('socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
