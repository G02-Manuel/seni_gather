import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { SocketEvents } from './types.js';
import { GameServer } from './gameServer.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS: admite lista separada por comas o "*" en producción.
const rawOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
const corsOrigin: string | string[] =
  rawOrigin === '*'
    ? '*'
    : rawOrigin.split(',').map((o) => o.trim()).filter(Boolean);

app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(express.json());

// Socket.io setup (acepta websocket y polling — necesario tras proxy de App Platform)
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Inicializar servidor de juego
const gameServer = new GameServer(io);

// Rutas HTTP básicas
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/rooms', (req, res) => {
  res.json(gameServer.getRooms());
});

// Manejo de conexiones Socket.io
io.on(SocketEvents.CONNECTION, (socket) => {
  console.log(`🟢 Cliente conectado: ${socket.id}`);
  
  gameServer.handleConnection(socket);
  
  socket.on(SocketEvents.DISCONNECT, () => {
    console.log(`🔴 Cliente desconectado: ${socket.id}`);
    gameServer.handleDisconnection(socket);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Orbitra Server running on http://localhost:${PORT}`);
  console.log(`🎮 WebSocket ready for connections`);
});
