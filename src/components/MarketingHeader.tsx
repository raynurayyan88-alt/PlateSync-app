"use client";

import React from "react";
import Link from "next/link";
import { UtensilsCrossed, ArrowRight, ExternalLink } from "lucide-react";

export default function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E7E5E4] px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-[#1C1917] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-[#1C1917]">
              PlateSync
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              India
            </span>
          </div>
        </Link>

        {/* Quick Links */}
        <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-stone-600">
          <Link
            href="/#pricing"
            className="px-3 py-1.5 rounded-xl hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            Pricing (₹)
          </Link>
          <Link
            href="/contact"
            className="px-3 py-1.5 rounded-xl hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            Contact
          </Link>
          <Link
            href="/r/grand-empire/t/5"
            target="_blank"
            className="px-3 py-1.5 rounded-xl hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1"
          >
            <span>Live Table Demo</span>
            <ExternalLink className="w-3 h-3 text-stone-400" />
          </Link>
          <Link
            href="/kds/grand-empire"
            target="_blank"
            className="px-3 py-1.5 rounded-xl hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1"
          >
            <span>Kitchen Display</span>
            <ExternalLink className="w-3 h-3 text-stone-400" />
          </Link>
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <Link
            href="/#onboard"
            className="px-4 py-2 bg-[#1C1917] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <span>Launch Your Hotel</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
