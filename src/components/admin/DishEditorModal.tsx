"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Check,
  FolderPlus,
  Utensils,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import type { ClientMenuCategory, ClientMenuItem, MenuItemModifier } from "@/lib/menu";
import FoodTypeIndicator from "@/components/ui/FoodTypeIndicator";

export interface DishFormData {
  id?: string;
  categoryId?: string | null;
  category: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  priceInRupees: number;
  dietaryType: "VEG" | "NON_VEG" | "EGG";
  isAvailable: boolean;
  modifiers: MenuItemModifier[];
}

interface DishEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dishData: DishFormData) => Promise<void>;
  categories: ClientMenuCategory[];
  onQuickAddCategory: (name: string) => Promise<ClientMenuCategory | null>;
  editingDish?: ClientMenuItem | null;
}

interface ModifierOptionDraft {
  label: string;
  priceInRupees: number;
}

interface ModifierGroupDraft {
  id: string;
  name: string;
  required: boolean;
  options: ModifierOptionDraft[];
}

function DishEditorContent({
  onClose,
  onSave,
  categories,
  onQuickAddCategory,
  editingDish,
}: Omit<DishEditorModalProps, "isOpen">) {
  const [name, setName] = useState(() => editingDish?.name || "");
  const [categoryId, setCategoryId] = useState(
    () => editingDish?.categoryId || categories[0]?.id || ""
  );
  const [imageUrl, setImageUrl] = useState(() => editingDish?.imageUrl || "");
  const [priceInRupees, setPriceInRupees] = useState<number | "">(() =>
    editingDish ? editingDish.priceInRupees ?? editingDish.priceInCents ?? 0 : ""
  );
  const [dietaryType, setDietaryType] = useState<"VEG" | "NON_VEG" | "EGG">(
    () => editingDish?.dietaryType || "NON_VEG"
  );
  const [description, setDescription] = useState(() => editingDish?.description || "");
  const [isAvailable, setIsAvailable] = useState(() => editingDish?.isAvailable ?? true);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroupDraft[]>(() => {
    if (!editingDish?.modifiers) return [];
    return editingDish.modifiers.map((mod, idx) => ({
      id: mod.id || `mod_${Date.now()}_${idx}`,
      name: mod.name || "",
      required: !!mod.required,
      options: (mod.options || []).map((opt) => ({
        label: opt.label || "",
        priceInRupees: opt.priceInRupees ?? opt.priceInCents ?? 0,
      })),
    }));
  });

  // Handle image file upload (converts to Base64 Data URL)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Image file size must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setImageUrl(event.target.result);
        setErrorMessage("");
      }
    };
    reader.readAsDataURL(file);
  };

  // Inline category creation
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Add new modifier group
  const handleAddModifierGroup = (
    template?: { name: string; required: boolean; options: ModifierOptionDraft[] }
  ) => {
    const newGroup: ModifierGroupDraft = template
      ? {
          id: `mod_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: template.name,
          required: template.required,
          options: template.options,
        }
      : {
          id: `mod_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: "",
          required: false,
          options: [{ label: "", priceInRupees: 0 }],
        };

    setModifierGroups((prev) => [...prev, newGroup]);
  };

  // Remove modifier group
  const handleRemoveGroup = (groupId: string) => {
    setModifierGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  // Add option to group
  const handleAddOption = (groupId: string) => {
    setModifierGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: [...g.options, { label: "", priceInRupees: 0 }],
            }
          : g
      )
    );
  };

  // Remove option from group
  const handleRemoveOption = (groupId: string, optionIdx: number) => {
    setModifierGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: g.options.filter((_, idx) => idx !== optionIdx),
            }
          : g
      )
    );
  };

  // Update option in group
  const handleUpdateOption = (
    groupId: string,
    optionIdx: number,
    field: keyof ModifierOptionDraft,
    value: string | number
  ) => {
    setModifierGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: g.options.map((opt, idx) =>
                idx === optionIdx ? { ...opt, [field]: value } : opt
              ),
            }
          : g
      )
    );
  };

  // Inline create category
  const handleCreateNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const created = await onQuickAddCategory(newCategoryName.trim());
      if (created) {
        setCategoryId(created.id);
        setIsAddingNewCategory(false);
        setNewCategoryName("");
      }
    } catch {
      // handled in parent
    }
  };

  // Handle Save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Please enter a dish name.");
      return;
    }
    if (priceInRupees === "" || Number(priceInRupees) < 0) {
      setErrorMessage("Please enter a valid price in ₹.");
      return;
    }

    const selectedCategory = categories.find((c) => c.id === categoryId);
    const categoryName = selectedCategory?.name || "General";

    // Format modifier groups
    const cleanedModifiers: MenuItemModifier[] = modifierGroups
      .filter((g) => g.name.trim().length > 0)
      .map((g) => ({
        id: g.id,
        name: g.name.trim(),
        required: g.required,
        options: g.options
          .filter((opt) => opt.label.trim().length > 0)
          .map((opt) => ({
            label: opt.label.trim(),
            priceInRupees: Number(opt.priceInRupees) || 0,
            priceInCents: Number(opt.priceInRupees) || 0,
          })),
      }));

    setIsSaving(true);
    setErrorMessage("");

    try {
      await onSave({
        id: editingDish?.id,
        categoryId: categoryId || null,
        category: categoryName,
        name: name.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim() || null,
        priceInRupees: Number(priceInRupees),
        dietaryType,
        isAvailable,
        modifiers: cleanedModifiers,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error saving dish");
    } finally {
      setIsSaving(false);
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
          className="relative z-10 w-full max-w-2xl bg-white border border-[#E7E5E4] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#1C1917]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#E7E5E4] flex items-center justify-between bg-[#FAF9F6]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-800">
                <Utensils className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1C1917] tracking-tight">
                  {editingDish ? "Edit Dish" : "Add New Dish"}
                </h2>
                <p className="text-xs text-stone-500">
                  Configure pricing, dietary type, and custom modifier groups.
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

          {/* Form Body (Scrollable) */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                {errorMessage}
              </div>
            )}

            {/* 1. Category Selector + Quick Add */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Menu Category *
                </label>
                {!isAddingNewCategory && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCategory(true)}
                    className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>+ New Category</span>
                  </button>
                )}
              </div>

              {isAddingNewCategory ? (
                <div className="flex items-center gap-2 p-2 bg-stone-50 border border-stone-200 rounded-xl">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Seafood Specials, Wood-Fired Pizza..."
                    className="flex-1 text-xs sm:text-sm bg-white border border-stone-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-stone-900"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewCategory}
                    className="px-3 py-1.5 bg-[#1C1917] text-white text-xs font-semibold rounded-lg hover:bg-black transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewCategory(false);
                      setNewCategoryName("");
                    }}
                    className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-white border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#1C1917] focus:outline-none focus:border-[#1C1917] shadow-2xs cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Dish Name & Base Price */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Dish Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Charcoal Al Faham, Truffle Burger..."
                  className="w-full bg-white border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#1C1917] focus:outline-none focus:border-[#1C1917] shadow-2xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Base Price (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs sm:text-sm font-mono font-bold text-stone-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={priceInRupees}
                    onChange={(e) =>
                      setPriceInRupees(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="240"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-[#E7E5E4] rounded-xl text-xs sm:text-sm font-mono font-bold text-[#1C1917] focus:outline-none focus:border-[#1C1917] shadow-2xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Dish Photo (File Upload / Pasted URL / Live Preview) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Dish Photo (Optional)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
                {/* Live Preview / Placeholder */}
                <div className="relative shrink-0">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt="Dish preview"
                      loading="lazy"
                      decoding="async"
                      className="w-20 h-20 rounded-xl object-cover border border-stone-300 shadow-2xs"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-stone-100 border border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 gap-1">
                      <ImageIcon className="w-5 h-5 stroke-[1.5]" />
                      <span className="text-[10px] font-medium text-stone-400">No Photo</span>
                    </div>
                  )}

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white p-1 rounded-full hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
                      title="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Upload from device & Image URL paste input */}
                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer shadow-2xs">
                      <Upload className="w-3.5 h-3.5 text-stone-500" />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-stone-400">
                      PNG, JPG, or WebP up to 2MB
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="url"
                      value={imageUrl.startsWith("data:") ? "" : imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder={
                        imageUrl.startsWith("data:")
                          ? "Custom photo uploaded from device"
                          : "Or paste image URL (e.g. Unsplash)..."
                      }
                      className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Dietary Classification (FSSAI Veg / Non-Veg / Egg) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Dietary Classification
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(
                  [
                    { type: "VEG", label: "Vegetarian", isVeg: true },
                    { type: "NON_VEG", label: "Non-Veg", isVeg: false },
                    { type: "EGG", label: "Contains Egg", isVeg: false },
                  ] as const
                ).map(({ type, label, isVeg }) => {
                  const isSelected = dietaryType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDietaryType(type)}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-stone-50 border-[#1C1917] shadow-2xs text-[#1C1917] ring-1 ring-stone-900"
                          : "bg-white border-[#E7E5E4] text-stone-600 hover:border-stone-300"
                      }`}
                    >
                      <FoodTypeIndicator dietaryType={type} isVeg={isVeg} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Description / Ingredients (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="e.g. Slow-grilled whole chicken with authentic Arabian spices, served with kuboos, garlic toum, and pickled veggies."
                className="w-full bg-white border border-[#E7E5E4] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#1C1917] shadow-2xs resize-none"
              />
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-stone-800 block">
                  Kitchen Stock Status
                </span>
                <span className="text-[11px] text-stone-500">
                  {isAvailable
                    ? "Available on menu for diners"
                    : "Marked as sold out for busy kitchen hours"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAvailable((prev) => !prev)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  isAvailable
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                    : "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100"
                }`}
              >
                {isAvailable ? "In Stock" : "Sold Out"}
              </button>
            </div>

            {/* 5. Custom Modifier Groups Builder */}
            <div className="space-y-3 pt-2 border-t border-[#E7E5E4]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-stone-600" />
                    Custom Modifier Groups ({modifierGroups.length})
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Add portion variants (Quarter/Half/Full) or paid add-ons (Extra Mayo, Cheese).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddModifierGroup()}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Group</span>
                </button>
              </div>

              {/* Quick Template Presets */}
              {modifierGroups.length === 0 && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>Quick Modifier Templates:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleAddModifierGroup({
                          name: "Portion Size",
                          required: true,
                          options: [
                            { label: "Quarter", priceInRupees: 160 },
                            { label: "Half", priceInRupees: 300 },
                            { label: "Full", priceInRupees: 580 },
                          ],
                        })
                      }
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-xs font-medium text-amber-950 transition-colors cursor-pointer shadow-2xs"
                    >
                      + Portion Sizes (Quarter / Half / Full)
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleAddModifierGroup({
                          name: "Paid Add-ons & Dips",
                          required: false,
                          options: [
                            { label: "Extra Garlic Toum / Mayo", priceInRupees: 30 },
                            { label: "Extra Kuboos / Bread", priceInRupees: 15 },
                            { label: "Cheese Slice", priceInRupees: 40 },
                          ],
                        })
                      }
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-xs font-medium text-amber-950 transition-colors cursor-pointer shadow-2xs"
                    >
                      + Paid Add-ons (Mayo, Kuboos, Cheese)
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleAddModifierGroup({
                          name: "Spice Level",
                          required: true,
                          options: [
                            { label: "Mild", priceInRupees: 0 },
                            { label: "Medium", priceInRupees: 0 },
                            { label: "Extra Spicy 🔥", priceInRupees: 0 },
                          ],
                        })
                      }
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-xs font-medium text-amber-950 transition-colors cursor-pointer shadow-2xs"
                    >
                      + Spice Level (Mild / Medium / Spicy)
                    </button>
                  </div>
                </div>
              )}

              {/* Modifier Groups List */}
              <div className="space-y-3.5">
                {modifierGroups.map((group, groupIdx) => (
                  <div
                    key={group.id}
                    className="p-3.5 bg-[#FAF9F6] border border-[#E7E5E4] rounded-2xl space-y-3 shadow-2xs"
                  >
                    {/* Group Header: Name, Required toggle, Delete */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-stone-500">
                          #{groupIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) =>
                            setModifierGroups((prev) =>
                              prev.map((g) =>
                                g.id === group.id ? { ...g, name: e.target.value } : g
                              )
                            )
                          }
                          placeholder="Group Name (e.g. Portion, Extras, Spice Level)..."
                          className="flex-1 bg-white border border-[#E7E5E4] rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                        />
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-stone-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={group.required}
                            onChange={(e) =>
                              setModifierGroups((prev) =>
                                prev.map((g) =>
                                  g.id === group.id ? { ...g, required: e.target.checked } : g
                                )
                              )
                            }
                            className="rounded border-stone-300 text-stone-900 focus:ring-0"
                          />
                          <span>Required</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleRemoveGroup(group.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Options inside this group */}
                    <div className="space-y-2 pl-4 border-l-2 border-stone-200">
                      {group.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt.label}
                            onChange={(e) =>
                              handleUpdateOption(group.id, optIdx, "label", e.target.value)
                            }
                            placeholder="Option label (e.g. Quarter, Extra Mayo)..."
                            className="flex-1 bg-white border border-[#E7E5E4] rounded-lg px-3 py-1 text-xs text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                          />

                          <div className="relative w-28 shrink-0">
                            <span className="absolute left-2.5 top-1 text-xs font-mono font-bold text-stone-500">
                              +₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={opt.priceInRupees}
                              onChange={(e) =>
                                handleUpdateOption(
                                  group.id,
                                  optIdx,
                                  "priceInRupees",
                                  e.target.value === "" ? 0 : Number(e.target.value)
                                )
                              }
                              placeholder="0"
                              className="w-full pl-7 pr-2 py-1 bg-white border border-[#E7E5E4] rounded-lg text-xs font-mono font-bold text-[#1C1917] focus:outline-none focus:border-[#1C1917]"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveOption(group.id, optIdx)}
                            className="p-1 text-stone-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove option"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddOption(group.id)}
                        className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 pt-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Option</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-[#E7E5E4] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-semibold text-xs hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-black text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>{editingDish ? "Save Changes" : "Create Dish"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function DishEditorModal({
  isOpen,
  onClose,
  onSave,
  categories,
  onQuickAddCategory,
  editingDish,
}: DishEditorModalProps) {
  if (!isOpen) return null;

  return (
    <DishEditorContent
      key={editingDish?.id || "new-dish"}
      onClose={onClose}
      onSave={onSave}
      categories={categories}
      onQuickAddCategory={onQuickAddCategory}
      editingDish={editingDish}
    />
  );
}
