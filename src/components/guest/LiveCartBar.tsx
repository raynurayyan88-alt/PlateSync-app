"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Trash2, ChevronUp, ChevronDown, CheckCircle2, ArrowRight } from "lucide-react";
import type { CartItem, SessionUser } from "@/server/sessionStore";
import { formatRupees } from "@/lib/formatters";
import { buildTableColorMap, getGuestSignatureColor, PaletteColor } from "@/lib/palette";
import ReceiptEdge from "@/components/ui/ReceiptEdge";

interface LiveCartBarProps {
  cart: CartItem[];
  users: SessionUser[];
  currentUserId: string;
  tableNumber: number | string;
  roundNumber: number;
  onRemoveItem: (cartItemId: string) => void;
  onTriggerReview: () => void;
}

/**
 * Signature Element 2 — The "Tactile Paper Ticket" Cart Drawer
 * Perforated zig-zag receipt edge, dashed horizontal dividers, guest signature color pills
 * (● Rahul), and crisp monospaced ₹ prices.
 */
export default function LiveCartBar({
  cart,
  users,
  currentUserId,
  tableNumber,
  roundNumber,
  onRemoveItem,
  onTriggerReview,
}: LiveCartBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const colorMap = buildTableColorMap(users);

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPriceInCents = cart.reduce(
    (sum, item) => sum + (item.priceInRupees ?? item.priceInCents) * item.quantity,
    0
  );

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* 1. Slide-up Tactile Paper Ticket Cart Drawer                       */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {isExpanded && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-stone-900/40 backdrop-blur-xs">
            <div className="absolute inset-0" onClick={() => setIsExpanded(false)} />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="relative z-10 w-full max-w-lg bg-white border-t border-x border-[#E7E5E4] rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl text-[#1C1917] overflow-hidden"
            >
              {/* Subtle SVG Serrated / Zig-zag Receipt Edge at Top of Drawer */}
              <div className="absolute top-0 inset-x-0 z-20">
                <ReceiptEdge fillColor="#E7E5E4" edgeHeight={7} position="top" />
              </div>

              {/* Grab Handle */}
              <div
                className="pt-4 pb-1 flex justify-center cursor-pointer"
                onClick={() => setIsExpanded(false)}
              >
                <div className="w-10 h-1 rounded-full bg-stone-300" />
              </div>

              {/* Paper Ticket Header */}
              <div className="px-6 py-3.5 border-b border-dashed border-stone-300 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-stone-500 font-semibold">
                      Order Ticket
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 border border-stone-200">
                      Table #{tableNumber}
                    </span>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                      Round #{roundNumber}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#1C1917] mt-0.5 tracking-tight">
                    Shared Table Cart
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Seated Diners Presence Strip */}
              <div className="px-6 py-2.5 bg-[#FAF9F6] border-b border-dashed border-stone-300 flex items-center justify-between">
                <span className="text-xs font-medium text-stone-500">Connected table guests:</span>
                <div className="flex items-center -space-x-1.5">
                  {users.map((u, idx) => {
                    const palette: PaletteColor =
                      colorMap.get(u.id) || getGuestSignatureColor(u.id, idx);
                    return (
                      <div
                        key={u.id}
                        style={{
                          backgroundColor: palette.hex,
                          color: palette.textHex,
                        }}
                        className="w-5 h-5 rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-bold shadow-2xs"
                        title={u.name}
                      >
                        {u.name.substring(0, 1).toUpperCase()}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ticket Items List */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-[#1C1917]">Your table cart is empty</p>
                    <p className="text-xs text-stone-500">
                      Tap any dish on the menu above to customize and add it here.
                    </p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const isOwner = item.addedByUserId === currentUserId;
                    const guestColor: PaletteColor =
                      colorMap.get(item.addedByUserId) ||
                      getGuestSignatureColor(item.addedByUserId);

                    const modifiers = item.selectedModifiers || {};
                    const modifierList = Array.isArray(modifiers)
                      ? modifiers.map((m) =>
                          typeof m === "object" && m !== null && "label" in m
                            ? String((m as { label: string }).label)
                            : String(m)
                        )
                      : Object.entries(modifiers).flatMap(([group, val]) =>
                          Array.isArray(val) ? val.map((v) => `${group}: ${v}`) : [`${group}: ${val}`]
                        );

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E7E5E4] flex items-start justify-between gap-3 shadow-2xs transition-all"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="shrink-0 font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-800 mt-0.5">
                                {item.quantity}×
                              </span>
                              <h4 className="font-sans font-semibold text-sm text-[#1C1917] leading-snug">
                                {item.name}
                              </h4>
                            </div>

                            {/* Crisp Monospaced Item Price */}
                            <span className="font-mono font-bold text-sm text-[#1C1917] shrink-0">
                              {formatRupees((item.priceInRupees ?? item.priceInCents) * item.quantity)}
                            </span>
                          </div>

                          {/* Modifiers List */}
                          {modifierList.length > 0 && (
                            <div className="pl-7 space-y-0.5 text-xs text-stone-600">
                              {modifierList.map((mod, idx) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                  <span className="w-1 h-1 rounded-full bg-stone-400" />
                                  <span>{mod}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Notes */}
                          {item.notes && (
                            <p className="pl-7 text-xs text-amber-800 italic">
                              Note: {item.notes}
                            </p>
                          )}

                          {/* Signature Element: Tiny Guest Ownership Pill (● Rahul) */}
                          <div className="pl-7 pt-1 flex items-center gap-2">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border"
                              style={{
                                backgroundColor: guestColor.bgLightHex,
                                borderColor: `${guestColor.hex}35`,
                                color: guestColor.hex,
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: guestColor.hex }}
                              />
                              <span>
                                {item.addedByUserName || "Guest"}
                                {isOwner && " (You)"}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Trash Button ONLY on items added by the current user */}
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer & Action Button (Separated by Dashed Divider) */}
              {cart.length > 0 && (
                <div className="p-4 bg-white border-t border-dashed border-stone-300 space-y-3">
                  <div className="flex items-center justify-between text-sm px-1">
                    <span className="text-stone-500 font-medium">Table Total</span>
                    <span className="font-mono font-bold text-lg text-[#1C1917] tracking-tight">
                      {formatRupees(totalPriceInCents)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExpanded(false);
                      onTriggerReview();
                    }}
                    className="w-full py-3.5 px-5 rounded-2xl bg-[#1C1917] hover:bg-black text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Review Order ({totalItemCount} items)</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Slim, Floating, Unobtrusive Live Cart Bar                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="fixed bottom-4 left-0 right-0 z-30 px-4 max-w-lg mx-auto pointer-events-none">
        <motion.div
          layout
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#E7E5E4] rounded-2xl p-3 shadow-lg shadow-stone-900/5 flex items-center justify-between gap-3 cursor-pointer select-none hover:border-stone-300 transition-all"
          onClick={() => setIsExpanded(true)}
        >
          {/* Left: Cart Icon, Item Count & Monospace Price in ₹ */}
          <div className="flex items-center gap-3">
            <motion.div
              key={totalItemCount}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.2 }}
              className="relative p-2.5 rounded-xl bg-stone-100 text-[#1C1917] flex items-center justify-center"
            >
              <ShoppingBag className="w-4 h-4" />
              {totalItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#1C1917] text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border-2 border-white shadow-2xs">
                  {totalItemCount}
                </span>
              )}
            </motion.div>

            <div>
              <div className="text-xs font-semibold text-[#1C1917] flex items-center gap-1">
                <span>Table Cart</span>
                <span className="font-mono text-stone-500 font-normal">
                  ({totalItemCount} {totalItemCount === 1 ? "item" : "items"})
                </span>
              </div>
              <div className="font-mono text-sm font-bold text-[#1C1917] tracking-tight">
                {formatRupees(totalPriceInCents)}
              </div>
            </div>
          </div>

          {/* Right: Seated Guests Pastel Avatars + "View Cart" Pill */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center -space-x-1.5">
              {users.slice(0, 3).map((u, idx) => {
                const palette: PaletteColor =
                  colorMap.get(u.id) || getGuestSignatureColor(u.id, idx);
                return (
                  <div
                    key={u.id}
                    style={{
                      backgroundColor: palette.hex,
                      color: palette.textHex,
                    }}
                    className="w-5 h-5 rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-bold shadow-2xs"
                    title={u.name}
                  >
                    {u.name.substring(0, 1).toUpperCase()}
                  </div>
                );
              })}
              {users.length > 3 && (
                <div className="w-5 h-5 rounded-full ring-2 ring-white bg-stone-100 text-stone-600 flex items-center justify-center text-[9px] font-semibold">
                  +{users.length - 3}
                </div>
              )}
            </div>

            <div className="px-3 py-1.5 rounded-full bg-stone-50 border border-stone-200 text-xs font-medium text-stone-800 flex items-center gap-1 hover:bg-stone-100 transition-colors">
              <span>View Ticket</span>
              <ChevronUp className="w-3.5 h-3.5 text-stone-500" />
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
