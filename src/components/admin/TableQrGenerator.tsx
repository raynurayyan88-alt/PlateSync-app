"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Printer,
  Download,
  QrCode as QrCodeIcon,
  Sliders,
  Sparkles,
  UtensilsCrossed,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

interface TableQrGeneratorProps {
  restaurantSlug: string;
  restaurantName: string;
}

interface TableCardData {
  tableNumber: number;
  url: string;
  svgString: string;
  pngDataUrl: string;
}

export default function TableQrGenerator({
  restaurantSlug,
  restaurantName,
}: TableQrGeneratorProps) {
  // Table count state: default 20 (e.g. Tables 1 to 20)
  const [tableCount, setTableCount] = useState<number>(20);
  const [customOrigin, setCustomOrigin] = useState<string>("");
  const [tableCards, setTableCards] = useState<TableCardData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedUrlTable, setCopiedUrlTable] = useState<number | null>(null);

  // Browser origin defaults to window.location.origin (e.g. *.trycloudflare.com)
  const currentBrowserOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const effectiveOrigin = (customOrigin.trim() || currentBrowserOrigin).replace(/\/+$/, "");

  // Generate QR codes (vector SVG and high-res PNG) for all tables
  useEffect(() => {
    let isCancelled = false;

    async function generateQRCodes() {
      const origin = (customOrigin.trim() || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/+$/, "");
      if (!origin) return;
      setIsGenerating(true);

      const count = Math.min(100, Math.max(1, tableCount));
      const cards: TableCardData[] = [];

      for (let i = 1; i <= count; i++) {
        const tableUrl = `${origin}/r/${encodeURIComponent(restaurantSlug)}/t/${i}`;
        try {
          // 1. Generate crisp vector SVG for direct inline rendering and razor-sharp printing
          const svgString = await QRCode.toString(tableUrl, {
            type: "svg",
            margin: 1,
            color: {
              dark: "#1C1917",
              light: "#FFFFFF",
            },
            errorCorrectionLevel: "M",
          });

          // 2. Generate high-res 400px PNG for download
          const pngDataUrl = await QRCode.toDataURL(tableUrl, {
            width: 400,
            margin: 1,
            color: {
              dark: "#1C1917",
              light: "#FFFFFF",
            },
            errorCorrectionLevel: "M",
          });

          cards.push({
            tableNumber: i,
            url: tableUrl,
            svgString,
            pngDataUrl,
          });
        } catch (err) {
          console.error(`Error generating QR for table ${i}:`, err);
        }
      }

      if (!isCancelled) {
        setTableCards(cards);
        setIsGenerating(false);
      }
    }

    generateQRCodes();

    return () => {
      isCancelled = true;
    };
  }, [tableCount, customOrigin, restaurantSlug]);

  // Trigger print dialog
  const handlePrint = () => {
    window.print();
  };

  // Download high-res PNG for a single card
  const handleDownloadPng = (card: TableCardData) => {
    const a = document.createElement("a");
    a.href = card.pngDataUrl;
    a.download = `${restaurantSlug}-table-${card.tableNumber}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download pure SVG for graphic designers & vinyl print shops
  const handleDownloadSvg = (card: TableCardData) => {
    const blob = new Blob([card.svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${restaurantSlug}-table-${card.tableNumber}-qr.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy table URL to clipboard
  const handleCopyUrl = async (tableNumber: number, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrlTable(tableNumber);
      setTimeout(() => setCopiedUrlTable(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Generator Controls (Hidden when printing via @media print)       */}
      {/* ------------------------------------------------------------------ */}
      <div className="print:hidden bg-white border border-[#E7E5E4] rounded-3xl p-5 sm:p-7 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#1C1917] text-white flex items-center justify-center">
                <QrCodeIcon className="w-4 h-4 stroke-[2.2]" />
              </span>
              <h2 className="text-lg font-bold text-[#1C1917] tracking-tight">
                Table QR Codes &amp; Tent Cards
              </h2>
            </div>
            <p className="text-xs text-stone-500">
              Generate scannable table cards for your dining area. Guests scan to join the live shared cart.
            </p>
          </div>

          {/* Primary Action: Print Table Cards */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={isGenerating || tableCards.length === 0}
            className="px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-black text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto active:scale-95 disabled:opacity-50"
          >
            <Printer className="w-4 h-4 stroke-[2.2]" />
            <span>Print Table Cards ({tableCards.length})</span>
          </button>
        </div>

        {/* Generator Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4 border-t border-[#E7E5E4]">
          {/* Table Count Selector: 1 to 20 (and up to 60) */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-stone-500" />
                <span>Number of Tables (e.g. 1 to {tableCount})</span>
              </label>
              <span className="font-mono text-xs font-bold text-stone-900 bg-stone-100 px-2.5 py-0.5 rounded-md border border-stone-200">
                {tableCount} Tables (Table 1 – {tableCount})
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="50"
                value={tableCount}
                onChange={(e) => setTableCount(Number(e.target.value))}
                className="flex-1 accent-stone-900 cursor-pointer"
              />
              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-400 font-mono">Qty:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={tableCount}
                  onChange={(e) =>
                    setTableCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))
                  }
                  className="w-16 bg-[#FAF9F6] border border-[#E7E5E4] rounded-lg px-2 py-1 text-xs font-mono font-bold text-center text-[#1C1917] focus:outline-none focus:border-stone-900"
                />
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-stone-400 mr-1">Presets:</span>
              {[5, 10, 15, 20, 30].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTableCount(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer border ${
                    tableCount === preset
                      ? "bg-stone-900 text-white border-stone-900"
                      : "bg-[#FAF9F6] hover:bg-stone-100 text-stone-700 border-stone-200"
                  }`}
                >
                  {preset} Tables
                </button>
              ))}
            </div>
          </div>

          {/* Origin URL Input */}
          <div className="lg:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Menu Origin URL
              </label>
              {customOrigin.trim() && (
                <button
                  type="button"
                  onClick={() => setCustomOrigin("")}
                  className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 underline cursor-pointer"
                >
                  Use Current Origin ({currentBrowserOrigin ? new URL(currentBrowserOrigin).host : "browser"})
                </button>
              )}
            </div>
            <input
              type="text"
              value={customOrigin}
              onChange={(e) => setCustomOrigin(e.target.value)}
              placeholder={currentBrowserOrigin || "e.g. https://xxxx.trycloudflare.com"}
              className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl px-3.5 py-2 text-xs font-mono text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
            />
            <p className="text-[11px] text-stone-400 leading-tight">
              Points each QR to <code className="text-stone-700 font-mono">{(effectiveOrigin || "http://...")}/r/{restaurantSlug}/t/[table]</code>
            </p>
          </div>
        </div>

        {/* Pro-Tip Box */}
        <div className="flex items-center gap-2.5 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-950">
          <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Print Ready:</strong> Tapping <strong>&ldquo;Print Table Cards&rdquo;</strong> will format these cards into a crisp 2-column layout on A4 / US Letter paper. The admin navigation bar and controls are automatically hidden during printing.
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Print-Ready Table Cards Grid (Light Theme)                      */}
      {/* ------------------------------------------------------------------ */}
      <div id="printable-table-cards">
        {isGenerating ? (
          <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-stone-200">
            <div className="w-9 h-9 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-stone-600">Generating Vector SVG QR Codes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:grid-cols-2 print:gap-6 print:p-0">
            {tableCards.map((card) => {
              const displayUrl = card.url.replace(/^https?:\/\//, "");

              return (
                <div
                  key={card.tableNumber}
                  className="bg-white border-2 border-[#E7E5E4] print:border-2 print:border-stone-800 rounded-3xl p-6 text-center flex flex-col items-center justify-between shadow-2xs relative overflow-hidden transition-all hover:border-stone-400 print:shadow-none print:break-inside-avoid print:p-6"
                >
                  {/* Card Header: Restaurant Name & Table [X] */}
                  <div className="w-full space-y-2 border-b border-dashed border-stone-200 pb-4">
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-600">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-stone-800" />
                      <span className="truncate max-w-[200px]">{restaurantName}</span>
                    </div>

                    {/* Table [X] Identifier Badge */}
                    <div className="inline-block bg-[#1C1917] text-white font-mono font-black text-base sm:text-lg tracking-wider px-4 py-1.5 rounded-full uppercase shadow-xs">
                      Table {card.tableNumber}
                    </div>
                  </div>

                  {/* Scannable Vector SVG QR Code */}
                  <div className="py-4 flex flex-col items-center w-full">
                    <div className="p-3 bg-white border border-stone-200 rounded-2xl shadow-inner inline-block">
                      <div
                        className="w-40 h-40 sm:w-44 sm:h-44 [&>svg]:w-full [&>svg]:h-full"
                        dangerouslySetInnerHTML={{ __html: card.svgString }}
                        title={`Table ${card.tableNumber} QR Code`}
                      />
                    </div>

                    {/* Direct URL text below QR */}
                    <div className="mt-2 flex items-center justify-center gap-1 max-w-[240px]">
                      <span className="font-mono text-[10px] text-stone-500 truncate" title={card.url}>
                        {displayUrl}
                      </span>
                      <a
                        href={card.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone-400 hover:text-stone-800 print:hidden shrink-0"
                        title="Open table URL in new tab"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* 3-Step Guest Instructions */}
                  <div className="w-full border-t border-dashed border-stone-200 pt-3.5 space-y-2.5">
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-stone-600">
                      How to Order • 3 Easy Steps
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-left bg-stone-50/80 rounded-xl p-2.5 border border-stone-200">
                      {/* Step 1 */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-stone-900">
                          <span className="w-4 h-4 rounded-full bg-stone-900 text-white text-[9px] font-mono flex items-center justify-center shrink-0">
                            1
                          </span>
                          <span className="truncate">Scan QR</span>
                        </div>
                        <p className="text-[9px] text-stone-600 leading-tight">
                          Open camera &amp; point at code
                        </p>
                      </div>

                      {/* Step 2 */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-stone-900">
                          <span className="w-4 h-4 rounded-full bg-stone-900 text-white text-[9px] font-mono flex items-center justify-center shrink-0">
                            2
                          </span>
                          <span className="truncate">Add Food</span>
                        </div>
                        <p className="text-[9px] text-stone-600 leading-tight">
                          Pick dishes to live shared cart
                        </p>
                      </div>

                      {/* Step 3 */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-stone-900">
                          <span className="w-4 h-4 rounded-full bg-stone-900 text-white text-[9px] font-mono flex items-center justify-center shrink-0">
                            3
                          </span>
                          <span className="truncate">Order!</span>
                        </div>
                        <p className="text-[9px] text-stone-600 leading-tight">
                          Vote together &amp; send to chef
                        </p>
                      </div>
                    </div>

                    <div className="text-[9px] text-stone-500 font-medium">
                      Live Sync • No App Download Required • PlateSync
                    </div>
                  </div>

                  {/* Actions for Single Card (Hidden when printing) */}
                  <div className="mt-3 pt-2.5 w-full flex items-center justify-center gap-2 print:hidden border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(card.tableNumber, card.url)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copy URL"
                    >
                      {copiedUrlTable === card.tableNumber ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadPng(card)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Download PNG"
                    >
                      <Download className="w-3 h-3" />
                      <span>PNG</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadSvg(card)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Download vector SVG"
                    >
                      <Download className="w-3 h-3" />
                      <span>SVG</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Global Print Styles for Clean Table Tent Printing                */}
      {/* ------------------------------------------------------------------ */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background-color: #ffffff !important;
            color: #1c1917 !important;
          }
          header,
          nav,
          aside,
          footer,
          .print\\:hidden {
            display: none !important;
          }
          #printable-table-cards {
            display: block !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
