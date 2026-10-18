"use client";

import React, { useState } from "react";
import Link from "next/link";
import MarketingHeader from "@/components/MarketingHeader";
import {
  Mail,
  MessageSquare,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  Send,
  Building2,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

export default function ContactPageClient() {
  const [formData, setFormData] = useState({
    name: "",
    restaurantName: "",
    city: "",
    phone: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate submission / webhook dispatch
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  const whatsappMessage = encodeURIComponent(
    `Hi Rayyan, I'm reaching out from ${
      formData.restaurantName || "my restaurant"
    }${formData.city ? ` in ${formData.city}` : ""}. I'd like to explore PlateSync table ordering.`
  );
  const whatsappUrl = `https://wa.me/919995550000?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <MarketingHeader />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-20 w-full">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct Founder Access</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1C1917] tracking-tight">
            Talk to Founder Mohd Rayyan
          </h1>
          <p className="text-sm sm:text-base text-stone-600 max-w-2xl mx-auto">
            Have questions about table QR tents, your current POS workflow, or custom restaurant setup? Reach out directly — no automated call trees, no middle agents.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Direct Business Contact Cards (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Founder Card */}
            <div className="bg-white border border-[#E7E5E4] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#1C1917] text-white flex items-center justify-center text-lg font-black shadow-sm shrink-0">
                  MR
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#1C1917]">
                    Mohd Rayyan
                  </h3>
                  <p className="text-xs font-semibold text-stone-600">
                    Founder &amp; Architect, PlateSync
                  </p>
                  <p className="text-[11px] text-stone-400">Kerala, India</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                &ldquo;I review every restaurant inquiry personally. Whether you run a 6-table cafe in Calicut or a 40-table family hotel in Bengaluru, we&rsquo;ll get your tables live without disrupting your cashier desk.&rdquo;
              </p>

              <div className="pt-2 border-t border-stone-100 space-y-3 text-xs sm:text-sm text-stone-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 text-stone-600">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-stone-500 uppercase tracking-wider block font-bold">
                      Official Founder Email
                    </span>
                    <a
                      href="mailto:mohdrayyan@platesync.in"
                      className="font-bold text-[#1C1917] hover:underline"
                    >
                      mohdrayyan@platesync.in
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 text-stone-600">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-stone-500 uppercase tracking-wider block font-bold">
                      Operating Location
                    </span>
                    <span className="font-semibold text-[#1C1917]">
                      Kerala, India 🇮🇳
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-emerald-800 uppercase tracking-wider block font-bold">
                      Response Guarantee
                    </span>
                    <span className="font-semibold text-stone-900">
                      We respond to all hotelier inquiries within 2–4 business hours.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instant WhatsApp Direct Card */}
            <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm relative overflow-hidden">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Instant Messaging</span>
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  WhatsApp Direct Sales &amp; Onboarding
                </h3>
                <p className="text-xs text-emerald-200 leading-relaxed">
                  Need a demo link or have a specific question about your dining setup? Chat with Mohd Rayyan on WhatsApp for immediate onboarding help.
                </p>
              </div>

              <a
                href="https://wa.me/919995550000?text=Hi%20Rayyan,%20I'm%20interested%20in%20PlateSync%20for%20my%20restaurant"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs sm:text-sm font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open WhatsApp Chat</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <p className="text-[11px] text-emerald-300/80 text-center">
                Available Mon–Sat: 9 AM – 8 PM IST • Kitchen emergency priority 7 days/week
              </p>
            </div>
          </div>

          {/* Right Column: Hotelier Contact Form (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-[#E7E5E4] rounded-3xl p-6 sm:p-10 shadow-sm">
            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-[#1C1917]">
                  Thank You, {formData.name || "Hotelier"}!
                </h3>
                <p className="text-sm text-stone-600 max-w-md mx-auto">
                  Your inquiry for <strong>{formData.restaurantName || "your restaurant"}</strong> has been delivered directly to founder <strong>Mohd Rayyan</strong>.
                </p>
                <div className="p-4 bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl max-w-md mx-auto text-xs text-stone-600 space-y-1">
                  <div><strong>Guaranteed Response:</strong> Within 2–4 business hours</div>
                  <div><strong>Official Contact:</strong> mohdrayyan@platesync.in</div>
                </div>

                <div className="pt-4 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: "",
                        restaurantName: "",
                        city: "",
                        phone: "",
                        message: "",
                      });
                    }}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#1C1917] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Send Another Note
                  </button>
                  <Link
                    href="/"
                    className="px-4 py-2 bg-[#1C1917] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    Back to Homepage
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#1C1917] tracking-tight">
                    Send a Message to the Team
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-500 mt-1">
                    Fill out your restaurant details and we will get back to you with custom table recommendations and instant demo links.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Your Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                        Your Name *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="e.g. Rajesh Kumar"
                          className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#1C1917] focus:bg-white transition-all shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Restaurant Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                        Restaurant / Hotel Name *
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          required
                          value={formData.restaurantName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              restaurantName: e.target.value,
                            })
                          }
                          placeholder="e.g. Hotel Malabar Spice"
                          className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#1C1917] focus:bg-white transition-all shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* City / State */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                        City / State *
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          required
                          value={formData.city}
                          onChange={(e) =>
                            setFormData({ ...formData, city: e.target.value })
                          }
                          placeholder="e.g. Kozhikode, Kerala"
                          className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#1C1917] focus:bg-white transition-all shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* WhatsApp / Phone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                        WhatsApp / Phone Number *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          placeholder="+91 98765 43210"
                          className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#1C1917] focus:bg-white transition-all shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                      Message / Questions / Table Count
                    </label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      placeholder="Tell us about your restaurant: approximate number of tables, current cuisine, or any special kitchen routing requirements..."
                      className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl p-3.5 text-sm font-medium text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#1C1917] focus:bg-white transition-all shadow-2xs resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-[#1C1917] hover:bg-black text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending to Mohd Rayyan...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Message to Founder</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-2 flex items-center justify-center gap-2 text-xs text-stone-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    Your phone number is confidential and never shared with advertisers.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
