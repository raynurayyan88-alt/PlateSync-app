import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { registerSocketHandlers } from "./src/server/socketHandlers";
import { registerSocketHandlers as registerLegacySocketHandlers } from "./server/events";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "./server/types";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

nextApp
  .prepare()
  .then(() => {
    // 1. Create the unified HTTP server for Next.js & Socket.IO on port 3000
    const server = http.createServer((req, res) => {
      try {
        const parsedUrl = parse(req.url || "", true);
        handle(req, res, parsedUrl);
      } catch (err) {
        console.error("[Custom Server] Error handling HTTP request:", err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    });

    // 2. Attach Socket.IO to the exact same HTTP server
    // CRITICAL: destroyUpgrade: false ensures Engine.IO does NOT terminate non-Socket.IO upgrades
    const io = new SocketIOServer<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >(server, {
      path: "/socket.io",
      destroyUpgrade: false,
      cors: {
        origin: (_origin, callback) => {
          // Allow all origins including Cloudflare Tunnel (*.trycloudflare.com), loca.lt, and localhost
          callback(null, true);
        },
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 20000,
      pingInterval: 25000,
    });

    // 3. Register real-time event handlers
    registerSocketHandlers(io);
    registerLegacySocketHandlers(io);

    // 4. WebSocket Upgrade Handling
    // Socket.IO intercepts `/socket.io`. Next.js handles all other upgrades (e.g. `/_next/hmr`).
    const upgradeHandler = nextApp.getUpgradeHandler();

    server.on("upgrade", (req, socket, head) => {
      const parsedUrl = parse(req.url || "", true);
      const pathname = parsedUrl.pathname || "";

      // Ignore Socket.IO requests as Engine.IO handles them directly
      if (pathname.startsWith("/socket.io")) {
        return;
      }

      // Pass Next.js HMR and other WebSocket upgrades cleanly to Next.js without crashing
      if (upgradeHandler) {
        upgradeHandler(req, socket, head);
      }
    });

    // 5. Start listening on unified port
    server.listen(port, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 TableSync Unified Next.js + Socket.IO Server Running`);
      console.log(`🌐 URL: http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`);
      console.log(`📡 WebSocket: /socket.io (same port ${port})`);
      console.log(`☁️ Cloudflare Tunnel Ready: *.trycloudflare.com supported`);
      console.log(`======================================================\n`);
    });
  })
  .catch((err) => {
    console.error("[Custom Server] Fatal error during startup:", err);
    process.exit(1);
  });
