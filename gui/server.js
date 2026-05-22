const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const pino = require('pino');

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    activeConnections: io.engine.clientsCount,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let metrics = {
  activeTasks: 0,
  proxyHealth: 'unknown',
  successRate: 0,
  lastCheck: null,
  totalChecks: 0,
  successfulChecks: 0
};

io.on('connection', (socket) => {
  logger.info('Dashboard client connected');
  socket.emit('metrics', metrics);
  
  socket.on('disconnect', () => {
    logger.info('Dashboard client disconnected');
  });
});

function emitLog(level, message, data = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data
  };
  
  logger[level === 'error' ? 'error' : level === 'success' ? 'info' : 'info'](message);
  io.emit('log', logData);
}

function emitMetric(name, value) {
  metrics[name] = value;
  metrics.lastCheck = new Date().toISOString();
  io.emit('metric', { name, value, timestamp: Date.now() });
}

function incrementMetric(name) {
  metrics[name] = (metrics[name] || 0) + 1;
  if (name === 'totalChecks') {
    metrics.successRate = metrics.successfulChecks / metrics.totalChecks * 100;
  }
  io.emit('metrics', metrics);
}

const PORT = process.env.GUI_PORT || 3000;
server.listen(PORT, () => {
  logger.info(`🎮 TCGBot Dashboard running at http://localhost:${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`📈 Metrics: http://localhost:${PORT}/metrics`);
});

module.exports = { emitLog, emitMetric, incrementMetric, logger };
