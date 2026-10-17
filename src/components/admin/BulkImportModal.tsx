"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle,
  Table as TableIcon,
} from "lucide-react";
import type { MenuItemModifier } from "@/lib/menu";
import { formatRupees } from "@/lib/formatters";
import FoodTypeIndicator from "@/components/ui/FoodTypeIndicator";

interface ParsedImportDish {
  category: string;
  name: string;
  priceInRupees: number;
  dietaryType: "VEG" | "NON_VEG" | "EGG";
  description?: string;
  modifiers?: MenuItemModifier[];
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (payload: {
    categories?: string[];
    dishes: ParsedImportDish[];
  }) => Promise<{ importedCategoriesCount: number; importedDishesCount: number }>;
}

const SAMPLE_CSV = `Category,Dish Name,Price,Dietary,Description,Modifiers
Arabic & Grills,Chicken Shawarma Roll,140,NON_VEG,Slow-roasted shredded chicken with garlic toum in soft rumali,Portion:Regular:140|Jumbo:210;Extras:Extra Toum:25|Cheese Slice:35
Arabic & Grills,Mutton Seekh Kebab,380,NON_VEG,Charcoal-smoked spiced minced mutton skewers,Spice Level:Medium:0|Extra Spicy:0
Western & Continental,Smash Bacon Burger,290,NON_VEG,Crispy beef patty with cheddar cheese and house burger relish,Extras:Extra Patty:120|Extra Bacon:80|Fries Combo:70
Western & Continental,Wood-Fired Margherita Pizza,320,VEG,San Marzano tomato base with fresh mozzarella and basil,Portion:Medium (10"):320|Large (14"):490;Extras:Extra Cheese:60
Chinese & Wok,Chicken Hakka Noodles,220,NON_VEG,Wok-tossed noodles with shredded chicken and crunchy veggies,Spice Level:Mild:0|Spicy:0|Schezwan:20
Indian Favorites,Butter Chicken,310,NON_VEG,Boneless tandoori chicken simmered in rich buttery tomato makhani,Portion:Half:310|Full:580
Indian Favorites,Paneer Tikka Masala,270,VEG,Charcoal-grilled cottage cheese in spiced tomato onion gravy,Portion:Half:270|Full:480
Shakes & Mojitos,Belgian Chocolate Shake,180,VEG,Thick blended shake made with rich Belgian cocoa and vanilla gelato,Extras:Whipped Cream:25|Brownie Chunk:45`;

const SAMPLE_JSON = JSON.stringify(
  [
    {
      category: "Arabic & Grills",
      name: "Al Faham Dajaj (Quarter / Half / Full)",
      priceInRupees: 160,
      dietaryType: "NON_VEG",
      description: "Charcoal-grilled whole chicken marinated in traditional Arabian spices.",
      modifiers: [
        {
          name: "Portion Size",
          required: true,
          options: [
            { label: "Quarter", priceInRupees: 160 },
            { label: "Half", priceInRupees: 300 },
            { label: "Full", priceInRupees: 580 },
          ],
        },
        {
          name: "Add-ons",
          required: false,
          options: [
            { label: "Extra Garlic Toum", priceInRupees: 30 },
            { label: "Extra Kuboos", priceInRupees: 15 },
          ],
        },
      ],
    },
    {
      category: "Indian Favorites",
      name: "Hyderabadi Dum Biryani",
      priceInRupees: 280,
      dietaryType: "NON_VEG",
      description: "Fragrant long-grain basmati rice cooked with tender meat on slow dum.",
      modifiers: [
        {
          name: "Portion",
          required: true,
          options: [
            { label: "Single", priceInRupees: 280 },
            { label: "Full / Double", priceInRupees: 480 },
          ],
        },
      ],
    },
    {
      category: "Beverages",
      name: "Fresh Mint Mojito",
      priceInRupees: 130,
      dietaryType: "VEG",
      description: "Muddled fresh mint, lime juice, cane sugar, and sparkling soda.",
      modifiers: [],
    },
  ],
  null,
  2
);

