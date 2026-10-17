"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Clock, User, AlertCircle, RotateCcw } from "lucide-react";
import type { KdsTicket } from "@/types/kds";
import { formatRupees } from "@/lib/formatters";

interface KdsTicketCardProps {
  ticket: KdsTicket;
  onMarkEntered?: (orderId: string) => void;
  onMarkServed?: (orderId: string) => void;
  onRecallToActive?: (orderId: string) => void;
  isHistorical?: boolean;
}

export default function KdsTicketCard({
  ticket,
  onMarkEntered,
  onMarkServed,
  onRecallToActive,
  isHistorical = false,
}: KdsTicketCardProps) {
  // Live elapsed time ticker
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    const placedTime = new Date(ticket.placedAt).getTime();
    const endTime = ticket.completedAt ? new Date(ticket.completedAt).getTime() : Date.now();
    return Math.max(0, Math.floor((endTime - placedTime) / 1000));
  });

  useEffect(() => {
    // If ticket is already completed or served, freeze elapsed time
    if (
      ticket.status === "SERVED" ||
      ticket.status === "ENTERED_INTO_POS" ||
      ticket.status === "COMPLETED" ||
      ticket.completedAt
    ) {
      return;
    }

    const interval = setInterval(() => {
      const placedTime = new Date(ticket.placedAt).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - placedTime) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [ticket.placedAt, ticket.status, ticket.completedAt]);

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeFormatted = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;

  // Urgency color coding
  let urgencyColor = "bg-emerald-950/60 text-emerald-300 border-emerald-500/40";
  let urgencyLabel = "COOKING";
  let cardBorder = "border-slate-800 hover:border-slate-700";

  const isServedOrDone =
    ticket.status === "SERVED" ||
    ticket.status === "ENTERED_INTO_POS" ||
    ticket.status === "COMPLETED" ||
    isHistorical;

  if (!isServedOrDone) {
    if (minutes >= 10) {
      urgencyColor = "bg-rose-950/80 text-rose-300 border-rose-500/60 animate-pulse";
      urgencyLabel = "URGENT";
      cardBorder = "border-rose-600/60 shadow-lg shadow-rose-950/50";
    } else if (minutes >= 5) {
      urgencyColor = "bg-amber-950/70 text-amber-300 border-amber-500/50";
      urgencyLabel = "PREPPING";
      cardBorder = "border-amber-600/50 shadow-md shadow-amber-950/30";
    }
  } else {
    urgencyColor = "bg-slate-800 text-slate-300 border-slate-700";
    urgencyLabel = ticket.status === "SERVED" ? "SERVED" : "COMPLETED";
    cardBorder = "border-slate-800 opacity-90";
  }

  const placedTimeDisplay = new Date(ticket.placedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const completedTimeDisplay = ticket.completedAt
    ? new Date(ticket.completedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col bg-slate-900/95 backdrop-blur-md rounded-2xl border-2 ${cardBorder} overflow-hidden shadow-xl select-none`}
    >
      {/* 1. Header: Table Number, Round Number, and Elapsed Timer */}
      <div className="p-3.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="bg-white text-slate-950 font-black text-base px-2.5 py-1 rounded-lg tracking-tight uppercase shadow-sm">
            Table {ticket.tableNumber}
          </div>
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider font-mono">
            Round {ticket.roundNumber}
          </span>
        </div>

        {/* Elapsed Timer Counter */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${urgencyColor}`}
          title={`Placed at ${placedTimeDisplay}`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{timeFormatted}</span>
          {urgencyLabel === "URGENT" && (
            <span className="text-[10px] font-black tracking-wider ml-0.5">!</span>
          )}
        </div>
      </div>

      {/* 2. Subheader Metadata */}
      <div className="px-3.5 py-1.5 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span className="truncate max-w-[150px]">#{ticket.orderId.slice(-8)}</span>
        <span>Placed {placedTimeDisplay}</span>
      </div>

      {/* 3. Body: Itemized Order List */}
      <div className="p-3.5 flex-1 divide-y divide-slate-800/80 space-y-3 overflow-y-auto max-h-[360px]">
        {ticket.items.map((item, idx) => {
          // Format modifiers if present
          const modifiers = item.selectedModifiers || {};
          const modifierEntries = Object.entries(modifiers).flatMap(([group, val]) => {
            if (Array.isArray(val)) {
              return val.map((v) => `${group}: ${v}`);
            }
            if (val) {
              return [`${group}: ${val}`];
            }
            return [];
          });

          return (
            <div key={item.id || idx} className={idx > 0 ? "pt-2.5" : ""}>
              {/* Item header with quantity and price */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="bg-amber-500 text-slate-950 font-black text-xs px-1.5 py-0.5 rounded shrink-0 font-mono mt-0.5">
                    {item.quantity}×
                  </span>
                  <span className="font-bold text-slate-100 text-sm leading-snug">
                    {item.name}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400 font-medium shrink-0">
                  {formatRupees((item.priceInRupees ?? item.priceInCents) * item.quantity)}
                </span>
              </div>

              {/* Modifiers List */}
              {modifierEntries.length > 0 && (
                <div className="ml-7 mt-1 space-y-0.5">
                  {modifierEntries.map((mod, modIdx) => (
                    <div
                      key={modIdx}
                      className="text-xs text-amber-200/90 font-medium flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>{mod}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Special Notes / Instructions */}
              {item.notes && (
                <div className="ml-7 mt-1.5 p-1.5 bg-amber-950/40 border border-amber-600/40 rounded-lg text-xs text-amber-200 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span className="font-medium italic">Note: {item.notes}</span>
                </div>
              )}

              {/* Guest Tag (who ordered this item) */}
              <div className="ml-7 mt-1.5 flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <User className="w-3 h-3 text-slate-500 shrink-0" />
                <span>
                  For{" "}
                  <strong className="text-slate-300">
                    {item.addedByUserName ||
                      (item as unknown as { addedByName?: string }).addedByName ||
                      "Guest"}
                  </strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Footer Summary & Action Button */}
      <div className="p-3.5 bg-slate-950/70 border-t border-slate-800 space-y-3">
        {/* Ticket Total Summary */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-0.5">
          <span>{ticket.items.reduce((acc, i) => acc + i.quantity, 0)} items</span>
          <span className="text-slate-200 font-bold font-mono text-sm">
            Total: {formatRupees(ticket.totalInCents)}
          </span>
        </div>

        {/* Action Button: Mark Cooked & Served vs Historical / Served Status */}
        {!isHistorical && ticket.status === "CONFIRMED" ? (
          <button
            type="button"
            onClick={() => (onMarkServed || onMarkEntered)?.(ticket.orderId)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm tracking-wide py-3 px-4 rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all duration-150"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>Mark Round Cooked & Served</span>
          </button>
        ) : (
          <div className="space-y-2">
            <div className="w-full py-2.5 px-3 bg-slate-800/80 border border-slate-700 rounded-xl text-center text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>
                {ticket.status === "SERVED"
                  ? `Cooked & Served ${completedTimeDisplay ? `at ${completedTimeDisplay}` : ""}`
                  : `Entered into POS ${completedTimeDisplay ? `at ${completedTimeDisplay}` : ""}`}
              </span>
            </div>

            {onRecallToActive && (
              <button
                type="button"
                onClick={() => onRecallToActive(ticket.orderId)}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-300 hover:text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recall to Cooking</span>
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
