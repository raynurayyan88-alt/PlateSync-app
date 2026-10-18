"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UtensilsCrossed,
  Mail,
  MapPin,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function Footer() {
  return (
    <React.Suspense fallback={null}>
      <FooterContent />
    </React.Suspense>
  );
}

function FooterContent() {
  const pathname = usePathname();

  // Suppress company footer on full-screen kitchen displays and guest table ordering screens
  if (pathname?.startsWith("/kds") || pathname?.startsWith("/r/")) {
    return null;
  }

  return (
    <footer className="border-t border-[#E7E5E4] bg-[#FAF9F6] text-[#1C1917] mt-auto">
      {/* Top Banner: Hotelier Call-to-Action */}
      <div className="border-b border-[#E7E5E4] bg-white py-10 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modern Table OS for Indian Restaurants</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#1C1917] tracking-tight">
              Ready to eliminate waiter bottlenecks in your dining room?
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 max-w-xl">
              Launch your restaurant in 30 seconds. Print crisp QR codes, let guests order together in real time, and route tickets to any tablet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/#onboard"
              className="px-5 py-3 bg-[#1C1917] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/contact"
              className="px-5 py-3 bg-white hover:bg-stone-100 text-[#1C1917] border border-[#E7E5E4] text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Talk to Founder</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Multi-Column Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Column 1: Brand & Mission (Spans 2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <div className="w-9 h-9 rounded-xl bg-[#1C1917] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-extrabold text-lg tracking-tight text-[#1C1917]">
                  PlateSync
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-stone-200/60 text-stone-700 border border-stone-300">
                  India
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-sm">
              Collaborative real-time table ordering for modern restaurants. Friends and families order together in one live synced cart with round-by-round consensus voting.
            </p>

            <div className="pt-2 space-y-2 text-xs text-stone-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>Built &amp; operated in Kerala, India 🇮🇳</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <a
                  href="mailto:mohdrayyan@platesync.in"
                  className="font-medium text-[#1C1917] hover:underline"
                >
                  mohdrayyan@platesync.in
                </a>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zero POS replacements • Zero customer app installs</span>
              </div>
            </div>
          </div>

          {/* Column 2: Product & Demos */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
              Product Demos
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-600">
              <li>
                <Link
                  href="/r/grand-empire/t/5"
                  target="_blank"
                  className="hover:text-stone-900 transition-colors flex items-center gap-1.5"
                >
                  <span>Live Table 5 Demo</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </Link>
              </li>
              <li>
                <Link
                  href="/kds/grand-empire"
                  target="_blank"
                  className="hover:text-stone-900 transition-colors flex items-center gap-1.5"
                >
                  <span>Kitchen Display (KDS)</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/grand-empire"
                  target="_blank"
                  className="hover:text-stone-900 transition-colors flex items-center gap-1.5"
                >
                  <span>Admin Menu Portal</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </Link>
              </li>
              <li>
                <Link
                  href="/#pricing"
                  className="hover:text-stone-900 transition-colors"
                >
                  Pricing Tiers (₹ INR)
                </Link>
              </li>
              <li>
                <Link
                  href="/#onboard"
                  className="hover:text-stone-900 transition-colors"
                >
                  Instant Self-Onboarding
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Compliance */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
              Legal &amp; Trust
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-600">
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-stone-900 transition-colors"
                >
                  Privacy Policy (DPDP Act)
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-stone-900 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/refunds"
                  className="hover:text-stone-900 transition-colors"
                >
                  Cancellation &amp; Refund Policy
                </Link>
              </li>
              <li>
                <span className="text-stone-400 text-[11px] block pt-1">
                  Grievance Officer: Mohd Rayyan
                </span>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Support */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
              Contact &amp; Help
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-600">
              <li>
                <Link
                  href="/contact"
                  className="hover:text-stone-900 transition-colors font-medium text-[#1C1917]"
                >
                  Hotelier Contact Page
                </Link>
              </li>
              <li>
                <a
                  href="mailto:mohdrayyan@platesync.in"
                  className="hover:text-stone-900 transition-colors break-all"
                >
                  mohdrayyan@platesync.in
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/919995550000?text=Hi%20Rayyan,%20I'm%20interested%20in%20PlateSync%20for%20my%20restaurant"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-700 transition-colors font-medium text-emerald-600 flex items-center gap-1"
                >
                  <span>WhatsApp Direct Sales</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <span className="text-stone-500 text-[11px] block">
                  Response guarantee: 2–4 hours
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Founder Signature */}
        <div className="pt-8 mt-10 border-t border-[#E7E5E4] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-center sm:text-left">
            <span>© 2026 PlateSync Technologies. All rights reserved.</span>
            <span className="hidden sm:inline text-stone-300">•</span>
            <span>All pricing formatted in Indian Rupees (₹).</span>
          </div>

          <div className="text-center sm:text-right font-medium text-[#1C1917]">
            Designed &amp; developed by{" "}
            <span className="font-bold underline decoration-stone-300 underline-offset-2">
              Mohd Rayyan
            </span>{" "}
            in Kerala, India.
          </div>
        </div>
      </div>
    </footer>
  );
}
