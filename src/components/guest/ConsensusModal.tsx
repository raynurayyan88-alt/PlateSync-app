"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  UtensilsCrossed,
} from "lucide-react";
import type { TableSession, SessionUser, CartItem } from "@/server/sessionStore";
import { formatRupees } from "@/lib/formatters";
import { buildTableColorMap, getGuestSignatureColor, PaletteColor } from "@/lib/palette";
import ReceiptEdge from "@/components/ui/ReceiptEdge";

interface ConsensusModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TableSession;
  currentUserId: string;
  restaurantName: string;
  onSubmitApproval: () => void;
  lastPlacedOrder: {
    orderId: string;
    roundNumber: number;
    totalInCents: number;
  } | null;
  onDismissCelebration: () => void;
}

/**
 * Signature Element 3 — The "Consensus Ring" & Kitchen Stamp
 * Segmented SVG circular progress ring filling with each guest's pastel signature color,
 * paired with an angled rubber-stamp badge ("ROUND [X] • SENT TO KITCHEN") with haptic bounce.
 */
export default function ConsensusModal({
  isOpen,
  onClose,
  session,
  currentUserId,
  restaurantName,
  onSubmitApproval,
  lastPlacedOrder,
  onDismissCelebration,
}: ConsensusModalProps) {
  if (!isOpen && !lastPlacedOrder) return null;

  const users = session.users || [];
  const cart = session.cart || [];
  const votes = session.consensusVotes || {};
  const currentRound = lastPlacedOrder ? lastPlacedOrder.roundNumber : session.roundNumber;

  const colorMap = buildTableColorMap(users);

  // Real-time vote tallies
  const totalUsers = Math.max(1, users.length);
  const approvedUsers = users.filter((u) => votes[u.id]);
  const approvedCount = approvedUsers.length;
  const hasCurrentUserApproved = !!votes[currentUserId];

  // Calculate table total
  const totalCartInCents = cart.reduce(
    (sum, item) => sum + (item.priceInRupees ?? item.priceInCents) * item.quantity,
    0
  );

  // SVG Circular Ring Math
  const radius = 44;
  const circumference = 2 * Math.PI * radius; // ~276.46
  const segmentLength = circumference / totalUsers;
  const gapLength = totalUsers > 1 ? 6 : 0;
  const visibleArc = Math.max(2, segmentLength - gapLength);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs select-none">
        {/* ================================================================ */}
        {/* VIEW 1: CELEBRATION SCREEN WITH THE "KITCHEN STAMP"               */}
        {/* ================================================================ */}
        {lastPlacedOrder ? (
          <motion.div
            key="celebration"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-white border border-[#E7E5E4] rounded-3xl p-6 sm:p-7 text-center space-y-6 shadow-2xl relative text-[#1C1917] overflow-hidden"
          >
            {/* Perforated receipt edge */}
            <div className="absolute top-0 inset-x-0 z-10">
              <ReceiptEdge fillColor="#E7E5E4" edgeHeight={7} position="top" />
            </div>

            {/* Header */}
            <div className="pt-2 space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                100% Table Consensus Reached
              </div>
              <h2 className="text-2xl font-extrabold text-[#1C1917] tracking-tight pt-1">
                Order Sent to Kitchen
              </h2>
              <p className="text-xs text-stone-500">
                Table #{session.tableNumber} • {restaurantName}
              </p>
            </div>

            {/* Tactile Paper Ticket with Angled Rubber-Stamp Badge */}
            <div className="relative p-5 rounded-2xl bg-[#FAF9F6] border border-dashed border-stone-300 text-left space-y-3 shadow-inner">
              {/* Signature Rubber Stamp Badge */}
              <motion.div
                initial={{ scale: 2.2, opacity: 0, rotate: -25 }}
                animate={{
                  scale: [2.2, 0.92, 1.05, 1],
                  opacity: 1,
                  rotate: -12,
                }}
                transition={{
                  duration: 0.55,
                  ease: "backOut",
                  delay: 0.15,
                }}
                className="absolute inset-0 m-auto w-fit h-fit z-20 pointer-events-none"
              >
                <div className="px-4 py-2 border-3 sm:border-4 border-dashed border-[#E07A5F] rounded-xl bg-white/95 backdrop-blur-xs shadow-lg text-[#E07A5F] font-mono font-black tracking-widest text-xs sm:text-sm text-center uppercase flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 shrink-0" />
                  <span>ROUND {lastPlacedOrder.roundNumber} • SENT TO KITCHEN</span>
                </div>
              </motion.div>

              {/* Receipt Body Details */}
              <div className="flex items-center justify-between text-xs text-stone-500 border-b border-dashed border-stone-300 pb-2.5">
                <span className="font-mono uppercase">Ticket ID:</span>
                <span className="font-mono font-bold text-[#1C1917] tracking-tight">
                  {lastPlacedOrder.orderId}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>Diners Approved:</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {totalUsers}/{totalUsers} (100%)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500 border-t border-dashed border-stone-300 pt-2.5">
                <span className="font-semibold text-stone-800">Round Total:</span>
                <span className="font-mono font-bold text-base text-[#1C1917]">
                  {formatRupees(lastPlacedOrder.totalInCents)}
                </span>
              </div>
            </div>

            {/* Next Round Action */}
            <button
              type="button"
              onClick={onDismissCelebration}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#1C1917] hover:bg-black text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Start Round {lastPlacedOrder.roundNumber + 1} (Add More Food)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          /* ================================================================ */
          /* VIEW 2: ACTIVE CONSENSUS MODAL WITH THE "CONSENSUS RING"          */
          /* ================================================================ */
          <motion.div
            key="consensus"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-white border border-[#E7E5E4] rounded-3xl p-6 shadow-2xl space-y-5 text-[#1C1917] max-h-[90vh] flex flex-col relative overflow-hidden"
          >
            {/* Perforated receipt edge */}
            <div className="absolute top-0 inset-x-0 z-10">
              <ReceiptEdge fillColor="#E7E5E4" edgeHeight={7} position="top" />
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer z-20"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="text-left space-y-1 pt-1 pr-8">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 border border-stone-200 text-xs font-mono font-semibold">
                  Round #{currentRound}
                </span>
                <span className="text-xs font-medium text-stone-500">
                  Table #{session.tableNumber}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#1C1917] tracking-tight">
                Review & Consensus Vote
              </h2>
              <p className="text-xs text-stone-500">
                Every diner at the table must vote &ldquo;Looks Good!&rdquo; before sending order to kitchen.
              </p>
            </div>

            {/* Signature Element 3: The Segmented "Consensus Ring" Display */}
            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-dashed border-stone-300 flex flex-col sm:flex-row items-center justify-between gap-5">
              {/* Minimalist SVG Circular Progress Ring */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg
                  className="w-full h-full transform -rotate-90"
                  viewBox="0 0 120 120"
                >
                  {/* Track segments (subtle stone-200 background) */}
                  {users.map((u, idx) => {
                    const startAngle = (idx * 360) / totalUsers;
                    return (
                      <circle
                        key={`track-${u.id}`}
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke="#E7E5E4"
                        strokeWidth="7"
                        strokeLinecap={totalUsers === 1 ? "round" : "round"}
                        strokeDasharray={`${visibleArc} ${circumference - visibleArc}`}
                        transform={`rotate(${startAngle} 60 60)`}
                      />
                    );
                  })}

                  {/* Active animated segments filling with each user's pastel signature color */}
                  {users.map((u, idx) => {
                    const palette: PaletteColor =
                      colorMap.get(u.id) || getGuestSignatureColor(u.id, idx);
                    const isApproved = !!votes[u.id];
                    const startAngle = (idx * 360) / totalUsers;

                    return (
                      <motion.circle
                        key={`fill-${u.id}`}
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke={palette.hex}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={`${visibleArc} ${circumference - visibleArc}`}
                        transform={`rotate(${startAngle} 60 60)`}
                        initial={{ opacity: 0, pathLength: 0 }}
                        animate={{
                          opacity: isApproved ? 1 : 0,
                          pathLength: isApproved ? 1 : 0,
                        }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    );
                  })}
                </svg>

                {/* Inner Ring Stat Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-mono text-xl font-extrabold text-[#1C1917] tracking-tight">
                    {approvedCount}/{totalUsers}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Ready
                  </span>
                </div>
              </div>

              {/* Diners Live Status Badges */}
              <div className="w-full space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700 pb-0.5">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
                    Live Voting Presence:
                  </span>
                  <span className="font-mono text-emerald-700">
                    {Math.round((approvedCount / totalUsers) * 100)}%
                  </span>
                </div>

                <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                  {users.map((u: SessionUser, idx: number) => {
                    const palette: PaletteColor =
                      colorMap.get(u.id) || getGuestSignatureColor(u.id, idx);
                    const isApproved = !!votes[u.id];
                    const isYou = u.id === currentUserId;

                    return (
                      <div
                        key={u.id}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs transition-all ${
                          isApproved
                            ? "bg-white border-emerald-300 shadow-2xs"
                            : "bg-white/60 border-stone-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div
                            style={{
                              backgroundColor: palette.hex,
                              color: palette.textHex,
                            }}
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                          >
                            {u.name.substring(0, 1).toUpperCase()}
                          </div>
                          <span className="font-medium text-[#1C1917] truncate">
                            {u.name} {isYou && <span className="text-stone-400">(You)</span>}
                          </span>
                        </div>

                        {isApproved ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-semibold shrink-0"
                            style={{ color: palette.hex }}
                          >
                            Ready ✅
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 shrink-0">
                            Reviewing... ⏳
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Consolidated Order Summary (Scrollable) */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[130px]">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-500 pb-1">
                <span>Items on Table Ticket:</span>
                <span className="font-mono">{cart.length} {cart.length === 1 ? "dish" : "dishes"}</span>
              </div>

              {cart.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400 italic">
                  Cart is currently empty.
                </div>
              ) : (
                cart.map((item: CartItem) => {
                  const guestColor: PaletteColor =
                    colorMap.get(item.addedByUserId) ||
                    getGuestSignatureColor(item.addedByUserId);

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-white border border-[#E7E5E4] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-stone-800">
                            {item.quantity}×
                          </span>
                          <span className="font-semibold text-sm text-[#1C1917] truncate">
                            {item.name}
                          </span>
                        </div>

                        {item.notes && (
                          <p className="text-[11px] text-amber-800 italic">
                            Note: {item.notes}
                          </p>
                        )}

                        {/* Signature guest badge */}
                        <div className="pt-0.5">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{
                              backgroundColor: guestColor.bgLightHex,
                              color: guestColor.hex,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: guestColor.hex }}
                            />
                            <span>{item.addedByUserName || "Guest"}</span>
                          </span>
                        </div>
                      </div>

                      <span className="font-mono font-bold text-sm text-[#1C1917] shrink-0">
                        {formatRupees((item.priceInRupees ?? item.priceInCents) * item.quantity)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer / Vote Action */}
            <div className="pt-2 border-t border-dashed border-stone-300 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500 font-medium">Grand Total</span>
                <span className="font-mono font-bold text-lg text-[#1C1917] tracking-tight">
                  {formatRupees(totalCartInCents)}
                </span>
              </div>

              {hasCurrentUserApproved ? (
                <div className="w-full py-3.5 px-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs sm:text-sm text-center flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>You voted Looks Good! Waiting for remaining table guests...</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onSubmitApproval}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#1C1917] hover:bg-black text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Looks Good! (Approve Order)</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
}
