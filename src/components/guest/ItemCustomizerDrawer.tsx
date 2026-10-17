"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingBag, Check } from "lucide-react";
import type { ClientMenuItem, MenuItemModifier } from "@/lib/menu";
import { formatRupees, isVegetarianItem } from "@/lib/formatters";
import FoodTypeIndicator from "@/components/ui/FoodTypeIndicator";

interface SelectedModifierChoice {
  modifierId: string;
  label: string;
  priceInRupees?: number;
  priceInCents: number;
}

interface ItemCustomizerDrawerProps {
  item: ClientMenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (customizedItem: {
    menuItemId: string;
    name: string;
    priceInRupees?: number;
    priceInCents: number;
    quantity: number;
    selectedModifiers: SelectedModifierChoice[];
    notes?: string;
  }) => void;
}

function ItemCustomizerContent({
  item,
  onClose,
  onAddToCart,
}: {
  item: ClientMenuItem;
  onClose: () => void;
  onAddToCart: ItemCustomizerDrawerProps["onAddToCart"];
}) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const isVeg = isVegetarianItem(item);
  const basePrice = item.priceInRupees ?? item.priceInCents ?? 0;

  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, SelectedModifierChoice[]>>(() => {
    const initial: Record<string, SelectedModifierChoice[]> = {};
    item.modifiers?.forEach((mod: MenuItemModifier) => {
      if (mod.required && mod.options.length > 0) {
        const firstOpt = mod.options[0];
        const optPrice = firstOpt.priceInRupees ?? firstOpt.priceInCents ?? 0;
        initial[mod.id] = [
          {
            modifierId: mod.id,
            label: firstOpt.label,
            priceInRupees: optPrice,
            priceInCents: optPrice,
          },
        ];
      } else {
        initial[mod.id] = [];
      }
    });
    return initial;
  });

  const handleRadioOption = (modId: string, label: string, price: number) => {
    setSelectedModifiers((prev) => ({
      ...prev,
      [modId]: [{ modifierId: modId, label, priceInRupees: price, priceInCents: price }],
    }));
  };

  const handleCheckboxOption = (modId: string, label: string, price: number) => {
    setSelectedModifiers((prev) => {
      const currentList = prev[modId] || [];
      const exists = currentList.some((opt) => opt.label === label);
      if (exists) {
        return {
          ...prev,
          [modId]: currentList.filter((opt) => opt.label !== label),
        };
      } else {
        return {
          ...prev,
          [modId]: [...currentList, { modifierId: modId, label, priceInRupees: price, priceInCents: price }],
        };
      }
    });
  };

  // Calculate live total price in Rupees
  const modifiersPriceTotal = Object.values(selectedModifiers)
    .flat()
    .reduce((sum, mod) => sum + (mod.priceInRupees ?? mod.priceInCents ?? 0), 0);

  const unitPrice = basePrice + modifiersPriceTotal;
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    const flatModifiers = Object.values(selectedModifiers).flat();
    onAddToCart({
      menuItemId: item.id,
      name: item.name,
      priceInRupees: unitPrice,
      priceInCents: unitPrice,
      quantity,
      selectedModifiers: flatModifiers,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
      {/* Backdrop dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="relative z-10 w-full max-w-lg bg-white border-t border-[#E5E7EB] rounded-t-3xl max-h-[88vh] flex flex-col shadow-2xl text-[#111827]"
      >
        {/* Grab Handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header: Name, Veg badge, Price in ₹, Description */}
        <div className="px-6 py-4 border-b border-[#E7E5E4] flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 pr-2">
            <div className="flex items-center gap-2">
              <FoodTypeIndicator dietaryType={item.dietaryType} isVeg={isVeg} />
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                {item.category}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#1C1917] leading-tight tracking-tight">
              {item.name}
            </h2>
            <div className="font-mono font-semibold text-base text-stone-900 tracking-tight">
              {formatRupees(basePrice)}
            </div>
            {item.description && (
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed pt-1">
                {item.description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modifier Options */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {item.modifiers && item.modifiers.length > 0 ? (
            item.modifiers.map((mod) => {
              const currentChoices = selectedModifiers[mod.id] || [];

              return (
                <div key={mod.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#1C1917]">{mod.name}</h3>
                    {mod.required ? (
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 border border-stone-200">
                        Required
                      </span>
                    ) : (
                      <span className="text-xs text-stone-500">Optional</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {mod.options.map((option) => {
                      const isSelected = currentChoices.some((opt) => opt.label === option.label);
                      const optPrice = option.priceInRupees ?? option.priceInCents ?? 0;

                      return (
                        <div
                          key={option.label}
                          onClick={() => {
                            if (mod.required) {
                              handleRadioOption(mod.id, option.label, optPrice);
                            } else {
                              handleCheckboxOption(mod.id, option.label, optPrice);
                            }
                          }}
                          className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-stone-50 border-[#1C1917] text-[#1C1917]"
                              : "bg-white border-[#E7E5E4] text-[#1C1917] hover:border-stone-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                                isSelected
                                  ? "bg-[#1C1917] border-[#1C1917] text-white"
                                  : "border-stone-300 bg-white"
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className="text-sm font-medium">{option.label}</span>
                          </div>

                          <span className="font-mono text-xs font-semibold text-stone-600">
                            {optPrice > 0
                              ? `+${formatRupees(optPrice)}`
                              : "Included"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-stone-500 italic">No customizations needed for this item.</p>
          )}

          {/* Special Instructions / Notes */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-[#1C1917] block">
              Special Cooking Instructions / Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Less spicy, dressing on side..."
              rows={2}
              className="w-full bg-white border border-[#E7E5E4] focus:border-[#1C1917] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none transition-all resize-none shadow-2xs"
            />
          </div>
        </div>

        {/* Sticky Bottom Bar */}
        <div className="p-4 bg-white border-t border-[#E7E5E4] flex items-center gap-3">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-2 bg-stone-50 border border-[#E7E5E4] rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-[#1C1917] hover:bg-stone-100 active:scale-95 transition-all cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center font-mono font-bold text-sm text-[#1C1917]">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-[#1C1917] hover:bg-stone-100 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleAdd}
            className="flex-1 py-3 px-5 rounded-xl bg-[#1C1917] hover:bg-black text-white font-semibold text-sm flex items-center justify-between shadow-xs active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Add to Table Cart
            </span>
            <span className="font-mono font-semibold">{formatRupees(totalPrice)}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ItemCustomizerDrawer({
  item,
  isOpen,
  onClose,
  onAddToCart,
}: ItemCustomizerDrawerProps) {
  if (!isOpen || !item) return null;

  return (
    <AnimatePresence>
      <ItemCustomizerContent
        key={item.id}
        item={item}
        onClose={onClose}
        onAddToCart={onAddToCart}
      />
    </AnimatePresence>
  );
}
