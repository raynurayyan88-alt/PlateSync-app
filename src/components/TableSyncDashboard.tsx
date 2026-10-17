"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed,
  Users,
  Activity,
  Database,
  Server,
  ShoppingCart,
  Radio,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Terminal,
  Shield,
} from "lucide-react";
import { getSocketClient } from "@/lib/socket-client";
import { JoinTableSchema } from "@/lib/validations";

interface ParticipantNotification {
  id: string;
  message: string;
  timestamp: string;
  type: "join" | "leave" | "order" | "cart";
}

export default function PlateSyncDashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [tableJoined, setTableJoined] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [notifications, setNotifications] = useState<ParticipantNotification[]>([]);
  const [userName, setUserName] = useState("Alex (Table Lead)");
  const [tableNumber, setTableNumber] = useState(4);
  const [cartCount, setCartCount] = useState(0);
  const [isSimulatingCart, setIsSimulatingCart] = useState(false);

  useEffect(() => {
    const socket = getSocketClient();

    function onConnect() {
      setIsConnected(true);
      setSocketId(socket.id || null);
    }

    function onDisconnect() {
      setIsConnected(false);
      setSocketId(null);
      setTableJoined(false);
    }

    function onUserJoined(data: { userId: string; userName: string; participantCount: number }) {
      setParticipantCount(data.participantCount);
      addNotification(`${data.userName} joined the table!`, "join");
    }

    function onUserLeft(data: { userId: string; userName: string; participantCount: number }) {
      setParticipantCount(data.participantCount);
      addNotification(`${data.userName} left the table`, "leave");
    }

    function onCartUpdated(data: { userName: string; action: string; items: unknown[] }) {
      setCartCount(data.items.length);
      addNotification(`${data.userName} updated the shared cart (${data.action})`, "cart");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("table:user_joined", onUserJoined);
    socket.on("table:user_left", onUserLeft);
    socket.on("cart:updated", onCartUpdated);

    if (socket.connected) {
      queueMicrotask(() => {
        setIsConnected(true);
        setSocketId(socket.id || null);
      });
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("table:user_joined", onUserJoined);
      socket.off("table:user_left", onUserLeft);
      socket.off("cart:updated", onCartUpdated);
    };
  }, []);

  function addNotification(message: string, type: "join" | "leave" | "order" | "cart") {
    const newNotif: ParticipantNotification = {
      id: Math.random().toString(36).substring(7),
      message,
      timestamp: new Date().toLocaleTimeString(),
      type,
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);
  }

  const handleJoinTable = () => {
    const socket = getSocketClient();
    const payload = {
      tableId: `table-${tableNumber}`,
      userId: `user-${Date.now().toString(36)}`,
      userName: userName.trim() || "Guest Diner",
    };

    // Validate payload with Zod before emitting
    const validation = JoinTableSchema.safeParse(payload);
    if (!validation.success) {
      alert("Validation failed: " + validation.error.issues[0]?.message);
      return;
    }

    socket.emit("table:join", validation.data, (res: { success: boolean; participants: number; message: string }) => {
      if (res && res.success) {
        setTableJoined(true);
        setParticipantCount(res.participants);
        addNotification(`You joined Table #${tableNumber}`, "join");
      }
    });
  };

  const handleSimulateCartAction = () => {
    if (!tableJoined) {
      alert("Please join a table first!");
      return;
    }
    const socket = getSocketClient();
    setIsSimulatingCart(true);

    const newCount = cartCount + 1;
    setCartCount(newCount);

    socket.emit(
      "cart:update",
      {
        tableId: `table-${tableNumber}`,
        userId: "local-user",
        userName,
        action: "add",
        items: [
          {
            menuItemId: "item-101",
            name: "Truffle Parmesan Fries",
            price: 12.5,
            quantity: newCount,
            addedBy: userName,
          },
        ],
      },
      () => {
        setIsSimulatingCart(false);
      }
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10 space-y-8 bg-[#FAF9F6] text-[#1C1917]">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#E7E5E4]"
      >
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            PlateSync Live Infrastructure Active
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1C1917] flex items-center gap-3">
            <span>PlateSync</span>
            <UtensilsCrossed className="w-8 h-8 text-stone-800" />
          </h1>
          <p className="text-stone-500 text-sm md:text-base max-w-xl">
            Real-time multiplayer restaurant ordering architecture powered by Next.js App Router, Express, Socket.IO, Redis, and Prisma.
          </p>
        </div>

        {/* WebSocket Live Status Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white border border-[#E7E5E4] p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-3 w-3">
              {isConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-[#111827]">
                {isConnected ? "Socket.IO Online" : "Connecting to Socket..."}
              </div>
              <div className="text-[11px] text-[#6B7280] font-mono">
                {socketId ? `ID: ${socketId.substring(0, 10)}...` : "WebSocket"}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Grid of Scaffolding Stack Items */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Next.js & TypeScript */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <Server className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active
            </span>
          </div>
          <h3 className="font-semibold text-[#111827] text-base">Next.js App Router</h3>
          <p className="text-[#6B7280] text-xs">
            Full-stack React 19 framework configured with TypeScript & Tailwind CSS.
          </p>
        </div>

        {/* Express + Socket.IO */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Radio className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Port 3001
            </span>
          </div>
          <h3 className="font-semibold text-[#111827] text-base">Express + Socket.IO</h3>
          <p className="text-[#6B7280] text-xs">
            Real-time WebSocket server managing room synchronization and live table carts.
          </p>
        </div>

        {/* Prisma ORM */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Database className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Generated
            </span>
          </div>
          <h3 className="font-semibold text-[#111827] text-base">Prisma ORM</h3>
          <p className="text-[#6B7280] text-xs">
            PostgreSQL schema for Restaurants, Tables, Sessions, Menu Items, and Orders.
          </p>
        </div>

        {/* Redis & Zod */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <Shield className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Configured
            </span>
          </div>
          <h3 className="font-semibold text-[#111827] text-base">ioredis & Zod</h3>
          <p className="text-[#6B7280] text-xs">
            Resilient Redis client singleton & robust schema validation for table actions.
          </p>
        </div>
      </motion.div>

      {/* Interactive Real-Time Sync Sandbox */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Interactive Controls */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-3xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Live Table Simulator
              </h2>
              <p className="text-xs text-[#6B7280] mt-1">
                Test real-time events sent to the Socket.IO server running on port 3001.
              </p>
            </div>
            {tableJoined && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Table #{tableNumber} Connected
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Diner Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                disabled={tableJoined}
                className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#111827] transition-colors disabled:opacity-50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Table Number</label>
              <input
                type="number"
                value={tableNumber}
                onChange={(e) => setTableNumber(parseInt(e.target.value) || 1)}
                disabled={tableJoined}
                min={1}
                max={50}
                className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#111827] transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {!tableJoined ? (
              <button
                onClick={handleJoinTable}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111827] hover:bg-black text-white font-semibold text-sm transition-all shadow-sm active:scale-95"
              >
                <Users className="w-4 h-4" />
                Join Table #{tableNumber} (Emit table:join)
              </button>
            ) : (
              <>
                <button
                  onClick={handleSimulateCartAction}
                  disabled={isSimulatingCart}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Broadcast Cart Item (Emit cart:update)
                </button>
                <button
                  onClick={() => {
                    setTableJoined(false);
                    setCartCount(0);
                    addNotification(`Left Table #${tableNumber}`, "leave");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#374151] font-medium text-sm transition-colors"
                >
                  Leave Table
                </button>
              </>
            )}
          </div>

          {/* Table Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-[#E5E7EB]">
            <div className="bg-[#FAFAFA] p-3 rounded-xl border border-[#E5E7EB]">
              <span className="text-[11px] text-[#6B7280] block">Participants at Table</span>
              <span className="text-xl font-bold text-[#111827]">{tableJoined ? participantCount : "-"}</span>
            </div>
            <div className="bg-[#FAFAFA] p-3 rounded-xl border border-[#E5E7EB]">
              <span className="text-[11px] text-[#6B7280] block">Synced Cart Items</span>
              <span className="text-xl font-bold text-emerald-600">{cartCount}</span>
            </div>
            <div className="bg-[#FAFAFA] p-3 rounded-xl border border-[#E5E7EB] col-span-2 sm:col-span-1">
              <span className="text-[11px] text-[#6B7280] block">Transport Mode</span>
              <span className="text-xs font-mono font-medium text-emerald-700 block mt-1.5">
                WebSocket + Polling
              </span>
            </div>
          </div>
        </div>

        {/* Live Event Stream Feed */}
        <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                <Terminal className="w-4 h-4 text-gray-500" />
                Live Event Stream
              </h3>
              <span className="text-[10px] text-[#6B7280] font-mono">Real-time</span>
            </div>

            <div className="space-y-2 mt-4 min-h-[160px]">
              <AnimatePresence>
                {notifications.length === 0 ? (
                  <div className="text-center py-10 text-[#9CA3AF] text-xs">
                    No socket events emitted yet. Join a table to stream events!
                  </div>
                ) : (
                  notifications.map((n) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-2.5 rounded-xl bg-[#FAFAFA] border border-[#E5E7EB] text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {n.type === "join" && <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        {n.type === "leave" && <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                        {n.type === "cart" && <ShoppingCart className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        {n.type === "order" && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                        <span className="text-[#111827] font-medium">{n.message}</span>
                      </div>
                      <span className="text-[10px] text-[#6B7280] font-mono">{n.timestamp}</span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] text-[11px] text-[#6B7280]">
            Single dev command: <code className="text-[#111827] font-mono font-semibold">npm run dev</code>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export { PlateSyncDashboard as TableSyncDashboard };
