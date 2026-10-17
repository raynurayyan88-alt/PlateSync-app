"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Receipt,
  Users,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { CashierBill } from "@/types/kds";
import ReceiptEdge from "@/components/ui/ReceiptEdge";

export interface CashierBillCardProps {
  bill: CashierBill;
  restaurantName?: string;
  onMarkBillPaid: (billId: string, tableNumber: number) => Promise<void> | void;
  onCloseAndResetTable?: (tableNumber: number) => Promise<void> | void;
  isProcessing?: boolean;
}

export default function CashierBillCard({
  bill,
  restaurantName: _restaurantName,
  onMarkBillPaid,
  onCloseAndResetTable,
  isProcessing = false,
}: CashierBillCardProps) {
  const [showRoundsBreakdown, setShowRoundsBreakdown] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rounds = useMemo(() => bill.rounds || [], [bill.rounds]);
  const guestNames = bill.guestNames || [];
  const isAwaitingPayment = bill.billStatus === "AWAITING_PAYMENT";

  // Consolidate all items across rounds into single itemized summary
  const consolidatedItems = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        quantity: number;
        priceInRupees: number;
        priceInCents: number;
        orderedByGuests: Set<string>;
      }
    >();

    for (const round of rounds) {
      for (const item of round.items) {
        const key = item.name.toLowerCase().trim();
        const existing = map.get(key);
        const itemRupees = item.priceInRupees ?? Math.round(item.priceInCents / 100);

        if (existing) {
          existing.quantity += item.quantity;
          if (item.addedByUserName) existing.orderedByGuests.add(item.addedByUserName);
        } else {
          const guestSet = new Set<string>();
          if (item.addedByUserName) guestSet.add(item.addedByUserName);
          map.set(key, {
            name: item.name,
            quantity: item.quantity,
            priceInRupees: itemRupees,
            priceInCents: item.priceInCents,
            orderedByGuests: guestSet,
          });
        }
      }
    }

    return Array.from(map.values());
  }, [rounds]);

  // Grand total across rounds
  const grandTotal = useMemo(() => {
    if (bill.grandTotalInRupees) {
      return bill.grandTotalInRupees;
    }
    return rounds.reduce((sum, r) => sum + (r.roundTotalInRupees || 0), 0);
  }, [rounds, bill.grandTotalInRupees]);

  const totalItemCount = useMemo(() => {
    return consolidatedItems.reduce((acc, i) => acc + i.quantity, 0);
  }, [consolidatedItems]);

  const handleConfirmClose = async () => {
    setIsSubmitting(true);
    try {
      if (onMarkBillPaid) {
        await onMarkBillPaid(bill.billId, bill.tableNumber);
      } else if (onCloseAndResetTable) {
        await onCloseAndResetTable(bill.tableNumber);
      }
    } finally {
      setIsSubmitting(false);
      setConfirmingClose(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col bg-white text-stone-900 rounded-2xl border shadow-xl overflow-hidden select-none relative ${
        isAwaitingPayment ? "border-amber-400 ring-2 ring-amber-400/30" : "border-stone-300"
      }`}
    >
      {/* Top Perforated Receipt Serration */}
      <ReceiptEdge fillColor="#F5F5F4" edgeHeight={7} position="top" />

      {/* 1. Header: Table Badge, Session/Bill ID, Dining vs Counter Status */}
      <div
        className={`px-5 pt-4 pb-3 border-b ${
          isAwaitingPayment
            ? "bg-amber-50/90 border-amber-200"
            : "bg-stone-50/80 border-stone-200"
        }`}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className={`text-white font-black text-base px-3 py-1 rounded-lg tracking-tight uppercase shadow-sm ${
                isAwaitingPayment ? "bg-amber-950" : "bg-stone-950"
              }`}
            >
              Table {bill.tableNumber}
            </span>

            {isAwaitingPayment ? (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                Awaiting Payment at Counter
              </span>
            ) : (
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Currently Dining • {rounds.length === 0 ? "Browsing" : `${rounds.length} Round${rounds.length > 1 ? "s" : ""}`}
              </span>
            )}
          </div>

          <div className="text-right">
            <div className="text-[11px] font-mono font-bold text-stone-500">
              #{bill.billId?.slice(-8) || bill.diningSessionId?.slice(-6) || "BILL"}
            </div>
          </div>
        </div>

        {/* Diners list */}
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-stone-600 flex-wrap">
          <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="font-semibold text-stone-700">
            {guestNames.length} {guestNames.length === 1 ? "Guest" : "Guests"}:
          </span>
          {guestNames.length > 0 ? (
            <div className="flex items-center gap-1 flex-wrap">
              {guestNames.map((name, i) => (
                <span
                  key={i}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                    isAwaitingPayment
                      ? "bg-amber-200/80 text-amber-950 font-semibold"
                      : "bg-stone-200/80 text-stone-800"
                  }`}
                >
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-stone-400 italic">No diners identified</span>
          )}
        </div>
      </div>

      {/* 2. Consolidated Master Itemized Bill */}
      <div className="p-5 flex-1 space-y-4">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-2">
          <span>Item & Qty</span>
          <span>Amount (₹)</span>
        </div>

        {consolidatedItems.length === 0 ? (
          <div className="py-8 text-center text-stone-400 text-xs">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone-400" />
            <p className="font-medium">No confirmed rounds placed yet.</p>
            <p className="text-[11px] text-stone-400 mt-1">Guests are currently browsing the menu.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {consolidatedItems.map((item, idx) => {
              const itemTotal = item.priceInRupees * item.quantity;
              return (
                <div key={idx} className={idx > 0 ? "pt-2" : ""}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="bg-stone-900 text-stone-100 font-mono font-bold text-xs px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                        {item.quantity}×
                      </span>
                      <span className="font-semibold text-stone-900 text-sm leading-snug">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-stone-900 text-sm shrink-0">
                      ₹{itemTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                  {item.orderedByGuests.size > 0 && (
                    <div className="ml-7 mt-0.5 text-[11px] text-stone-500">
                      Ordered by: {Array.from(item.orderedByGuests).join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Rounds Breakdown Accordion (Expandable) */}
        {rounds.length > 1 && (
          <div className="border-t border-stone-200 pt-3">
            <button
              type="button"
              onClick={() => setShowRoundsBreakdown(!showRoundsBreakdown)}
              className="w-full flex items-center justify-between text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors py-1 cursor-pointer"
            >
              <span>View Breakdown by Round ({rounds.length} rounds)</span>
              {showRoundsBreakdown ? (
                <ChevronUp className="w-4 h-4 text-stone-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-stone-500" />
              )}
            </button>

            {showRoundsBreakdown && (
              <div className="mt-2.5 space-y-2.5 bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
                {rounds.map((round) => (
                  <div key={round.orderId} className="space-y-1">
                    <div className="flex items-center justify-between font-bold text-stone-700">
                      <span>Round {round.roundNumber}</span>
                      <span className="font-mono">₹{round.roundTotalInRupees.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      {round.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Totals and Cashier Settlement Footer */}
      <div
        className={`p-5 border-t space-y-4 ${
          isAwaitingPayment ? "bg-amber-50/60 border-amber-200" : "bg-stone-50 border-stone-200"
        }`}
      >
        {/* Bill Summary */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Total Consolidated Items</span>
            <span className="font-mono font-semibold">{totalItemCount}</span>
          </div>

          <div className="flex items-baseline justify-between pt-1 border-t border-stone-200">
            <span className="text-sm font-black uppercase tracking-tight text-stone-800">
              Grand Total
            </span>
            <span className="text-2xl font-black font-mono text-stone-950 tracking-tight">
              ₹{grandTotal.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Action Button: Mark Bill Paid */}
        {!confirmingClose ? (
          <button
            type="button"
            disabled={isProcessing || isSubmitting}
            onClick={() => setConfirmingClose(true)}
            className={`w-full font-bold text-sm tracking-wide py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 active:scale-[0.98] ${
              isAwaitingPayment
                ? "bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-amber-950/20"
                : "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-950/20"
            }`}
          >
            <CreditCard className="w-4 h-4 stroke-[2.4]" />
            <span>
              {isAwaitingPayment
                ? `Mark Bill Paid (₹${grandTotal.toLocaleString("en-IN")})`
                : "Bill Paid • Reset Table"}
            </span>
          </button>
        ) : (
          <div className="space-y-2 bg-amber-50 border border-amber-300 p-3 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Settle ₹{grandTotal.toLocaleString("en-IN")} for Table {bill.tableNumber}?</span>
            </div>
            <p className="text-[11px] text-amber-800">
              {isAwaitingPayment
                ? `This settles bill #${bill.billId.slice(-8)} for ${guestNames.join(", ") || "guests"} and archives it to Completed Bills without disturbing any new diners.`
                : `This archives the bill, resets Table ${bill.tableNumber} to Round 1, and welcomes the next dining group.`}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmClose}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Settling...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Settle</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirmingClose(false)}
                className="px-3 bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold text-xs py-2 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Perforated Receipt Serration */}
      <ReceiptEdge fillColor="#F5F5F4" edgeHeight={7} position="bottom" />
    </motion.div>
  );
}
