"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw, AlertTriangle, ShieldAlert } from "lucide-react";

interface NetworkResilienceOverlayProps {
  isDisconnected: boolean;
  tableNumber: number | string;
  onForceReconnect?: () => void;
}

export default function NetworkResilienceOverlay({
  isDisconnected,
  tableNumber,
  onForceReconnect,
}: NetworkResilienceOverlayProps) {
  // Apply subtle grayscale to the root body element when disconnected (never disable pointer-events)
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isDisconnected) {
        document.body.classList.add("filter", "grayscale-[30%]");
      } else {
        document.body.classList.remove("filter", "grayscale-[30%]");
      }
    }

    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("filter", "grayscale-[30%]");
      }
    };
  }, [isDisconnected]);

  if (!isDisconnected) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md pointer-events-auto select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-sm bg-white border border-[#E7E5E4] rounded-3xl p-6 shadow-2xl text-center space-y-5 text-[#1C1917]"
        >
          {/* Animated Reconnection Icon */}
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-2xl bg-rose-100 opacity-75" />
            <div className="relative w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
              <WifiOff className="w-8 h-8" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-mono font-bold tracking-wide uppercase">
              <AlertTriangle className="w-3.5 h-3.5" />
              Bad WiFi Safeguard Active
            </div>
            <h3 className="text-xl font-bold text-[#1C1917] tracking-tight">
              Reconnecting to Table...
            </h3>
            <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
              Connection lost with <strong className="text-[#1C1917]">Table #{tableNumber}</strong>. Buttons
              are locked to protect multiplayer sync.
            </p>
          </div>

          {/* Reconnecting Status Pill */}
          <div className="p-3 bg-[#FAF9F6] rounded-2xl border border-[#E7E5E4] text-xs flex items-center justify-center gap-2 text-stone-600">
            <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
            <span>Resuming live state from Redis...</span>
          </div>

          <div className="pt-1 text-[11px] text-stone-400 flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-stone-400" />
            <span>Offline taps will not be replayed</span>
          </div>

          {onForceReconnect && (
            <button
              type="button"
              onClick={onForceReconnect}
              className="w-full py-2.5 px-3 rounded-xl bg-[#1C1917] hover:bg-black text-xs font-semibold text-white active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              Force Reconnect Now
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
