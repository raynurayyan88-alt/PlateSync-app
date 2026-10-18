import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import MarketingHeader from "@/components/MarketingHeader";
import { ShieldCheck, Lock, Clock, Mail, MapPin, AlertCircle, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | PlateSync Technologies",
  description:
    "PlateSync Privacy Policy compliant with the Digital Personal Data Protection (DPDP) Act 2023 and Indian IT Rules. Details our strict zero-payment-card data policy and 2-hour table session expiry.",
};

export default function PrivacyPolicyPage() {
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

        {/* Page Title & Compliance Header */}
        <div className="space-y-3 mb-10 pb-8 border-b border-[#E7E5E4]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>DPDP Act 2023 &amp; IT Rules Compliant</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 font-medium">
            Effective Date: January 1, 2026 • Last Reviewed: 2026 • PlateSync Technologies (Kerala, India)
          </p>
        </div>

        {/* Document Body */}
        <div className="space-y-10 text-sm sm:text-base text-stone-700 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              1. Introduction &amp; Data Fiduciary Identity
            </h2>
            <p>
              PlateSync Technologies (<strong>&ldquo;PlateSync&rdquo;</strong>, <strong>&ldquo;we&rdquo;</strong>, <strong>&ldquo;our&rdquo;</strong>, or <strong>&ldquo;us&rdquo;</strong>), operated under the leadership of Founder <strong>Mohd Rayyan</strong> based in Kerala, India, provides digital restaurant table ordering synchronization software and Kitchen Display System (KDS) services to food and beverage establishments.
            </p>
            <p>
              This Privacy Policy explains how PlateSync collects, handles, and safeguards information when diners and hotel staff interact with our web application, complying with India&rsquo;s <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> and the <strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong>.
            </p>
          </section>

          {/* Section 2: Zero Payment Card Storage (Highlighted Alert Card) */}
          <section className="bg-white border-2 border-amber-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                <Lock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#1C1917]">
                  2. Strict Payment Data Exclusion Policy
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">
                  <strong>PlateSync does NOT collect, capture, process, or store financial banking credentials or card data.</strong>
                </p>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-stone-600 space-y-2 border-t border-amber-100 pt-3">
              <p>
                We do not collect credit card numbers, debit card numbers, CVVs, card expiry dates, UPI MPINs, net banking passwords, or bank account statements.
              </p>
              <p>
                PlateSync operates strictly as an in-restaurant collaborative food ordering and kitchen dispatch communication tool. All payments, billing settlement receipts, and physical cash/card transactions remain under the sole and independent authority of the restaurant or hotel&rsquo;s registered billing Point of Sale (POS) counter.
              </p>
            </div>
          </section>

          {/* Section 3: Data We Collect */}
          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              3. Information We Collect and Process
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  Table Diners (End Users)
                </h4>
                <p className="text-xs sm:text-sm text-stone-600">
                  <strong>Temporary Display Name:</strong> A chosen first name or nickname (e.g., &ldquo;Rahul&rdquo;, &ldquo;Sneha&rdquo;) provided upon joining a dining table, used solely to identify who added dishes to the shared cart.
                </p>
                <p className="text-xs sm:text-sm text-stone-600">
                  <strong>Cart &amp; Order Selections:</strong> Selected dishes, portion sizes, custom notes (e.g., &ldquo;No spicy&rdquo;), approval votes (&ldquo;Looks Good!&rdquo;), and timestamps.
                </p>
              </div>

              <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-stone-900" />
                  Restaurant Owners (Hoteliers)
                </h4>
                <p className="text-xs sm:text-sm text-stone-600">
                  <strong>Establishment Details:</strong> Restaurant name, city/state, slug identifier, table numbers, and menu category configuration.
                </p>
                <p className="text-xs sm:text-sm text-stone-600">
                  <strong>Contact Credentials:</strong> Business email address and phone or WhatsApp contact number provided during account registration or support requests.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: 2-Hour Auto-Expiry Policy */}
          <section className="bg-white border border-[#E7E5E4] rounded-3xl p-6 sm:p-8 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2.5 text-stone-900 font-bold text-base sm:text-lg">
              <Clock className="w-5 h-5 text-orange-600 shrink-0" />
              <h3>4. 2-Hour Automatic Table Session Expiry</h3>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              To guarantee data minimization under the DPDP Act, live table sessions (<code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-800 text-xs font-mono">session:[slug]:[tableNumber]</code>) and active diner carts are strictly ephemeral.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-stone-600">
              <li>Sessions automatically expire and purge active browser connections after <strong>2 hours</strong> of inactivity.</li>
              <li>When the cashier clicks &ldquo;Bill Paid &amp; Reset Table&rdquo; in the KDS counter view, the live session is terminated and client memory stores are reset immediately.</li>
              <li>No persistent tracking cookies or cross-site fingerprinting scripts are placed on guest mobile devices.</li>
            </ul>
          </section>

          {/* Section 5: Purpose of Processing */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              5. Purpose of Data Processing
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              We process personal data solely for specific, legitimate dining operations:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-stone-600">
              <li>Synchronizing live order additions across multiple phones seated at the same physical restaurant table in real time.</li>
              <li>Enabling democratic order review consensus (&ldquo;Looks Good!&rdquo; voting) before transmitting orders to the kitchen.</li>
              <li>Displaying kitchen order tickets (KOT) on the chef&rsquo;s Kitchen Display System screen and cashier summary desk.</li>
              <li>Providing technical assistance, diagnostic debugging, and system uptime maintenance.</li>
            </ul>
            <p className="text-xs sm:text-sm font-semibold text-stone-800 pt-1">
              PlateSync never sells, trades, or rents personal data to third-party ad networks or brokers.
            </p>
          </section>

          {/* Section 6: Security & Cloud Infrastructure */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              6. Data Security &amp; Storage
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              We maintain reasonable technical and organizational security controls to protect information against unauthorized access, alteration, disclosure, or destruction. All communication between mobile browsers and PlateSync servers occurs over encrypted HTTPS/TLS 1.3 channels. Backend data is hosted on enterprise cloud infrastructure with strict access controls.
            </p>
          </section>

          {/* Section 7: Grievance Officer */}
          <section className="bg-white border-2 border-[#E7E5E4] rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5 text-[#1C1917]">
              <AlertCircle className="w-5 h-5 text-stone-900 shrink-0" />
              <h3 className="text-base sm:text-lg font-extrabold">
                7. Designated Grievance Redressal Officer
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-stone-600">
              In accordance with Section 13 of the Digital Personal Data Protection Act, 2023 and Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the designated Grievance Officer for PlateSync Technologies is:
            </p>

            <div className="bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl p-5 space-y-2 text-xs sm:text-sm">
              <div className="font-bold text-[#1C1917] text-base">Mohd Rayyan</div>
              <div className="text-stone-600 font-medium">Founder &amp; Data Grievance Officer</div>
              <div className="text-stone-600">PlateSync Technologies</div>
              <div className="flex items-center gap-2 pt-1 text-stone-700">
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

            <p className="text-xs text-stone-500 pt-1">
              Grievances are acknowledged within 24 hours and addressed within 36 to 48 business hours.
            </p>
          </section>

          {/* Section 8: Rights of Data Principals */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              8. Rights of Data Principals
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              Under Indian law, data principals have the right to request access to their personal data, seek rectification of inaccurate information, and request erasure of personal data once the specified dining purpose has been fulfilled. You may exercise these rights at any time by contacting our Grievance Officer at <a href="mailto:mohdrayyan@platesync.in" className="font-medium text-[#1C1917] underline">mohdrayyan@platesync.in</a>.
            </p>
          </section>

          {/* Section 9: Updates to Policy */}
          <section className="space-y-3 pb-8 border-b border-[#E7E5E4]">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              9. Updates to this Policy
            </h2>
            <p className="text-xs sm:text-sm text-stone-600">
              We may update this Privacy Policy periodically to reflect technological improvements or legislative amendments in India. Continued use of PlateSync after any modifications signifies acceptance of the revised policy.
            </p>
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
