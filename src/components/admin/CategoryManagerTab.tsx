"use client";

import React, { useState } from "react";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  FolderOpen,
} from "lucide-react";
import type { ClientMenuCategory, ClientMenuItem } from "@/lib/menu";
import { CUISINE_PRESETS } from "@/lib/menu";

interface CategoryManagerTabProps {
  categories: ClientMenuCategory[];
  menuItems: ClientMenuItem[];
  onAddCategory: (name: string) => Promise<void>;
  onQuickAddPreset: (categoryName: string) => Promise<void>;
  onUpdateCategory: (id: string, name: string) => Promise<void>;
  onReorderCategories: (reordered: Array<{ id: string; sortOrder: number }>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export default function CategoryManagerTab({
  categories,
  menuItems,
  onAddCategory,
  onQuickAddPreset,
  onUpdateCategory,
  onReorderCategories,
  onDeleteCategory,
}: CategoryManagerTabProps) {
  const [newCatName, setNewCatName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Map dishes per category
  const dishCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const item of menuItems) {
      const key = item.categoryId || item.category;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [menuItems]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddCategory(newCatName.trim());
      setNewCatName("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (cat: ClientMenuCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await onUpdateCategory(id, editName.trim());
      setEditingId(null);
    } catch {
      // handled
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const list = [...categories];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const payload = list.map((c, idx) => ({
      id: c.id,
      sortOrder: idx + 1,
    }));

    await onReorderCategories(payload);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Description */}
      <div className="bg-white border border-[#E7E5E4] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#1C1917] tracking-tight flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-stone-700" />
              <span>Dynamic Category Manager</span>
            </h2>
            <p className="text-xs text-stone-500">
              Create, rename, reorder, or remove menu categories for any cuisine.
            </p>
          </div>

          <div className="text-xs font-mono font-semibold text-stone-600 bg-stone-100 px-3 py-1 rounded-full border border-stone-200 self-start sm:self-auto">
            {categories.length} Categories Active
          </div>
        </div>

        {/* 1-Click Quick Add Cuisine Presets */}
        <div className="pt-2 border-t border-[#E7E5E4] space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>1-Click Quick Add Cuisine Presets (Save Setup Time):</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {CUISINE_PRESETS.map((preset) => {
              const alreadyExists = categories.some(
                (c) => c.name.toLowerCase() === preset.categoryName.toLowerCase()
              );

              return (
                <button
                  key={preset.label}
                  type="button"
                  disabled={alreadyExists}
                  onClick={() => onQuickAddPreset(preset.categoryName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    alreadyExists
                      ? "bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed opacity-75"
                      : "bg-[#FAF9F6] hover:bg-stone-100 text-stone-800 border-[#E7E5E4] hover:border-stone-300 shadow-2xs active:scale-95"
                  }`}
                  title={alreadyExists ? "Already added" : `Add ${preset.categoryName}`}
                >
                  <span>{preset.label}</span>
                  {alreadyExists && <span className="ml-1 text-[10px] text-stone-400">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add Custom Category Input Form */}
        <form onSubmit={handleAdd} className="pt-2 border-t border-[#E7E5E4] flex gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g. Seafood Specials, Turkish Kebabs, Wood-Fired Pizza, Desserts..."
            className="flex-1 bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#1C1917] focus:outline-none focus:border-[#1C1917] focus:bg-white shadow-2xs"
          />
          <button
            type="submit"
            disabled={!newCatName.trim() || isSubmitting}
            className="px-4 py-2.5 bg-[#1C1917] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Category</span>
          </button>
        </form>
      </div>

      {/* 2. Interactive Category List with Reordering */}
      <div className="bg-white border border-[#E7E5E4] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-stone-500 uppercase tracking-wider px-2">
          <span>Sort Order & Name</span>
          <span>Actions</span>
        </div>

        {categories.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400 italic">
            No categories defined yet. Use the presets above or enter a custom name.
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((cat, idx) => {
              const dishCount =
                dishCounts.get(cat.id) || dishCounts.get(cat.name) || 0;
              const isEditing = editingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="p-3.5 bg-[#FAF9F6] border border-[#E7E5E4] hover:border-stone-300 rounded-2xl flex items-center justify-between gap-3 shadow-2xs transition-all"
                >
                  {/* Left: Reorder arrows + Name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, "up")}
                        className="p-1 rounded hover:bg-stone-200 text-stone-500 hover:text-stone-900 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === categories.length - 1}
                        onClick={() => handleMove(idx, "down")}
                        className="p-1 rounded hover:bg-stone-200 text-stone-500 hover:text-stone-900 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Order Badge */}
                    <span className="font-mono text-xs font-bold text-stone-400 w-5 text-center shrink-0">
                      #{idx + 1}
                    </span>

                    {/* Name (Inline editable) */}
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 max-w-sm">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#1C1917] focus:outline-none focus:border-stone-900"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat.id)}
                          className="p-1 rounded bg-[#1C1917] text-white hover:bg-black cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded text-stone-500 hover:bg-stone-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-sm text-[#1C1917] truncate">
                          {cat.name}
                        </span>
                        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 shrink-0">
                          {dishCount} {dishCount === 1 ? "dish" : "dishes"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Actions: Edit, Delete */}
                  {!isEditing && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-white border border-transparent hover:border-stone-200 transition-colors cursor-pointer"
                        title="Rename Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              `Are you sure you want to delete category "${cat.name}"? Dishes in this category will be moved to General.`
                            )
                          ) {
                            onDeleteCategory(cat.id);
                          }
                        }}
                        className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
