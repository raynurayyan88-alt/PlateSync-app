import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./types";
import { registerSocketHandlers } from "../src/server/socketHandlers";
import { registerSocketHandlers as registerLegacySocketHandlers, getStats } from "./events";

const PORT = parseInt(process.env.PORT || "3001", 10);
const CLIENT_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const app = express();
const server = http.createServer(app);

// Configure CORS (supports Cloudflare Tunnel *.trycloudflare.com, loca.lt, and localhost)
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[Express] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Setup Socket.IO Server
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  path: "/socket.io",
  destroyUpgrade: false,
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 25000,
});

// Register Socket events
registerSocketHandlers(io);
registerLegacySocketHandlers(io);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "TableSync Real-Time WebSocket & Express Server",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Server and Socket stats endpoint
app.get("/api/status", (_req: Request, res: Response) => {
  const socketsCount = io.sockets.sockets.size;
  const stats = getStats();

  res.json({
    status: "online",
    port: PORT,
    connectedClients: socketsCount,
    activeTables: stats.activeTables,
    tables: stats.tables,
    timestamp: new Date().toISOString(),
  });
});

// Root welcome endpoint
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "TableSync API & WebSocket Server",
    status: "running",
    endpoints: {
      health: "/health",
      status: "/api/status",
    },
  });
});

// Start listening
server.listen(PORT, () => {
  console.log(`\n🚀 TableSync Express + Socket.IO Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready for connections from ${CLIENT_ORIGIN}`);
  console.log(`🩺 Health check available at http://localhost:${PORT}/health\n`);
});

export { app, server, io };
