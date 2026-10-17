"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Radio } from "lucide-react";
import { buildTableColorMap, getGuestSignatureColor, PaletteColor } from "@/lib/palette";

export interface LiveTablePillProps {
  tableNumber: number;
  roundNumber: number;
  users: Array<{ id: string; name: string; color?: string }>;
  currentUserId?: string;
  isDisconnected?: boolean;
  pulsingUserId?: string | null;
  onPillClick?: () => void;
}

/**
 * Signature Element 1 — The "Live Table Pill" (Dynamic Presence Island)
 * Floating frosted-glass pill rendering table number, overlapping guest avatars in their
 * distinct signature pastel colors, and pulsing on live cart additions.
 */
export default function LiveTablePill({
  tableNumber,
  roundNumber,
  users,
  currentUserId,
  isDisconnected = false,
  pulsingUserId,
  onPillClick,
}: LiveTablePillProps) {
  const colorMap = buildTableColorMap(users);

  return (
    <div className="fixed top-3 inset-x-0 z-30 flex justify-center pointer-events-none px-4">
      <motion.div
        layout
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        onClick={onPillClick}
        className="pointer-events-auto select-none inline-flex items-center gap-3 px-4 py-1.5 rounded-full backdrop-blur-md bg-white/90 border border-stone-200/90 shadow-sm hover:shadow-md transition-shadow cursor-default"
      >
        {/* Table Number & Status Dot */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {!isDisconnected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            )}
          </span>
          <span className="font-semibold text-xs tracking-tight text-stone-900">
            Table {tableNumber}
          </span>
          {roundNumber > 1 && (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
              R{roundNumber}
            </span>
          )}
        </div>

        {/* Subtle vertical hairline divider */}
        <div className="w-[1px] h-3.5 bg-stone-200" />

        {/* Overlapping Guest Avatar Badges in Distinct Signature Pastel Colors */}
        <div className="flex items-center">
          {users.length === 0 ? (
            <div className="flex items-center gap-1 text-[11px] text-stone-400">
              <Users className="w-3 h-3" />
              <span>Alone</span>
            </div>
          ) : (
            <div className="flex items-center -space-x-1.5 overflow-visible">
              <AnimatePresence>
                {users.slice(0, 5).map((user, idx) => {
                  const palette: PaletteColor =
                    colorMap.get(user.id) || getGuestSignatureColor(user.id, idx);
                  const isPulsing = pulsingUserId === user.id;
                  const isMe = user.id === currentUserId;

                  return (
                    <motion.div
                      key={user.id}
                      layout
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: isPulsing ? [1, 1.35, 1] : 1,
                        opacity: 1,
                        zIndex: isPulsing ? 10 : 5 - idx,
                      }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        scale: { duration: 0.45, ease: "easeOut" },
                        layout: { duration: 0.2 },
                      }}
                      title={`${user.name}${isMe ? " (You)" : ""}`}
                      className="relative w-5 h-5 rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-bold shadow-xs cursor-pointer"
                      style={{
                        backgroundColor: palette.hex,
                        color: palette.textHex,
                      }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                      {isPulsing && (
                        <motion.span
                          initial={{ scale: 1, opacity: 0.8 }}
                          animate={{ scale: 2, opacity: 0 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="absolute inset-0 rounded-full"
                          style={{ backgroundColor: palette.hex }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {users.length > 5 && (
                <div className="w-5 h-5 rounded-full ring-2 ring-white bg-stone-100 text-stone-600 flex items-center justify-center text-[9px] font-semibold">
                  +{users.length - 5}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live sync pill badge */}
        <div className="text-[10px] font-medium text-stone-500 hidden sm:flex items-center gap-1">
          <Radio className={`w-3 h-3 ${!isDisconnected ? "text-emerald-500 animate-pulse" : "text-rose-400"}`} />
          <span>{!isDisconnected ? "Live" : "Offline"}</span>
        </div>
      </motion.div>
    </div>
  );
}
