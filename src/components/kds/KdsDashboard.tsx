"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChefHat,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Clock,
  Filter,
  UtensilsCrossed,
  Receipt,
  History,
  CreditCard,
} from "lucide-react";
import { getSocketClient } from "@/lib/socket-client";
import { kdsChime } from "@/lib/audioChime";
import type { KdsTicket, CompletedTableBill, CashierBill } from "@/types/kds";
import type { TableSession } from "@/server/sessionStore";
import KdsTicketCard from "./KdsTicketCard";
import CashierBillCard from "./CashierBillCard";

interface KdsDashboardProps {
  restaurantSlug: string;
  restaurantName: string;
  initialTickets?: KdsTicket[];
}

export default function KdsDashboard({
  restaurantSlug,
  restaurantName,
  initialTickets = [],
}: KdsDashboardProps) {
  // Main view modes: "kitchen" (Live Tickets) vs "cashier" (Consolidated Master Bills) vs "completedBills"
  const [mainMode, setMainMode] = useState<"kitchen" | "cashier" | "completedBills">("kitchen");

  // Kitchen sub-tabs: active cooking vs served/history
  const [kitchenSubTab, setKitchenSubTab] = useState<"active" | "served">("active");

  // Ticket collections
  const [tickets, setTickets] = useState<KdsTicket[]>(initialTickets);

  // Active table sessions for Cashier Billing
  const [tableSessions, setTableSessions] = useState<TableSession[]>([]);

  // Consolidated Cashier Bills (both AWAITING_PAYMENT and DINING)
  const [cashierBills, setCashierBills] = useState<CashierBill[]>([]);

  // Settled / Completed Bills history
  const [completedBills, setCompletedBills] = useState<CompletedTableBill[]>([]);

  // Selected table filter ("all" or table number)
  const [selectedTable, setSelectedTable] = useState<string>("all");

  // Live clock
  const [currentTime, setCurrentTime] = useState<string>("");

  // Sound chime state
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Socket connection status
  const [isConnected, setIsConnected] = useState(false);

  // Digital clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Fetch initial data via API on mount + 2.5s continuous polling backup
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const res = await fetch(`/api/kds/${encodeURIComponent(restaurantSlug)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && isMounted) {
            if (Array.isArray(data.tickets)) {
              setTickets((prev) => {
                const combined = [...prev];
                let hasChanged = false;
                for (const t of data.tickets as KdsTicket[]) {
                  const existingIndex = combined.findIndex((item) => item.orderId === t.orderId);
                  if (existingIndex === -1) {
                    combined.push(t);
                    hasChanged = true;
                  } else if (combined[existingIndex].status !== t.status) {
                    combined[existingIndex] = t;
                    hasChanged = true;
                  }
                }
                return hasChanged ? combined : prev;
              });
            }

            if (Array.isArray(data.activeTableSessions)) {
              setTableSessions(data.activeTableSessions);
            }

            if (Array.isArray(data.cashierBills)) {
              setCashierBills(data.cashierBills);
            }

            if (Array.isArray(data.completedBills)) {
              setCompletedBills(data.completedBills);
            }
          }
        }
      } catch (err) {
        console.warn("[KDS] Error polling data via API:", err);
      }
    }

    loadData();
    const interval = setInterval(loadData, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [restaurantSlug]);

  // Socket.IO event listener for room:kds:{slug}
  useEffect(() => {
    const socket = getSocketClient();

    function onConnect() {
      setIsConnected(true);
      console.log(`[KDS] Connected to socket server. Joining room:kds:${restaurantSlug}`);

      socket.emit(
        "JOIN_KDS",
        { restaurantSlug },
        (res: { success?: boolean; tickets?: KdsTicket[] }) => {
          if (res?.success && Array.isArray(res.tickets)) {
            setTickets((prev) => {
              const map = new Map<string, KdsTicket>();
              prev.forEach((t) => map.set(t.orderId, t));
              res.tickets?.forEach((t) => map.set(t.orderId, t));
              return Array.from(map.values());
            });
          }
        }
      );
    }

    function onDisconnect() {
      setIsConnected(false);
      console.log("[KDS] Disconnected from socket server.");
    }

    // Real-time new ticket arrived
    function onNewOrderTicket(ticket: KdsTicket) {
      console.log("[KDS] 🛎️ NEW ORDER TICKET ARRIVED:", ticket);
      kdsChime.playNewOrderChime();

      setTickets((prev) => {
        if (prev.some((t) => t.orderId === ticket.orderId)) {
          return prev.map((t) => (t.orderId === ticket.orderId ? ticket : t));
        }
        return [ticket, ...prev];
      });
    }

    // Real-time status update
    function onOrderStatusChanged(data: {
      orderId: string;
      status: string;
      completedAt?: string;
    }) {
      setTickets((prev) =>
        prev.map((t) =>
          t.orderId === data.orderId
            ? { ...t, status: data.status, completedAt: data.completedAt || t.completedAt }
            : t
        )
      );
    }

    // Real-time cashier bill settlement
    function onTableBillSettled(data: {
      tableNumber: number;
      diningSessionId?: string;
      bill?: CompletedTableBill | CashierBill;
      newSession?: TableSession;
    }) {
      console.log("[KDS] 💳 Table bill settled:", data);
      if (data.bill) {
        const rawBill = data.bill;
        const billId = "billId" in rawBill && typeof rawBill.billId === "string" ? rawBill.billId : undefined;
        const guests =
          "guests" in rawBill && Array.isArray(rawBill.guests)
            ? rawBill.guests
            : "guestNames" in rawBill && Array.isArray(rawBill.guestNames)
            ? rawBill.guestNames
            : [];
        const guestNames =
          "guestNames" in rawBill && Array.isArray(rawBill.guestNames)
            ? rawBill.guestNames
            : guests;

        const archivedBill: CompletedTableBill = {
          billId,
          diningSessionId: rawBill.diningSessionId,
          restaurantSlug,
          tableNumber: rawBill.tableNumber,
          guests,
          guestNames,
          rounds: rawBill.rounds || [],
          grandTotalInRupees: rawBill.grandTotalInRupees || 0,
          grandTotalInCents: rawBill.grandTotalInCents || 0,
          closedAt: rawBill.closedAt || new Date().toISOString(),
          billStatus: "PAID",
        };
        setCompletedBills((prev) => [archivedBill, ...prev]);

        if (billId) {
          setCashierBills((prev) => prev.filter((b) => b.billId !== billId));
        } else if (data.diningSessionId) {
          setCashierBills((prev) => prev.filter((b) => b.diningSessionId !== data.diningSessionId));
        }
      }
      if (data.newSession) {
        setTableSessions((prev) => {
          const idx = prev.findIndex((s) => s.tableNumber === data.tableNumber);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = data.newSession!;
            return updated;
          }
          return [...prev, data.newSession!];
        });
      }
    }

    // Real-time bill status updates (AWAITING_PAYMENT / DINING sync)
    function onBillStatusUpdated(data: {
      cashierBills?: CashierBill[];
      bill?: CashierBill;
      activeTableSessions?: TableSession[];
    }) {
      console.log("[KDS] 📋 Bill status updated:", data);
      if (Array.isArray(data.cashierBills)) {
        setCashierBills(data.cashierBills);
      } else if (data.bill) {
        setCashierBills((prev) => {
          const idx = prev.findIndex((b) => b.billId === data.bill!.billId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = data.bill!;
            return updated;
          }
          return [data.bill!, ...prev];
        });
      }
      if (Array.isArray(data.activeTableSessions)) {
        setTableSessions(data.activeTableSessions);
      }
    }

    if (socket.connected) {
      onConnect();
    } else {
      socket.connect();
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("NEW_ORDER_TICKET", onNewOrderTicket);
    socket.on("KDS_ORDER_STATUS_CHANGED", onOrderStatusChanged);
    socket.on("TABLE_BILL_SETTLED", onTableBillSettled);
    socket.on("BILL_STATUS_UPDATED", onBillStatusUpdated);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("NEW_ORDER_TICKET", onNewOrderTicket);
      socket.off("KDS_ORDER_STATUS_CHANGED", onOrderStatusChanged);
      socket.off("TABLE_BILL_SETTLED", onTableBillSettled);
      socket.off("BILL_STATUS_UPDATED", onBillStatusUpdated);
    };
  }, [restaurantSlug]);

  // Audio unlock on user interaction
  const handleUserGesture = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      kdsChime.unlockAudio();
    }
  }, [hasInteracted]);

  // Toggle Mute
  const toggleSound = useCallback(() => {
    handleUserGesture();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    kdsChime.setMuted(nextMuted);
    if (!nextMuted) {
      kdsChime.playNewOrderChime();
    }
  }, [handleUserGesture, isMuted]);

  // Toggle Fullscreen
  const toggleFullscreen = useCallback(() => {
    handleUserGesture();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, [handleUserGesture]);

  // Action: Mark Round Cooked & Served
  const handleMarkServed = useCallback(
    (orderId: string) => {
      handleUserGesture();
      const completedAt = new Date().toISOString();

      setTickets((prev) =>
        prev.map((t) =>
          t.orderId === orderId ? { ...t, status: "SERVED", completedAt } : t
        )
      );

      const socket = getSocketClient();
      if (socket.connected) {
        socket.emit("KDS_UPDATE_ORDER_STATUS", {
          restaurantSlug,
          orderId,
          status: "SERVED",
        });
      }

      fetch(`/api/kds/${encodeURIComponent(restaurantSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_TICKET_STATUS",
          orderId,
          status: "SERVED",
        }),
      }).catch(() => {});
    },
    [handleUserGesture, restaurantSlug]
  );

  // Action: Recall to Cooking
  const handleRecallToActive = useCallback(
    (orderId: string) => {
      handleUserGesture();

      setTickets((prev) =>
        prev.map((t) =>
          t.orderId === orderId
            ? { ...t, status: "CONFIRMED", completedAt: undefined }
            : t
        )
      );

      const socket = getSocketClient();
      if (socket.connected) {
        socket.emit("KDS_UPDATE_ORDER_STATUS", {
          restaurantSlug,
          orderId,
          status: "CONFIRMED",
        });
      }

      fetch(`/api/kds/${encodeURIComponent(restaurantSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_TICKET_STATUS",
          orderId,
          status: "CONFIRMED",
        }),
      }).catch(() => {});
    },
    [handleUserGesture, restaurantSlug]
  );

  // Action: Mark Bill Paid & Archive (Handles independent bills per table)
  const handleMarkBillPaid = useCallback(
    async (billId: string, _tableNumber: number) => {
      handleUserGesture();

      const targetBill = cashierBills.find((b) => b.billId === billId);

      // Optimistically create completed bill
      if (targetBill) {
        const archivedBill: CompletedTableBill = {
          billId: targetBill.billId,
          diningSessionId: targetBill.diningSessionId,
          restaurantSlug,
          tableNumber: targetBill.tableNumber,
          guests: targetBill.guestNames || [],
          guestNames: targetBill.guestNames || [],
          rounds: targetBill.rounds || [],
          grandTotalInRupees: targetBill.grandTotalInRupees || 0,
          grandTotalInCents: targetBill.grandTotalInCents || 0,
          closedAt: new Date().toISOString(),
          billStatus: "PAID",
        };
        setCompletedBills((prev) => [archivedBill, ...prev]);
      }

      // Optimistically remove from cashierBills
      setCashierBills((prev) => prev.filter((b) => b.billId !== billId));

      // If this bill belonged to active table session, remove or reset
      if (targetBill && targetBill.billStatus === "DINING") {
        setTableSessions((prev) => prev.filter((s) => s.diningSessionId !== targetBill.diningSessionId));
      }

      // Mark local tickets for this dining session as COMPLETED
      if (targetBill) {
        setTickets((prev) =>
          prev.map((t) =>
            t.diningSessionId === targetBill.diningSessionId ? { ...t, status: "COMPLETED" } : t
          )
        );
      }

      const socket = getSocketClient();
      if (socket.connected) {
        socket.emit("MARK_BILL_PAID", { restaurantSlug, billId });
      }

      try {
        await fetch(`/api/kds/${encodeURIComponent(restaurantSlug)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "MARK_BILL_PAID",
            billId,
          }),
        });
      } catch (err) {
        console.warn("[KDS] Error marking bill paid via API:", err);
      }
    },
    [handleUserGesture, cashierBills, restaurantSlug]
  );

  // Action: Bill Paid & Reset Table for Next Guests
  const handleCloseAndResetTable = useCallback(
    async (tableNumber: number) => {
      handleUserGesture();

      // Find current table session
      const targetSession = tableSessions.find((s) => s.tableNumber === tableNumber);

      // Optimistically create completed bill
      if (targetSession && (targetSession.submittedRounds?.length > 0 || targetSession.cart?.length > 0)) {
        const archivedBill: CompletedTableBill = {
          diningSessionId: targetSession.diningSessionId,
          restaurantSlug,
          tableNumber,
          guests: targetSession.users.map((u) => u.name),
          rounds: [...(targetSession.submittedRounds || [])],
          grandTotalInRupees: targetSession.tableGrandTotalInRupees || 0,
          grandTotalInCents: targetSession.tableGrandTotalInCents || 0,
          closedAt: new Date().toISOString(),
        };
        setCompletedBills((prev) => [archivedBill, ...prev]);
      }

      // Optimistically remove / reset table session
      setTableSessions((prev) => prev.filter((s) => s.tableNumber !== tableNumber));

      // Mark local tickets for this table as COMPLETED
      setTickets((prev) =>
        prev.map((t) => (t.tableNumber === tableNumber ? { ...t, status: "COMPLETED" } : t))
      );

      const socket = getSocketClient();
      if (socket.connected) {
        socket.emit("CLOSE_AND_RESET_TABLE", { restaurantSlug, tableNumber });
      }

      try {
        await fetch(`/api/kds/${encodeURIComponent(restaurantSlug)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CLOSE_AND_RESET_TABLE",
            tableNumber,
          }),
        });
      } catch (err) {
        console.warn("[KDS] Error closing table via API:", err);
      }
    },
    [handleUserGesture, restaurantSlug, tableSessions]
  );

  // Categorize active cooking tickets vs served tickets
  const activeTickets = useMemo(() => {
    return tickets.filter((t) => t.status === "CONFIRMED");
  }, [tickets]);

  const servedTickets = useMemo(() => {
    return tickets.filter(
      (t) => t.status === "SERVED" || t.status === "ENTERED_INTO_POS"
    );
  }, [tickets]);

  // Unique table numbers for filter dropdown
  const availableTables = useMemo(() => {
    const list = Array.from(new Set(tickets.map((t) => t.tableNumber)));
    return list.sort((a, b) => a - b);
  }, [tickets]);

  // Filtered kitchen tickets list
  const displayedKitchenTickets = useMemo(() => {
    const currentList = kitchenSubTab === "active" ? activeTickets : servedTickets;
    if (selectedTable === "all") {
      return currentList;
    }
    const tableNum = parseInt(selectedTable, 10);
    return currentList.filter((t) => t.tableNumber === tableNum);
  }, [kitchenSubTab, activeTickets, servedTickets, selectedTable]);

  // Combine active table sessions with any tables having active orders
  const activeSessionsWithTickets = useMemo(() => {
    const map = new Map<number, TableSession>();

    for (const s of tableSessions) {
      if ((s.submittedRounds && s.submittedRounds.length > 0) || s.cart?.length > 0 || s.users?.length > 0) {
        map.set(s.tableNumber, { ...s });
      }
    }

    for (const t of tickets) {
      if (t.status !== "COMPLETED" && t.status !== "ARCHIVED") {
        const existing = map.get(t.tableNumber);
        const itemRupees = t.items.reduce(
          (sum, i) => sum + (i.priceInRupees ?? Math.round(i.priceInCents / 100)) * i.quantity,
          0
        );

        if (!existing) {
          map.set(t.tableNumber, {
            diningSessionId: t.diningSessionId || `sess_${t.tableNumber}`,
            restaurantSlug,
            tableNumber: t.tableNumber,
            users: t.approvedBy?.map((name) => ({ id: name, name })) || [],
            cart: [],
            consensusVotes: {},
            roundNumber: t.roundNumber,
            status: "IDLE",
            submittedRounds: [
              {
                roundNumber: t.roundNumber,
                orderId: t.orderId,
                items: t.items,
                roundTotalInRupees: itemRupees,
                roundTotalInCents: t.totalInCents,
                placedAt: t.placedAt,
                approvedBy: t.approvedBy,
              },
            ],
            tableGrandTotalInRupees: itemRupees,
            tableGrandTotalInCents: t.totalInCents,
            createdAt: t.placedAt ? new Date(t.placedAt).getTime() : 0,
            updatedAt: t.placedAt ? new Date(t.placedAt).getTime() : 0,
          });
        } else {
          const roundExists = existing.submittedRounds?.some((r) => r.orderId === t.orderId);
          if (!roundExists) {
            existing.submittedRounds = [
              ...(existing.submittedRounds || []),
              {
                roundNumber: t.roundNumber,
                orderId: t.orderId,
                items: t.items,
                roundTotalInRupees: itemRupees,
                roundTotalInCents: t.totalInCents,
                placedAt: t.placedAt,
                approvedBy: t.approvedBy,
              },
            ];
            existing.tableGrandTotalInRupees = (existing.tableGrandTotalInRupees || 0) + itemRupees;
            existing.tableGrandTotalInCents = (existing.tableGrandTotalInCents || 0) + t.totalInCents;
          }
        }
      }
    }

    const result = Array.from(map.values());
    if (selectedTable !== "all") {
      const num = parseInt(selectedTable, 10);
      return result.filter((s) => s.tableNumber === num);
    }
    return result.sort((a, b) => a.tableNumber - b.tableNumber);
  }, [tableSessions, tickets, restaurantSlug, selectedTable]);

  // Consolidated Cashier Bills: Awaiting payment at counter + currently dining
  const displayedCashierBills = useMemo(() => {
    let list: CashierBill[] = [];

    if (cashierBills.length > 0) {
      list = [...cashierBills];
    } else {
      // Fallback from activeSessionsWithTickets
      list = activeSessionsWithTickets.map((s) => ({
        billId: `BILL-${s.tableNumber}-${s.diningSessionId?.slice(-6) || "LIVE"}`,
        diningSessionId: s.diningSessionId,
        restaurantSlug: s.restaurantSlug,
        tableNumber: s.tableNumber,
        guestNames: s.users.map((u) => u.name),
        rounds: s.submittedRounds || [],
        grandTotalInRupees: s.tableGrandTotalInRupees || 0,
        grandTotalInCents: s.tableGrandTotalInCents || 0,
        billStatus: (s.status === "AWAITING_PAYMENT" ? "AWAITING_PAYMENT" : "DINING") as "AWAITING_PAYMENT" | "DINING",
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date(0).toISOString(),
      }));
    }

    if (selectedTable !== "all") {
      const num = parseInt(selectedTable, 10);
      list = list.filter((b) => b.tableNumber === num);
    }

    // Sort: Awaiting payment at counter first (Amber alert), then by table number
    return list.sort((a, b) => {
      if (a.billStatus === "AWAITING_PAYMENT" && b.billStatus !== "AWAITING_PAYMENT") return -1;
      if (b.billStatus === "AWAITING_PAYMENT" && a.billStatus !== "AWAITING_PAYMENT") return 1;
      return a.tableNumber - b.tableNumber;
    });
  }, [cashierBills, activeSessionsWithTickets, selectedTable]);

  // Total active dining revenue in ₹
  const totalActiveRevenue = useMemo(() => {
    return displayedCashierBills.reduce(
      (sum, s) => sum + (s.grandTotalInRupees || 0),
      0
    );
  }, [displayedCashierBills]);

  // Count of bills awaiting payment at the counter
  const awaitingPaymentCount = useMemo(() => {
    return displayedCashierBills.filter((b) => b.billStatus === "AWAITING_PAYMENT").length;
  }, [displayedCashierBills]);

  return (
    <div
      onClick={handleUserGesture}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none"
    >
      {/* =========================================================================
          1. KDS TOP HEADER BAR
         ========================================================================= */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-md z-30">
        {/* Left: Branding, Room, Connection Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-md">
            <ChefHat className="w-6 h-6 stroke-[2.2]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white uppercase">
                {restaurantName}
              </h1>
              <span className="bg-slate-800 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                KDS & Cashier
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
              <span>room:kds:{restaurantSlug}</span>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
                  }`}
                />
                <span
                  className={`text-[11px] font-bold ${
                    isConnected ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isConnected ? "LIVE" : "CONNECTING..."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Live Digital Clock */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl shadow-inner font-mono text-sm tracking-wider font-bold text-slate-200">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>{currentTime || "--:--:--"}</span>
        </div>

        {/* Right Controls: Audio chime, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Audio Chime Notification Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              !isMuted
                ? "bg-slate-800 border-emerald-500/50 text-emerald-300 hover:bg-slate-700"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800"
            }`}
            title={!isMuted ? "Sound chime enabled." : "Sound chime muted."}
          >
            {!isMuted ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="hidden md:inline">Chime: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span className="hidden md:inline">Muted</span>
              </>
            )}
          </button>

          {/* Fullscreen Mode Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden lg:inline">{isFullscreen ? "Exit" : "Fullscreen"}</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. DUAL-MODE SWITCHER BAR: Kitchen Rounds vs Cashier Table Bills
         ========================================================================= */}
      <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Main Mode Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          {/* Mode 1: Live Kitchen Tickets */}
          <button
            type="button"
            onClick={() => setMainMode("kitchen")}
            className={`px-3.5 py-2 rounded-lg text-xs font-black tracking-wide uppercase transition-all cursor-pointer flex items-center gap-2 ${
              mainMode === "kitchen"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Kitchen Rounds</span>
            <span
              className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded-full ${
                mainMode === "kitchen"
                  ? "bg-slate-950 text-amber-300"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {activeTickets.length}
            </span>
          </button>

          {/* Mode 2: Cashier Table Bills */}
          <button
            type="button"
            onClick={() => setMainMode("cashier")}
            className={`px-3.5 py-2 rounded-lg text-xs font-black tracking-wide uppercase transition-all cursor-pointer flex items-center gap-2 ${
              mainMode === "cashier"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Cashier Table Bills</span>
            <span
              className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded-full ${
                awaitingPaymentCount > 0
                  ? "bg-amber-400 text-amber-950 animate-pulse font-bold"
                  : mainMode === "cashier"
                  ? "bg-slate-950 text-emerald-300"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {displayedCashierBills.length}
            </span>
          </button>

          {/* Mode 3: Completed Bills History */}
          <button
            type="button"
            onClick={() => setMainMode("completedBills")}
            className={`px-3 py-2 rounded-lg text-xs font-black tracking-wide uppercase transition-all cursor-pointer flex items-center gap-2 ${
              mainMode === "completedBills"
                ? "bg-slate-700 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Completed Bills</span>
            <span
              className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded-full ${
                mainMode === "completedBills"
                  ? "bg-slate-950 text-white"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {completedBills.length}
            </span>
          </button>
        </div>

        {/* Filters and Context Metrics */}
        <div className="flex items-center gap-3">
          {/* If Kitchen mode, show Active vs Served sub-toggle */}
          {mainMode === "kitchen" && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setKitchenSubTab("active")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  kitchenSubTab === "active"
                    ? "bg-slate-800 text-amber-300 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Cooking ({activeTickets.length})
              </button>
              <button
                type="button"
                onClick={() => setKitchenSubTab("served")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  kitchenSubTab === "served"
                    ? "bg-slate-800 text-emerald-300 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Cooked & Served ({servedTickets.length})
              </button>
            </div>
          )}

          {/* If Cashier mode, show total unpaid dining total */}
          {mainMode === "cashier" && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs font-mono">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-bold">
                Unpaid Dining Total: ₹{totalActiveRevenue.toLocaleString("en-IN")}
              </span>
            </div>
          )}

          {/* Table filter */}
          {availableTables.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-semibold text-slate-400">Table:</span>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-slate-200">
                  All
                </option>
                {availableTables.map((num) => (
                  <option key={num} value={num.toString()} className="bg-slate-900 text-slate-200">
                    Table {num}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          3. MAIN VIEW DISPLAY AREA
         ========================================================================= */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {/* VIEW 1: LIVE KITCHEN TICKETS (BY ROUND) */}
        {mainMode === "kitchen" && (
          <>
            {displayedKitchenTickets.length === 0 ? (
              <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shadow-inner">
                  {kitchenSubTab === "active" ? (
                    <UtensilsCrossed className="w-10 h-10 text-slate-600" />
                  ) : (
                    <CheckCircle2 className="w-10 h-10 text-slate-600" />
                  )}
                </div>
                <div className="max-w-md space-y-1">
                  <h2 className="text-lg font-bold text-slate-200">
                    {kitchenSubTab === "active" ? "All Caught Up!" : "No Cooked Rounds Yet"}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {kitchenSubTab === "active"
                      ? "No active cooking rounds on the kitchen board right now. New guest table rounds will chime and appear here in real-time."
                      : "Rounds marked cooked and served will appear in this history view."}
                  </p>
                </div>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 items-start"
              >
                <AnimatePresence mode="popLayout">
                  {displayedKitchenTickets.map((ticket) => (
                    <KdsTicketCard
                      key={ticket.orderId}
                      ticket={ticket}
                      onMarkServed={handleMarkServed}
                      onMarkEntered={handleMarkServed}
                      onRecallToActive={kitchenSubTab === "served" ? handleRecallToActive : undefined}
                      isHistorical={kitchenSubTab === "served"}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}

        {/* VIEW 2: ACTIVE TABLES & CASHIER BILLING */}
        {mainMode === "cashier" && (
          <>
            {displayedCashierBills.length === 0 ? (
              <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shadow-inner">
                  <Receipt className="w-10 h-10 text-slate-600" />
                </div>
                <div className="max-w-md space-y-1">
                  <h2 className="text-lg font-bold text-slate-200">No Active Dining Bills</h2>
                  <p className="text-sm text-slate-400">
                    All tables are currently unoccupied or have been settled. When guests join tables and order rounds, their consolidated master bills appear here ready for cashier settlement.
                  </p>
                </div>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-start"
              >
                <AnimatePresence mode="popLayout">
                  {displayedCashierBills.map((bill) => (
                    <CashierBillCard
                      key={bill.billId || `${bill.restaurantSlug}-${bill.tableNumber}-${bill.diningSessionId}`}
                      bill={bill}
                      restaurantName={restaurantName}
                      onMarkBillPaid={handleMarkBillPaid}
                      onCloseAndResetTable={handleCloseAndResetTable}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}

        {/* VIEW 3: COMPLETED BILLS HISTORY */}
        {mainMode === "completedBills" && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>Settled Bills & Turnover Archive</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">
                {completedBills.length} settled {completedBills.length === 1 ? "bill" : "bills"}
              </span>
            </div>

            {completedBills.length === 0 ? (
              <div className="min-h-[40vh] flex flex-col items-center justify-center text-center p-8 text-slate-400 text-sm">
                <Receipt className="w-12 h-12 mb-3 text-slate-700" />
                <p>No settled table bills yet during this session.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedBills.map((bill, index) => {
                  const closedTime = new Date(bill.closedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const closedDate = new Date(bill.closedAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div
                      key={bill.diningSessionId || index}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="bg-white text-slate-950 font-black text-sm px-2.5 py-0.5 rounded-lg uppercase">
                            Table {bill.tableNumber}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            #{bill.diningSessionId.slice(-6)}
                          </span>
                          <span className="text-xs text-slate-400">
                            {closedDate} at {closedTime}
                          </span>
                        </div>

                        {bill.guests && bill.guests.length > 0 && (
                          <div className="text-xs text-slate-400">
                            Guests: <span className="text-slate-300">{bill.guests.join(", ")}</span>
                          </div>
                        )}

                        <div className="text-xs text-slate-500 font-mono">
                          {bill.rounds?.length || 0} round{(bill.rounds?.length || 0) !== 1 ? "s" : ""} settled
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1 justify-end">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>PAID</span>
                        </div>
                        <div className="text-2xl font-black font-mono text-white tracking-tight mt-0.5">
                          ₹{(bill.grandTotalInRupees || 0).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
