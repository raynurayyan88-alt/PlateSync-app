"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RotateCcw, UtensilsCrossed } from "lucide-react";
import type { ClientMenuItem, ClientMenuCategory } from "@/lib/menu";
import { formatRupees, isVegetarianItem } from "@/lib/formatters";
import FoodTypeIndicator from "@/components/ui/FoodTypeIndicator";

interface MenuBrowserProps {
  menuItems: ClientMenuItem[];
  categories?: ClientMenuCategory[];
  onSelectItem: (item: ClientMenuItem) => void;
}

/**
 * Dynamic Multi-Cuisine Menu Browser
 * - Dynamic category tabs rendered from MenuCategory sorted by sortOrder.
 * - Clean "Veg Only" filter toggle with instant visual feedback.
 * - Minimalist dish cards strictly displaying: Veg/Non-Veg icon, Name, Monospace ₹ Price, and Pill "+ Add".
 */
export default function MenuBrowser({
  menuItems,
  categories: explicitCategories,
  onSelectItem,
}: MenuBrowserProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [vegOnly, setVegOnly] = useState(false);

  // Derive sorted category list from props or menuItems
  const categoryList = useMemo(() => {
    if (explicitCategories && explicitCategories.length > 0) {
      const sorted = [...explicitCategories].sort((a, b) => a.sortOrder - b.sortOrder);
      return ["All", ...sorted.map((c) => c.name)];
    }
    const set = new Set<string>();
    menuItems.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return ["All", ...Array.from(set)];
  }, [explicitCategories, menuItems]);

  // Filter items based on activeCategory and vegOnly toggle
  const filteredItems = useMemo(() => {
    let list = menuItems;

    if (activeCategory !== "All") {
      list = list.filter(
        (item) => item.category.toLowerCase() === activeCategory.toLowerCase()
      );
    }

    if (vegOnly) {
      list = list.filter((item) => isVegetarianItem(item));
    }

    return list;
  }, [activeCategory, menuItems, vegOnly]);

  const vegCountInActiveCategory = useMemo(() => {
    let list = menuItems;
    if (activeCategory !== "All") {
      list = list.filter(
        (item) => item.category.toLowerCase() === activeCategory.toLowerCase()
      );
    }
    return list.filter((i) => isVegetarianItem(i)).length;
  }, [activeCategory, menuItems]);

  return (
    <div className="space-y-5 pb-28">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Dynamic Category Navigation & Veg Only Filter (Sticky)          */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E7E5E4] space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Horizontal scrollable category pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
            {categoryList.map((cat) => {
              const isActive = activeCategory === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`relative px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all select-none cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-[#1C1917] text-white shadow-xs font-semibold"
                      : "bg-white border border-[#E7E5E4] text-stone-600 hover:text-[#1C1917] hover:border-stone-300"
                  }`}
                >
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Clean "Veg Only" Filter Toggle */}
          <button
            type="button"
            onClick={() => setVegOnly((prev) => !prev)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all select-none cursor-pointer border ${
              vegOnly
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs ring-2 ring-emerald-500/15"
                : "bg-white text-stone-600 border-[#E7E5E4] hover:border-stone-300 hover:text-stone-900"
            }`}
            title="Toggle Vegetarian Only dishes"
          >
            <span
              className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-[2.5px] border-[1.5px] ${
                vegOnly ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-600 bg-white"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${vegOnly ? "bg-white" : "bg-emerald-600"}`} />
            </span>
            <span>Veg Only</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Decluttered Menu Cards (Progressive Disclosure)                 */}
      {/*    ONLY shows: Veg/Non-Veg icon, Dish Name, Monospace ₹ Price,     */}
      {/*    and minimalist pill "+ Add" button with generous whitespace.    */}
      {/* ------------------------------------------------------------------ */}
      {filteredItems.length === 0 ? (
        <div className="py-14 text-center space-y-3 bg-white border border-[#E7E5E4] rounded-2xl p-6">
          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#1C1917]">
              No dishes found {vegOnly ? "matching 'Veg Only'" : ""} in {activeCategory}
            </p>
            <p className="text-xs text-stone-500">
              {vegOnly
                ? `There are 0 vegetarian items here (${vegCountInActiveCategory} total available). Try disabling Veg Only.`
                : "Try selecting a different cuisine category above."}
            </p>
          </div>
          {vegOnly && (
            <button
              type="button"
              onClick={() => setVegOnly(false)}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#1C1917] font-semibold text-xs transition-colors cursor-pointer"
            >
              Show All Dishes
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => {
              const isVeg = isVegetarianItem(item);
              const price = item.priceInRupees || item.priceInCents || 0;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onSelectItem(item)}
                  className="bg-white border border-[#E7E5E4] hover:border-stone-300 rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3.5 sm:gap-4"
                >
                  {/* Left: Dish Photo (or clean placeholder box) */}
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="w-20 h-20 rounded-xl object-cover shrink-0 border border-stone-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-stone-100 border border-stone-200 shrink-0 flex items-center justify-center text-stone-400">
                      <UtensilsCrossed className="w-6 h-6 stroke-[1.5]" />
                    </div>
                  )}

                  {/* Middle: Veg/Non-Veg Badge + Full Dish Name (Zero truncation) + Monospace ₹ Price */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="pt-0.5 shrink-0">
                        <FoodTypeIndicator dietaryType={item.dietaryType} isVeg={isVeg} />
                      </div>
                      <h3 className="font-sans font-semibold text-base sm:text-lg text-[#1C1917] leading-snug tracking-tight">
                        {item.name}
                      </h3>
                    </div>

                    <div className="pl-6 font-mono font-semibold text-sm sm:text-base text-stone-900 tracking-tight">
                      {formatRupees(price)}
                    </div>
                  </div>

                  {/* Right: Minimalist Pill "+ Add" Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectItem(item);
                    }}
                    className="shrink-0 px-3.5 py-1.5 rounded-full border border-stone-200 bg-white hover:bg-[#1C1917] hover:text-white hover:border-[#1C1917] text-stone-800 font-medium text-xs sm:text-sm flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add</span>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
