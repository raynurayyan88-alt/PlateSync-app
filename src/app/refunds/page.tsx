import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import MarketingHeader from "@/components/MarketingHeader";
import { RefreshCcw, ShieldCheck, CheckCircle2, Clock, Mail, MapPin, ArrowLeft, HeartHandshake } from "lucide-react";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy | PlateSync Technologies",
  description:
    "PlateSync 14-day money-back guarantee and simple 1-click subscription cancellation terms for restaurants and hotels across India.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <MarketingHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-16 w-full">
        {/* Breadcrumb / Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-[#1C1917] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Page Title & Guarantee Banner */}
        <div className="space-y-3 mb-10 pb-8 border-b border-[#E7E5E4]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>14-Day 100% Money-Back Guarantee</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            Cancellation &amp; Refund Policy
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 font-medium">
            Effective Date: January 1, 2026 • PlateSync Technologies (Kerala, India)
          </p>
        </div>

        {/* Document Body */}
        <div className="space-y-10 text-sm sm:text-base text-stone-700 leading-relaxed">
          {/* Section 1: 14-Day Money Back Guarantee */}
          <section className="bg-white border-2 border-emerald-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                <HeartHandshake className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#1C1917]">
                  1. The 14-Day Unconditional Money-Back Guarantee
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">
                  We want hoteliers and cafe owners to try PlateSync with zero risk.
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-stone-600 space-y-2 border-t border-emerald-100 pt-3">
              <p>
                Every new paid subscription tier — including <strong>Starter Cafe (₹999/mo)</strong>, <strong>Family Restaurant (₹1999/mo)</strong>, and <strong>Grand Hotel (₹3499/mo)</strong> — comes with a full <strong>14-day money-back guarantee</strong> starting from the activation timestamp.
              </p>
              <p>
                If PlateSync does not demonstrably improve order turnaround time or your dining staff feels it is not the right fit for your restaurant, simply contact founder Mohd Rayyan at <a href="mailto:mohdrayyan@platesync.in" className="font-semibold text-[#1C1917] underline">mohdrayyan@platesync.in</a> within your first 14 days for a 100% refund. No awkward questions asked.
              </p>
            </div>
          </section>

          {/* Section 2: 1-Click Subscription Cancellation */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              2. Simple 1-Click Subscription Cancellation
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              We do not believe in locking restaurants into long-term contracts:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-stone-600">
              <li>You can cancel your subscription at any time directly through your Admin Portal or by sending a quick email to <a href="mailto:mohdrayyan@platesync.in" className="font-medium text-[#1C1917] underline">mohdrayyan@platesync.in</a>.</li>
              <li>There are <strong>zero cancellation fees</strong>, zero hidden penalties, and zero minimum commitment terms.</li>
              <li>Upon cancellation, your restaurant account remains fully functional until the end of your current pre-paid monthly billing period.</li>
            </ul>
          </section>

          {/* Section 3: Refund Settlement Timelines */}
          <section className="bg-white border border-[#E7E5E4] rounded-3xl p-6 sm:p-8 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2.5 text-[#1C1917] font-bold text-base sm:text-lg">
              <Clock className="w-5 h-5 text-orange-600 shrink-0" />
              <h3>3. Refund Processing &amp; Settlement Timeline</h3>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Once an eligible refund is initiated by our team:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-stone-600">
              <li>Refund approvals are acknowledged via email within <strong>24 business hours</strong>.</li>
              <li>Funds are credited back to the original payment source (UPI, Net Banking, or Credit/Debit Card) within <strong>5 to 7 business days</strong>, in accordance with standard Reserve Bank of India (RBI) payment clearing guidelines.</li>
            </ul>
          </section>

          {/* Section 4: Hardware & Physical QR Stands Disclaimer */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              4. Physical QR Stands &amp; Self-Printing
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              PlateSync is a digital software platform. We provide instant, vector-crisp digital QR code files (.SVG / .PNG) in your Admin Portal for you to print on your own printers or local acrylic vendors. We do not charge physical shipping fees for our core SaaS software tiers. If physical stands are purchased via an authorized third-party partner, the respective third-party distributor&rsquo;s return policy applies.
            </p>
          </section>

          {/* Section 5: Official Contact & Refund Assistance */}
          <section className="space-y-3 pb-8 border-b border-[#E7E5E4]">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              5. How to Initiate a Cancellation or Refund
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              To request your 14-day refund or manage your subscription, contact our founding team directly:
            </p>
            <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 space-y-2 text-xs sm:text-sm">
              <div className="font-bold text-[#1C1917]">Mohd Rayyan — Founder</div>
              <div className="text-stone-600">PlateSync Technologies</div>
              <div className="flex items-center gap-2 text-stone-700">
                <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                <span>Operating Location: Kerala, India</span>
              </div>
              <div className="flex items-center gap-2 text-stone-700">
                <Mail className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                <span>
                  Official Email:{" "}
                  <a
                    href="mailto:mohdrayyan@platesync.in"
                    className="font-bold text-[#1C1917] hover:underline"
                  >
                    mohdrayyan@platesync.in
                  </a>
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Back Button */}
        <div className="pt-8 text-center sm:text-left">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-[#E7E5E4] hover:bg-stone-50 text-xs font-bold text-stone-800 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Homepage</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