export default function BulkImportModal({
  isOpen,
  onClose,
  onImport,
}: BulkImportModalProps) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [inputText, setInputText] = useState("");
  const [parsedDishes, setParsedDishes] = useState<ParsedImportDish[]>([]);
  const [parsedCategories, setParsedCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    categories: number;
    dishes: number;
  } | null>(null);

  if (!isOpen) return null;

  // Load sample template into textarea
  const handleLoadSample = () => {
    setError(null);
    setImportResult(null);
    if (format === "csv") {
      setInputText(SAMPLE_CSV);
      parseCSV(SAMPLE_CSV);
    } else {
      setInputText(SAMPLE_JSON);
      parseJSON(SAMPLE_JSON);
    }
  };

  // Parse CSV format: Category,Dish Name,Price,Dietary,Description,Modifiers
  // Modifiers format: "Group:Option:Price|Option:Price;Group2:Option:Price"
  const parseCSV = (csvText: string) => {
    try {
      const lines = csvText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length <= 1) {
        setParsedDishes([]);
        setParsedCategories([]);
        return;
      }

      // Check header or skip first line if it starts with Category
      const startIndex = lines[0].toLowerCase().startsWith("category") ? 1 : 0;
      const dishes: ParsedImportDish[] = [];
      const catsSet = new Set<string>();

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        // Handle comma splitting (respect simple quotes if present)
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length < 3) continue;

        const category = parts[0] || "General";
        const name = parts[1];
        const price = parseInt(parts[2], 10) || 0;
        const rawDietary = (parts[3] || "NON_VEG").toUpperCase();
        const dietaryType: "VEG" | "NON_VEG" | "EGG" =
          rawDietary === "VEG" || rawDietary === "EGG" ? rawDietary : "NON_VEG";
        const description = parts[4] || "";

        // Parse optional modifiers string: Group:Opt:Price|Opt:Price;Group2:Opt:Price
        const modifiersStr = parts[5] || "";
        const modifiers: MenuItemModifier[] = [];

        if (modifiersStr) {
          const groupChunks = modifiersStr.split(";");
          groupChunks.forEach((chunk, gIdx) => {
            const [grpName, ...opts] = chunk.split(":");
            if (grpName && opts.length > 0) {
              const optList = opts.join(":").split("|");
              const parsedOpts = optList
                .map((pair) => {
                  const [lbl, p] = pair.split(":");
                  return {
                    label: lbl?.trim() || "Option",
                    priceInRupees: parseInt(p, 10) || 0,
                    priceInCents: parseInt(p, 10) || 0,
                  };
                })
                .filter((o) => o.label.length > 0);

              if (parsedOpts.length > 0) {
                modifiers.push({
                  id: `mod_${Date.now()}_${gIdx}`,
                  name: grpName.trim(),
                  required: grpName.toLowerCase().includes("portion"),
                  options: parsedOpts,
                });
              }
            }
          });
        }

        catsSet.add(category);
        dishes.push({
          category,
          name,
          priceInRupees: price,
          dietaryType,
          description,
          modifiers,
        });
      }

      setParsedDishes(dishes);
      setParsedCategories(Array.from(catsSet));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error parsing CSV");
    }
  };

  // Parse JSON format
  const parseJSON = (jsonText: string) => {
    try {
      const data = JSON.parse(jsonText);
      if (!Array.isArray(data)) {
        throw new Error("JSON must be an array of dishes.");
      }

      const dishes: ParsedImportDish[] = [];
      const catsSet = new Set<string>();

      for (const item of data) {
        if (!item.name || typeof item.priceInRupees === "undefined") continue;

        const category = item.category || "General";
        catsSet.add(category);

        const dietaryType: "VEG" | "NON_VEG" | "EGG" =
          item.dietaryType === "VEG" || item.dietaryType === "EGG" ? item.dietaryType : "NON_VEG";

        dishes.push({
          category,
          name: item.name,
          priceInRupees: Number(item.priceInRupees) || 0,
          dietaryType,
          description: item.description || "",
          modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
        });
      }

      setParsedDishes(dishes);
      setParsedCategories(Array.from(catsSet));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid JSON syntax");
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    setImportResult(null);
    if (format === "csv") {
      parseCSV(text);
    } else {
      parseJSON(text);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedDishes.length === 0) return;
    setIsImporting(true);
    setError(null);

    try {
      const res = await onImport({
        categories: parsedCategories,
        dishes: parsedDishes,
      });

      setImportResult({
        categories: res.importedCategoriesCount,
        dishes: res.importedDishesCount,
      });
      setInputText("");
      setParsedDishes([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error executing bulk import");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs select-none">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-3xl bg-white border border-[#E7E5E4] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#1C1917]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#E7E5E4] flex items-center justify-between bg-[#FAF9F6]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-800">
                <Upload className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1C1917] tracking-tight">
                  Bulk Menu Import (CSV / JSON)
                </h2>
                <p className="text-xs text-stone-500">
                  Paste a list of categories and dishes to populate a hotel&apos;s menu in seconds.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-stone-200 text-stone-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Success Message Banner */}
            {importResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <strong className="font-bold">Import Successful!</strong> Added{" "}
                  {importResult.dishes} dishes across {importResult.categories} categories. The
                  menu is live.
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Format Selector + 1-Click Load Sample */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setFormat("csv");
                    setInputText("");
                    setParsedDishes([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    format === "csv"
                      ? "bg-white text-stone-900 shadow-2xs"
                      : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>CSV Format</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormat("json");
                    setInputText("");
                    setParsedDishes([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    format === "json"
                      ? "bg-white text-stone-900 shadow-2xs"
                      : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>JSON Format</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleLoadSample}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Load Sample Template</span>
              </button>
            </div>

            {/* Paste Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Paste {format.toUpperCase()} Content:
              </label>
              <textarea
                value={inputText}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={7}
                placeholder={
                  format === "csv"
                    ? "Category,Dish Name,Price,Dietary,Description,Modifiers\nArabic & Grills,Chicken Shawarma,140,NON_VEG,Garlic toum,Portion:Half:140|Full:220\nIndian,Butter Chicken,320,NON_VEG,Rich gravy,"
                    : '[\n  {\n    "category": "Arabic & Grills",\n    "name": "Chicken Shawarma",\n    "priceInRupees": 140,\n    "dietaryType": "NON_VEG"\n  }\n]'
                }
                className="w-full font-mono text-xs p-3.5 bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl focus:bg-white focus:outline-none focus:border-[#1C1917] transition-all resize-y"
              />
            </div>

            {/* Live Preview Table */}
            {parsedDishes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                  <span className="flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-stone-600" />
                    Detected Dishes Preview ({parsedDishes.length} dishes, {parsedCategories.length}{" "}
                    categories):
                  </span>
                  <span className="text-stone-500 font-mono text-[11px]">
                    Ready to populate hotel menu
                  </span>
                </div>

                <div className="border border-[#E7E5E4] rounded-2xl overflow-hidden max-h-56 overflow-y-auto bg-white">
                  <table className="w-full text-left text-xs divide-y divide-stone-200">
                    <thead className="bg-[#FAF9F6] font-semibold text-stone-600 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Dish Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 font-mono">Price</th>
                        <th className="py-2.5 px-3">Modifiers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {parsedDishes.map((dish, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/80">
                          <td className="py-2 px-3">
                            <FoodTypeIndicator
                              dietaryType={dish.dietaryType}
                              isVeg={dish.dietaryType === "VEG"}
                            />
                          </td>
                          <td className="py-2 px-3 font-semibold text-[#1C1917]">
                            {dish.name}
                          </td>
                          <td className="py-2 px-3 text-stone-600">{dish.category}</td>
                          <td className="py-2 px-3 font-mono font-bold text-stone-900">
                            {formatRupees(dish.priceInRupees)}
                          </td>
                          <td className="py-2 px-3 text-[11px] text-stone-500">
                            {dish.modifiers && dish.modifiers.length > 0
                              ? `${dish.modifiers.length} group(s)`
                              : "None"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="p-4 sm:px-6 bg-[#FAF9F6] border-t border-[#E7E5E4] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-semibold text-xs hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              disabled={parsedDishes.length === 0 || isImporting}
              onClick={handleExecuteImport}
              className="px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-black text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isImporting ? (
                <span>Importing Dishes...</span>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import {parsedDishes.length} Dishes Now</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
