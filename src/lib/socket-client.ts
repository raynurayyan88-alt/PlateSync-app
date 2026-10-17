"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocketClient(): Socket {
  if (!socket) {
    let serverUrl: string | undefined = undefined;

    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const isLocalhost =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "0.0.0.0";

      if (!isLocalhost) {
        // MOBILE / TUNNEL PROTECTION:
        // When opening over a Cloudflare Tunnel (*.trycloudflare.com), loca.lt, or mobile IP,
        // NEVER connect to http://localhost:3000 or http://localhost:3001 (even if NEXT_PUBLIC_WS_URL is set in .env).
        // Always connect directly to the current browser origin.
        serverUrl = window.location.origin;
      } else {
        serverUrl = process.env.NEXT_PUBLIC_WS_URL || window.location.origin;
      }
    } else {
      serverUrl = process.env.NEXT_PUBLIC_WS_URL;
    }

    socket = io(serverUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }

  return socket;
}
