"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed, Users, Sparkles, ArrowRight, RotateCcw } from "lucide-react";
import { PASTEL_GUEST_PALETTE } from "@/lib/palette";
import ReceiptEdge from "@/components/ui/ReceiptEdge";

export interface UserProfile {
  userId: string;
  userName: string;
  color: string;
}

interface OnboardingModalProps {
  isOpen: boolean;
  restaurantName: string;
  tableNumber: number;
  existingDiners?: string[];
  activeRoundsCount?: number;
  onComplete: (profile: UserProfile, isNewCustomerGroup: boolean) => void;
}

export default function OnboardingModal({
  isOpen,
  restaurantName,
  tableNumber,
  existingDiners = [],
  activeRoundsCount = 0,
  onComplete,
}: OnboardingModalProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PASTEL_GUEST_PALETTE[0].hex);
  const [error, setError] = useState("");
  const [groupChoice, setGroupChoice] = useState<"join" | "new">("join");

  const hasExistingSession = existingDiners.length > 0 || activeRoundsCount > 0;
  const firstGuestName = existingDiners[0] || "Active Group";

  // Auto-scroll phone viewport to top when onboarding opens
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter your name to proceed.");
      return;
    }

    let userId = "";
    if (typeof window !== "undefined") {
      userId =
        localStorage.getItem("platesync_user_id") ||
        localStorage.getItem("tablesync_user_id") ||
        "";
      if (!userId || groupChoice === "new") {
        userId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `u_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      }
      localStorage.setItem("platesync_user_id", userId);
      localStorage.setItem("platesync_user_name", trimmed);
      localStorage.setItem("platesync_user_color", selectedColor);
      // Legacy compatibility
      localStorage.setItem("tablesync_user_id", userId);
      localStorage.setItem("tablesync_user_name", trimmed);
      localStorage.setItem("tablesync_user_color", selectedColor);
    } else {
      userId = `u_${Date.now()}`;
    }

    onComplete(
      {
        userId,
        userName: trimmed,
        color: selectedColor,
      },
      hasExistingSession && groupChoice === "new"
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-[#FAF9F6]/95 backdrop-blur-md flex items-start sm:items-center justify-center pt-10 sm:pt-0 px-4 overflow-y-auto pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-md bg-white border border-[#E7E5E4] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-[#1C1917] relative overflow-hidden pointer-events-auto mb-12 sm:mb-0"
        >
          {/* Subtle serrated receipt edge */}
          <div className="absolute top-0 inset-x-0 z-10 pointer-events-none">
            <ReceiptEdge fillColor="#E7E5E4" edgeHeight={6} position="top" />
          </div>

          {/* Header */}
          <div className="text-center space-y-2 pt-1">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-stone-100 text-[#1C1917] mb-0.5">
              <UtensilsCrossed className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-xs font-semibold text-[#1C1917] border border-[#E7E5E4]">
              <Users className="w-3.5 h-3.5" />
              Table #{tableNumber} • {restaurantName}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1C1917]">
              {hasExistingSession && groupChoice === "new"
                ? "Start Fresh Order"
                : "Welcome to Table #" + tableNumber}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 max-w-xs mx-auto leading-relaxed">
              {hasExistingSession
                ? "There is an active session on this table. Choose whether you're joining this group or sitting down as a new party."
                : "Your name and signature pastel color will mark every dish you add to the shared table cart."}
            </p>
          </div>

          {/* SMART 2-OPTION SELECTOR: Join Existing Group vs Start New Group */}
          {hasExistingSession && (
            <div className="space-y-2 text-left pt-1">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Select Your Customer Group
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {/* Option 1: Join Current Group */}
                <button
                  type="button"
                  onClick={() => setGroupChoice("join")}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    groupChoice === "join"
                      ? "bg-amber-50/70 border-amber-500/80 ring-2 ring-amber-500/20 shadow-xs"
                      : "bg-[#FAF9F6] border-[#E7E5E4] hover:bg-stone-50"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      groupChoice === "join"
                        ? "border-amber-600 bg-amber-600"
                        : "border-stone-400 bg-white"
                    }`}
                  >
                    {groupChoice === "join" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                      <span>Join {firstGuestName}&apos;s Table</span>
                      <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded font-mono">
                        Same Party
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">
                      Share cart and order together with {existingDiners.join(", ")}.
                    </p>
                  </div>
                </button>

                {/* Option 2: New Customer Group */}
                <button
                  type="button"
                  onClick={() => setGroupChoice("new")}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    groupChoice === "new"
                      ? "bg-emerald-50/70 border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-xs"
                      : "bg-[#FAF9F6] border-[#E7E5E4] hover:bg-stone-50"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      groupChoice === "new"
                        ? "border-emerald-600 bg-emerald-600"
                        : "border-stone-400 bg-white"
                    }`}
                  >
                    {groupChoice === "new" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                      <span>New Customer Group — Start Fresh Order</span>
                      <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded font-mono">
                        New Party
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">
                      Previous group finished. Sends their bill to cashier counter & opens fresh Round 1 for us.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Input */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="diner-name" className="text-xs font-semibold text-stone-700">
                Your Name / Nickname
              </label>
              <input
                id="diner-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. Alex, Sam, Rahul, Sneha..."
                maxLength={30}
                autoFocus
                autoComplete="name"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl px-4 py-3 text-base text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#1C1917] focus:bg-white transition-all shadow-2xs pointer-events-auto select-text"
              />
              {error && (
                <p className="text-xs text-rose-600 font-medium">{error}</p>
              )}
            </div>

            {/* Avatar Pastel Signature Color Picker */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-stone-500" />
                Pick your signature pastel color
              </label>
              <div className="flex items-center justify-between gap-1.5 p-2 bg-[#FAF9F6] rounded-2xl border border-[#E7E5E4]">
                {PASTEL_GUEST_PALETTE.map((c) => (
                  <button
                    type="button"
                    key={c.name}
                    onClick={() => setSelectedColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                      selectedColor === c.hex
                        ? "ring-2 ring-offset-2 ring-stone-900 scale-110 shadow-sm"
                        : "opacity-80 hover:opacity-100"
                    }`}
                    title={c.name}
                  >
                    {selectedColor === c.hex && (
                      <span className="w-2 h-2 rounded-full bg-white shadow-2xs" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all cursor-pointer ${
                hasExistingSession && groupChoice === "new"
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                  : "bg-[#1C1917] hover:bg-black text-white"
              }`}
            >
              {hasExistingSession && groupChoice === "new" ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Start Fresh Order • Table #{tableNumber}</span>
                </>
              ) : (
                <>
                  <span>
                    {hasExistingSession
                      ? `Join ${firstGuestName}'s Table`
                      : `Join Table #${tableNumber}`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
