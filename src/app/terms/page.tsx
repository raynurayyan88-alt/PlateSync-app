import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import MarketingHeader from "@/components/MarketingHeader";
import { FileText, Scale, ShieldAlert, CheckCircle2, Mail, MapPin, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | PlateSync Technologies",
  description:
    "PlateSync Terms of Service and SaaS commercial licensing terms. Governed by the laws of India with jurisdiction in Kerala.",
};

export default function TermsOfServicePage() {
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

        {/* Page Title & Jurisdiction Header */}
        <div className="space-y-3 mb-10 pb-8 border-b border-[#E7E5E4]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold tracking-wide">
            <Scale className="w-3.5 h-3.5" />
            <span>Governed by the Laws of India • Kerala Jurisdiction</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 font-medium">
            Effective Date: January 1, 2026 • PlateSync Technologies • Kerala, India
          </p>
        </div>

        {/* Document Body */}
        <div className="space-y-10 text-sm sm:text-base text-stone-700 leading-relaxed">
          {/* Section 1: Agreement to Terms */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              1. Acceptance of Terms
            </h2>
            <p>
              These Terms of Service (<strong>&ldquo;Terms&rdquo;</strong>) constitute a legally binding agreement between <strong>PlateSync Technologies</strong> (<strong>&ldquo;PlateSync&rdquo;</strong>, <strong>&ldquo;we&rdquo;</strong>, <strong>&ldquo;us&rdquo;</strong>, founded by <strong>Mohd Rayyan</strong>, Kerala, India) and you, whether as a restaurant operator, hotelier, licensee (<strong>&ldquo;Subscriber&rdquo;</strong>), or dining customer (<strong>&ldquo;End User&rdquo;</strong>).
            </p>
            <p>
              By accessing our website, creating a restaurant account, scanning a table QR code, or utilizing our Kitchen Display System (KDS), you agree to be bound by these Terms and our Privacy Policy. If you do not agree to all terms, you must not access or use PlateSync.
            </p>
          </section>

          {/* Section 2: Scope of Service */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              2. Scope of Service &amp; Software Licensing
            </h2>
            <p>
              PlateSync is a cloud-based Software-as-a-Service (SaaS) application providing:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-stone-600">
              <li>Collaborative multiplayer QR menu ordering for guests seated at a physical table.</li>
              <li>Consensus approval voting (&ldquo;Looks Good!&rdquo;) prior to round dispatch.</li>
              <li>Real-time Kitchen Display System (KDS) order routing and chimes for kitchen staff.</li>
              <li>Consolidated multi-round Master Bill aggregation for front-desk cashier settlement.</li>
              <li>Admin portal for dish management, category organization, and table QR code generation.</li>
            </ul>
            <p className="text-xs sm:text-sm text-stone-600">
              PlateSync grants the Subscriber a non-exclusive, non-transferable, revocable subscription license to use the platform solely for internal commercial dining operations.
            </p>
          </section>

          {/* Section 3: Ultimate Billing Authority Disclaimer (Critical) */}
          <section className="bg-white border-2 border-[#E7E5E4] rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-orange-100 text-orange-800 shrink-0">
                <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#1C1917]">
                  3. Disclaimer: Existing Hotel POS as Ultimate Billing Authority
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 mt-1 font-medium">
                  PlateSync is a table communication and kitchen routing intermediary, not a tax billing POS or payment aggregator.
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-stone-600 space-y-2 border-t border-stone-100 pt-3">
              <p>
                <strong>The Subscriber&rsquo;s physical Point of Sale (POS) machine or registered cash register remains the sole and ultimate authority</strong> for generating official GST tax invoices, fiscal billing receipts, service charges, discounts, and payment collections.
              </p>
              <p>
                PlateSync calculates item totals for group ordering convenience only. Any discrepancy between PlateSync table estimates and the hotel&rsquo;s physical bill shall be superseded entirely by the hotelier&rsquo;s primary billing register.
              </p>
              <p>
                PlateSync does not hold, escrow, or process monetary payments between diners and restaurants. All customer payments (cash, card, UPI QR, or vouchers) are settled directly with restaurant staff.
              </p>
            </div>
          </section>

          {/* Section 4: SaaS Subscriptions & Billing */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              4. SaaS Subscriptions, Fees &amp; Renewals
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Subscription tiers (Starter Cafe ₹999/mo, Family Restaurant ₹1999/mo, Grand Hotel ₹3499/mo) are billed in Indian Rupees (₹ INR) on a monthly recurring basis. Subscriptions automatically renew unless canceled prior to the renewal date.
            </p>
            <p className="text-xs sm:text-sm text-stone-600">
              All plans include an unconditional <strong>14-day money-back guarantee</strong> for new hoteliers, as detailed in our Cancellation &amp; Refund Policy.
            </p>
          </section>

          {/* Section 5: Hotelier Responsibilities */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              5. Subscriber Responsibilities &amp; FSSAI Compliance
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              The Subscriber agrees that:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-stone-600">
              <li>It maintains valid regulatory licenses to operate a food establishment in India, including Food Safety and Standards Authority of India (FSSAI) registrations.</li>
              <li>Menu pricing, portion descriptions, allergen disclosures (e.g., nuts, gluten), and food hygiene remain the exclusive responsibility of the Subscriber.</li>
              <li>It will place QR codes only on physical dining tables under its lawful operational possession.</li>
            </ul>
          </section>

          {/* Section 6: Acceptable Use */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              6. Acceptable Use Policy
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Users agree not to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-stone-600">
              <li>Deploy automated bots, scrapers, or scripts to flood table sessions with fraudulent orders.</li>
              <li>Decompile, reverse-engineer, or attempt to extract the source code or proprietary socket protocols of PlateSync.</li>
              <li>Input abusive, defamatory, or unlawful text into guest nicknames or item modifier notes.</li>
            </ul>
          </section>

          {/* Section 7: Limitation of Liability */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              7. Limitation of Liability
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              To the fullest extent permitted by applicable Indian law, PlateSync Technologies and its founder Mohd Rayyan shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, dining revenue, business goodwill, or data loss arising from temporary service interruptions or local network outages.
            </p>
            <p className="text-xs sm:text-sm text-stone-600">
              In any event, PlateSync&rsquo;s maximum aggregate liability arising out of or related to these Terms shall not exceed the subscription fees actually paid by the Subscriber in the three (3) months immediately preceding the event giving rise to liability.
            </p>
          </section>

          {/* Section 8: Governing Law & Jurisdiction */}
          <section className="bg-white border border-[#E7E5E4] rounded-3xl p-6 sm:p-8 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2.5 text-[#1C1917] font-bold text-base sm:text-lg">
              <Scale className="w-5 h-5 text-stone-900 shrink-0" />
              <h3>8. Governing Law &amp; Dispute Jurisdiction</h3>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              These Terms, and any dispute, controversy, or claim arising out of or relating to them or the breach, termination, or invalidity thereof, shall be governed by and construed in accordance with the <strong>laws of the Republic of India</strong>.
            </p>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              The parties mutually agree that any legal proceedings or arbitration arising hereunder shall be subject to the <strong>exclusive territorial jurisdiction of the competent courts situated in the State of Kerala, India</strong>.
            </p>
          </section>

          {/* Section 9: Official Contact */}
          <section className="space-y-3 pb-8 border-b border-[#E7E5E4]">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              9. Contact Information &amp; Official Inquiries
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              For any questions or legal notices regarding these Terms of Service, please contact:
            </p>
            <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 space-y-2 text-xs sm:text-sm">
              <div className="font-bold text-[#1C1917]">Mohd Rayyan — Founder &amp; Architect</div>
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
