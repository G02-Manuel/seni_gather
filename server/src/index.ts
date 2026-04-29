import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SocketEvents } from './types.js';
import { GameServer } from './gameServer.js';
import { Storage } from './storage.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// CORS: admite lista separada por comas o "*" en producción.
const rawOrigin = process.env.CORS_ORIGIN || '*';
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

app.get('/api/permanent-rooms', async (req, res) => {
  try {
    const rows = await Storage.listRooms();
    res.json(rows);
  } catch (e: any) {
    console.error('listRooms error:', e.message);
    res.status(500).json([]);
  }
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

// Servir el frontend (build de CRA) en producción.
// Estructura en runtime: server/dist/index.js  →  ../../client/build
const clientBuildPath = path.resolve(__dirname, '../../client/build');
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Orbitra Server running on http://localhost:${PORT}`);
  console.log(`🎮 WebSocket ready for connections`);
});
