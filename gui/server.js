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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('📊 Dashboard client connected');
  
  socket.on('disconnect', () => {
    console.log('📊 Dashboard client disconnected');
  });
});

// Export function to emit logs to dashboard
function emitLog(level, message, data = {}) {
  io.emit('log', {
    timestamp: new Date().toISOString(),
    level,
    message,
    data
  });
}

function emitMetric(name, value) {
  io.emit('metric', { name, value, timestamp: Date.now() });
}

const PORT = process.env.GUI_PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 TCGBot Dashboard running at http://localhost:${PORT}`);
});

module.exports = { emitLog, emitMetric };