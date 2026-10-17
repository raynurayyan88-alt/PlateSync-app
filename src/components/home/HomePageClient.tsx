"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
  ChefHat,
  ShieldCheck,
  Zap,
  Printer,
  ExternalLink,
  Store,
  ChevronRight,
} from "lucide-react";

export default function HomePageClient() {
  const router = useRouter();

  // Onboarding Form State
  const [hotelName, setHotelName] = useState("");
  const [city, setCity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Hero interactive ticket demo state
  const [interactiveItems, setInteractiveItems] = useState([
    {
      id: "1",
      name: "Charcoal Chicken Al Faham",
      portion: "Half",
      price: 280,
      by: "Rahul",
      color: "bg-[#E07A5F]",
    },
    {
      id: "2",
      name: "Truffle Beast Burger",
      portion: "Regular",
      price: 340,
      by: "Sneha",
      color: "bg-[#81B29A]",
    },
    {
      id: "3",
      name: "Extra Garlic Toum Dip",
      portion: "Dip",
      price: 30,
      by: "Rahul",
      color: "bg-[#E07A5F]",
    },
  ]);

  const handleAddSampleItem = () => {
    if (interactiveItems.length >= 5) {
      // reset to original 3
      setInteractiveItems([
        {
          id: "1",
          name: "Charcoal Chicken Al Faham",
          portion: "Half",
          price: 280,
          by: "Rahul",
          color: "bg-[#E07A5F]",
        },
        {
          id: "2",
          name: "Truffle Beast Burger",
          portion: "Regular",
          price: 340,
          by: "Sneha",
          color: "bg-[#81B29A]",
        },
        {
          id: "3",
          name: "Extra Garlic Toum Dip",
          portion: "Dip",
          price: 30,
          by: "Rahul",
          color: "bg-[#E07A5F]",
        },
      ]);
      return;
    }

    const extraDish =
      interactiveItems.length === 3
        ? {
            id: "4",
            name: "Mint Lemonade",
            portion: "Chilled",
            price: 90,
            by: "Aman",
            color: "bg-[#F2CC8F]",
          }
        : {
            id: "5",
            name: "Paneer Tikka Roll",
            portion: "Full",
            price: 190,
            by: "Sneha",
            color: "bg-[#81B29A]",
          };

    setInteractiveItems((prev) => [...prev, extraDish]);
  };

  const sampleTotal = interactiveItems.reduce((acc, curr) => acc + curr.price, 0);

  // Self-Serve Hotel Onboarding Handler
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelName.trim()) {
      setErrorMessage("Please enter your hotel or restaurant name.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/restaurants/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: hotelName.trim(),
          city: city.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.redirectUrl) {
        router.push(data.redirectUrl);
      } else {
        setErrorMessage(data.error || "Failed to create restaurant. Please try again.");
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage("Network error during hotel setup. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* ------------------------------------------------------------------ */}
      {/* 1. TOP NAVBAR                                                      */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E7E5E4] px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-[#1C1917] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-[#1C1917]">
                TableSync
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                Live Table OS
              </span>
            </div>
          </Link>

          {/* Quick Demos & Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-stone-600">
            <Link
              href="/r/grand-empire/t/5"
              target="_blank"
              className="px-3 py-1.5 rounded-xl hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1"
            >
              <span>Live Customer Demo</span>
              <ExternalLink className="w-3 h-3 text-stone-400" />
            </Link>

            <Link
              href="/kds/grand-empire"
              target="_blank"
              className="px-3 py-1.5 rounded-xl hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1"
            >
              <span>Kitchen Display Demo</span>
              <ExternalLink className="w-3 h-3 text-stone-400" />
            </Link>

            <Link
              href="/admin/grand-empire"
              target="_blank"
              className="px-3 py-1.5 rounded-xl hover:text-stone-900 hover:bg-stone-100 transition-colors flex items-center gap-1"
            >
              <span>Admin Portal Demo</span>
              <ExternalLink className="w-3 h-3 text-stone-400" />
            </Link>
          </nav>

          {/* Right Action: Smooth scroll to setup */}
          <div className="flex items-center gap-2">
            <a
              href="#onboard"
              className="px-4 py-2 bg-[#1C1917] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>Launch Your Hotel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* 2. HERO SECTION                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative px-4 sm:px-8 pt-16 sm:pt-24 pb-16 max-w-7xl mx-auto overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-amber-100/40 via-orange-100/20 to-stone-100/30 blur-3xl rounded-full pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#E7E5E4] shadow-2xs text-xs font-semibold text-stone-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Multiplayer Dining OS for India</span>
              <span className="text-stone-300">•</span>
              <span className="text-stone-500 font-mono">Zero POS changes</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1C1917] tracking-tight leading-[1.1] sm:leading-[1.15]">
              Every Guest Orders Together.{" "}
              <span className="underline decoration-stone-300 decoration-wavy decoration-2">
                One Shared Table Cart.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-stone-600 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Built for multi-cuisine hotels, cafes, and family restaurants across India. Zero app
              downloads for guests. Zero changes to your existing billing POS.
            </p>

            {/* Primary CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link
                href="/r/grand-empire/t/5"
                target="_blank"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#1C1917] hover:bg-black text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <span>Try Live Table 5 Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#onboard"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-stone-50 text-[#1C1917] border border-[#E7E5E4] text-sm font-bold flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <span>Launch Your Hotel Free</span>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </a>
            </div>

            {/* Social Proof Checklist */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4 text-xs font-medium text-stone-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Instant QR Table Tent Generator</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Audio Kitchen Display System</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Arabic, Chinese &amp; Indian Modifiers</span>
              </div>
            </div>
          </div>

          {/* Right Column: Signature Design System Visual Preview Card */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="w-full max-w-md bg-white border border-[#E7E5E4] rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-all hover:shadow-2xl">
              {/* Top Bar with Live Table Pill */}
              <div className="flex flex-col items-center gap-3 pb-5 border-b border-stone-100">
                <div className="text-[11px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1">
                  <span>Interactive Live Preview</span>
                </div>

                {/* Signature Element 1: "Live Table Pill" (Dynamic Presence Island) */}
                <div className="backdrop-blur-md bg-white/95 border border-[#E7E5E4] shadow-sm rounded-full px-4 py-1.5 flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-extrabold text-xs text-[#1C1917] tracking-tight">
                      Table 5
                    </span>
                  </div>
                  <span className="text-stone-300">•</span>
                  <div className="flex items-center gap-2 text-xs font-medium text-stone-700">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E07A5F]" />
                      <span>Rahul</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#81B29A]" />
                      <span>Sneha</span>
                    </span>
                    {interactiveItems.length >= 4 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F2CC8F]" />
                        <span>Aman</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Signature Element 2: "Tactile Paper Ticket" with Serrated Edges */}
              <div className="mt-5 bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl p-4 relative shadow-inner">
                {/* Perforated side punch holes */}
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-r border-[#E7E5E4]" />
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-l border-[#E7E5E4]" />

                {/* Ticket Header */}
                <div className="flex items-center justify-between text-xs font-mono font-bold text-stone-700 border-b border-dashed border-stone-300 pb-2">
                  <span>ROUND 1 • SHARED TICKET</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active
                  </span>
                </div>

                {/* Ticket Items List */}
                <div className="py-3 space-y-2.5">
                  {interactiveItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between text-xs font-medium text-[#1C1917]"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                          <span>{item.name}</span>
                        </div>
                        <div className="text-[10px] text-stone-500 font-mono">
                          {item.portion} • Added by {item.by}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-stone-900">
                        ₹{item.price}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ticket Perforated Divider */}
                <div className="border-t border-dashed border-stone-300 pt-2.5 flex items-center justify-between text-xs font-bold text-stone-800">
                  <span className="font-mono uppercase tracking-wider text-stone-500">
                    Shared Table Total
                  </span>
                  <span className="font-mono text-sm text-[#1C1917] font-black">
                    ₹{sampleTotal}
                  </span>
                </div>

                {/* Serrated Zigzag Edge at ticket bottom */}
                <div className="pt-3 flex justify-center">
                  <svg
                    className="w-full h-2 text-stone-300"
                    viewBox="0 0 100 8"
                    preserveAspectRatio="none"
                  >
                    <polygon
                      points="0,0 5,8 10,0 15,8 20,0 25,8 30,0 35,8 40,0 45,8 50,0 55,8 60,0 65,8 70,0 75,8 80,0 85,8 90,0 95,8 100,0"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>

              {/* Interactive trigger to demonstrate live additions */}
              <div className="mt-4 pt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-stone-500">
                  {interactiveItems.length >= 5 ? "Reset to test again" : "Simulate guest live action:"}
                </span>
                <button
                  type="button"
                  onClick={handleAddSampleItem}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {interactiveItems.length >= 5 ? "Reset Preview" : "+ Add Friend's Dish"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. BUILT FOR MULTI-CUISINE HOTELS (3 Minimalist Feature Cards)     */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-4 sm:px-8 py-16 sm:py-24 max-w-7xl mx-auto border-t border-[#E7E5E4]">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-900 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Engineered for Indian Dining Culture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            Why Multi-Cuisine Hotels Love TableSync
          </h2>
          <p className="text-sm sm:text-base text-stone-600">
            No friction for guests, no operational disruption for your kitchen or cash counter.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature Card 1: Multi-Cuisine Ready */}
          <div className="bg-white border border-[#E7E5E4] rounded-3xl p-6 sm:p-8 shadow-2xs hover:shadow-sm transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#1C1917]">Multi-Cuisine Ready</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Supports Arabic grills (Quarter/Half/Full portions), Chinese, Western, and Indian
                menus with Veg/Non-Veg indicators and customizable paid add-ons.
              </p>
            </div>
            <div className="pt-2 text-xs font-mono text-stone-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>FSSAI Veg/Non-Veg indicators included</span>
            </div>
          </div>

          {/* Feature Card 2: Live Table Sync */}
          <div className="bg-white border border-[#E7E5E4] rounded-3xl p-6 sm:p-8 shadow-2xs hover:shadow-sm transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 flex items-center justify-center">
              <Users className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#1C1917]">Live Table Sync</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Guests see what friends add in real time and confirm together before sending to the
                kitchen. Eliminates duplicate dishes and confused waiters.
              </p>
            </div>
            <div className="pt-2 text-xs font-mono text-stone-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Collaborative table voting consensus</span>
            </div>
          </div>

          {/* Feature Card 3: Zero POS Headache */}
          <div className="bg-white border border-[#E7E5E4] rounded-3xl p-6 sm:p-8 shadow-2xs hover:shadow-sm transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-900 flex items-center justify-center">
              <ChefHat className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#1C1917]">Zero POS Headache</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Orders appear instantly on a simple kitchen tablet with an audible chime—staff punch
                bills into your existing POS as usual with zero hardware lock-in.
              </p>
            </div>
            <div className="pt-2 text-xs font-mono text-stone-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Works with Petpooja, POSist, or manual billing</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. TRANSPARENT PRICING IN ₹ (Monospace Numerals)                   */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-4 sm:px-8 py-16 sm:py-24 max-w-7xl mx-auto border-t border-[#E7E5E4]">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-stone-600 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
            <span>Fair &amp; Transparent</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            Simple Flat Monthly Pricing in ₹
          </h2>
          <p className="text-sm sm:text-base text-stone-600">
            Keep 100% of your bill revenue. Zero commissions on orders. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {/* Plan 1: Starter Cafe */}
          <div className="bg-white border border-[#E7E5E4] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xs space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-[#1C1917]">Starter Cafe</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Ideal for quick-service bistros, cafes, and bakeries.
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black font-mono tracking-tight text-[#1C1917]">
                  ₹999
                </span>
                <span className="text-xs font-mono text-stone-500">/month</span>
              </div>

              <ul className="space-y-2.5 text-xs text-stone-700 pt-2 border-t border-stone-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Up to 10 Dining Tables</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Unlimited Menu Items &amp; Categories</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Print-Ready QR Table Tent Generator</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Live Shared Table Cart for Guests</span>
                </li>
              </ul>
            </div>

            <a
              href="#onboard"
              className="w-full py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-900 font-semibold text-xs text-center transition-all cursor-pointer block"
            >
              Get Started
            </a>
          </div>

          {/* Plan 2: Family Restaurant (Featured) */}
          <div className="bg-white border-2 border-[#1C1917] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl space-y-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1C1917] text-white text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
              Most Popular
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-[#1C1917]">Family Restaurant</h3>
                <p className="text-xs text-stone-500 mt-1">
                  For bustling multi-cuisine hotels, family diners, and restobars.
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black font-mono tracking-tight text-[#1C1917]">
                  ₹1,999
                </span>
                <span className="text-xs font-mono text-stone-500">/month</span>
              </div>

              <ul className="space-y-2.5 text-xs text-stone-700 pt-2 border-t border-stone-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Up to 30 Dining Tables</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Live Kitchen Display System (KDS) Tablet View</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Multi-Round Ordering (Starters, Mains, Desserts)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Audible Kitchen New Order Chimes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Priority WhatsApp Support</span>
                </li>
              </ul>
            </div>

            <a
              href="#onboard"
              className="w-full py-2.5 rounded-xl bg-[#1C1917] hover:bg-black text-white font-semibold text-xs text-center transition-all shadow-xs cursor-pointer block"
            >
              Start Free 14-Day Trial
            </a>
          </div>

          {/* Plan 3: Grand Hotel */}
          <div className="bg-white border border-[#E7E5E4] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xs space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-[#1C1917]">Grand Hotel</h3>
                <p className="text-xs text-stone-500 mt-1">
                  For large multi-floor banquets, resorts, and high-volume hotels.
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black font-mono tracking-tight text-[#1C1917]">
                  ₹3,499
                </span>
                <span className="text-xs font-mono text-stone-500">/month</span>
              </div>

              <ul className="space-y-2.5 text-xs text-stone-700 pt-2 border-t border-stone-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Unlimited Dining Tables</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Multi-Counter Routing (Kitchen + Bar + Grill)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Custom Table Tent Branding with Hotel Logo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dedicated Onboarding Manager &amp; Staff Training</span>
                </li>
              </ul>
            </div>

            <a
              href="#onboard"
              className="w-full py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-900 font-semibold text-xs text-center transition-all cursor-pointer block"
            >
              Contact Hotel Sales
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. INSTANT SELF-SERVE ONBOARDING FORM                             */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="onboard"
        className="px-4 sm:px-8 py-16 sm:py-24 max-w-4xl mx-auto border-t border-[#E7E5E4]"
      >
        <div className="bg-white border-2 border-[#E7E5E4] rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#1C1917] text-white flex items-center justify-center mx-auto shadow-xs">
                <Store className="w-6 h-6 stroke-[2]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] tracking-tight">
                Set Up Your Hotel in 30 Seconds
              </h2>
              <p className="text-xs sm:text-sm text-stone-600">
                Enter your details to generate your live admin portal, pre-seeded multi-cuisine menu,
                and printable table QR codes instantly.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-center">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  Hotel / Restaurant Name *
                </label>
                <input
                  type="text"
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  placeholder="e.g. Royal Malabar Hotel"
                  required
                  className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl px-4 py-3 text-sm font-semibold text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#1C1917] focus:bg-white transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  City / Location (Optional)
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Kochi, Bengaluru, Mumbai"
                  className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl px-4 py-3 text-sm font-medium text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#1C1917] focus:bg-white transition-all shadow-2xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !hotelName.trim()}
                className="w-full py-3.5 bg-[#1C1917] hover:bg-black text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Setting up your kitchen &amp; menu...</span>
                  </>
                ) : (
                  <>
                    <span>Launch My Hotel Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-stone-500">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-1">
                <Printer className="w-4 h-4 text-stone-600" />
                <span>Instant QR Table Tents</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Ready in 30 Seconds</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 6. FOOTER                                                          */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-[#E7E5E4] bg-white px-4 sm:px-8 py-10 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#1C1917] text-white flex items-center justify-center">
              <UtensilsCrossed className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-stone-900">TableSync</span>
            <span>• Collaborative Live Dining for India</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/r/grand-empire/t/5" className="hover:text-stone-900 transition-colors">
              Customer Demo
            </Link>
            <Link href="/kds/grand-empire" className="hover:text-stone-900 transition-colors">
              Kitchen Display
            </Link>
            <Link href="/admin/grand-empire" className="hover:text-stone-900 transition-colors">
              Admin Portal
            </Link>
          </div>

          <div className="font-mono text-[11px] text-stone-400">
            © 2026 TableSync India. All prices formatted in ₹ INR.
          </div>
        </div>
      </footer>
    </div>
  );
}
