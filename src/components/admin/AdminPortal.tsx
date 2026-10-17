"use client";

import React, { useState, useMemo, useSyncExternalStore } from "react";
import {
  UtensilsCrossed,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  FolderOpen,
  QrCode,
  Upload,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import type { ClientMenuCategory, ClientMenuItem } from "@/lib/menu";
import { CUISINE_PRESETS } from "@/lib/menu";
import { formatRupees, isVegetarianItem } from "@/lib/formatters";
import FoodTypeIndicator from "@/components/ui/FoodTypeIndicator";
import DishEditorModal, { DishFormData } from "./DishEditorModal";
import BulkImportModal from "./BulkImportModal";
import TableQrGenerator from "./TableQrGenerator";

interface AdminPortalProps {
  restaurantSlug: string;
  initialRestaurant: { id: string; name: string; slug: string };
  initialCategories: ClientMenuCategory[];
  initialMenuItems: ClientMenuItem[];
}

const emptySubscribe = () => () => {};

export default function AdminPortal({
  restaurantSlug,
  initialRestaurant,
  initialCategories,
  initialMenuItems,
}: AdminPortalProps) {
  // Hydration guard: Prevent hydration mismatch from browser extensions injecting fdprocessedid into buttons/inputs
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // State
  const [restaurant] = useState(initialRestaurant);
  const [categories, setCategories] = useState<ClientMenuCategory[]>(initialCategories);
  const [menuItems, setMenuItems] = useState<ClientMenuItem[]>(initialMenuItems);

  // Active View Tab: 'menu' (sidebar category & stock) | 'qr' | 'import'
  const [activeView, setActiveView] = useState<"menu" | "qr" | "import">("menu");

  // Selected Category filter
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // New Category input in Sidebar
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Inline Category Editing in Sidebar
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  // Modals
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<ClientMenuItem | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // --------------------------------------------------------------------------
  // API Call Handlers: Categories
  // --------------------------------------------------------------------------

  // 1. Create a Category
  const handleAddCategory = async (nameToAdd?: string) => {
    const name = (nameToAdd || newCategoryName).trim();
    if (!name || isAddingCategory) return;

    // 0ms Optimistic UI update
    const tempCat: ClientMenuCategory = {
      id: `cat_${categories.length + 1}_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      name,
      sortOrder: categories.length + 1,
      isActive: true,
    };
    const prevCategories = [...categories];
    setCategories((prev) => [...prev, tempCat]);
    setSelectedCategory(name);
    setNewCategoryName("");
    showToast(`Category "${name}" created!`, "success");

    setIsAddingCategory(true);
    try {
      const res = await fetch(`/api/admin/${encodeURIComponent(restaurantSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_CATEGORY", name }),
      });
      const data = await res.json();
      if (data.success && data.categories) {
        setCategories(data.categories);
      } else {
        setCategories(prevCategories);
        showToast(data.error || "Failed to create category", "error");
      }
    } catch {
      setCategories(prevCategories);
      showToast("Error creating category", "error");
    } finally {
      setIsAddingCategory(false);
    }
  };

  // Quick-Add Cuisine Preset Button handler
  const handleQuickAddPreset = async (categoryName: string) => {
    const existing = categories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    );
    if (existing) {
      setSelectedCategory(existing.name);
      showToast(`Switched to "${existing.name}"`, "info");
      return;
    }
    await handleAddCategory(categoryName);
  };

  // 2. Rename Category (0ms Optimistic UI)
  const handleSaveRenameCategory = async (categoryId: string) => {
    if (!editCategoryName.trim()) return;

    const oldName = categories.find((c) => c.id === categoryId)?.name || "";
    const newName = editCategoryName.trim();
    const prevCategories = [...categories];
    const prevMenuItems = [...menuItems];

    // 0ms Instant optimistic local update
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, name: newName } : c))
    );
    setMenuItems((prev) =>
      prev.map((i) => (i.categoryId === categoryId ? { ...i, category: newName } : i))
    );
    if (selectedCategory === oldName) {
      setSelectedCategory(newName);
    }
    setEditingCategoryId(null);
    showToast(`Renamed to "${newName}"`, "success");

    try {
      const res = await fetch(`/api/admin/${encodeURIComponent(restaurantSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_CATEGORY",
          categoryId,
          name: newName,
        }),
      });
      const data = await res.json();
      if (data.success && data.categories) {
        setCategories(data.categories);
        if (data.menuItems) setMenuItems(data.menuItems);
      } else {
        setCategories(prevCategories);
        setMenuItems(prevMenuItems);
        showToast(data.error || "Failed to rename category", "error");
      }
    } catch {
      setCategories(prevCategories);
      setMenuItems(prevMenuItems);
      showToast("Error renaming category", "error");
    }
  };

  // 3. Delete Category (0ms Optimistic UI)
  const handleDeleteCategory = async (cat: ClientMenuCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    const prevCategories = [...categories];
    const prevMenuItems = [...menuItems];

    // 0ms Instant optimistic local removal
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    setMenuItems((prev) =>
      prev.map((i) =>
        i.categoryId === cat.id ? { ...i, categoryId: null, category: "General" } : i
      )
    );
    if (selectedCategory === cat.name) {
      setSelectedCategory("All");
    }
    showToast(`Category "${cat.name}" deleted.`, "info");

    try {
      const res = await fetch(`/api/admin/${encodeURIComponent(restaurantSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_CATEGORY", categoryId: cat.id }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.categories) setCategories(data.categories);
        if (data.menuItems) setMenuItems(data.menuItems);
      } else {
        setCategories(prevCategories);
        setMenuItems(prevMenuItems);
        showToast(data.error || "Failed to delete category", "error");
      }
    } catch {
      setCategories(prevCategories);
      setMenuItems(prevMenuItems);
      showToast("Error deleting category", "error");
    }
  };

  // --------------------------------------------------------------------------
  // API Call Handlers: Menu Items / Stock Management
  // --------------------------------------------------------------------------

  // 4. 1-Click "In Stock / Sold Out" Toggle Switch (0ms Optimistic UI)
  const handleToggleAvailability = async (dishId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;

    // 0ms Instant Optimistic UI update
    setMenuItems((prev) =>
      prev.map((i) => (i.id === dishId ? { ...i, isAvailable: nextStatus } : i))
    );
    showToast(
      nextStatus ? "Marked In Stock" : "Marked Sold Out",
      nextStatus ? "success" : "info"
    );

    try {
      const res = await fetch(`/api/admin/${encodeURIComponent(restaurantSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_DISH_AVAILABILITY",
          dishId,
          isAvailable: nextStatus,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        // Revert on error
        setMenuItems((prev) =>
          prev.map((i) => (i.id === dishId ? { ...i, isAvailable: currentStatus } : i))
        );
        showToast("Failed to update stock status", "error");
      }
    } catch {
      setMenuItems((prev) =>
        prev.map((i) => (i.id === dishId ? { ...i, isAvailable: currentStatus } : i))
      );
      showToast("Error toggling stock status", "error");
    }
  };

  // 5. Delete Dish (0ms Optimistic UI)
  const handleDeleteDish = async (dishId: string, dishName: string) => {
    if (!confirm(`Are you sure you want to delete "${dishName}"?`)) return;

    const prevMenuItems = [...menuItems];

    // 0ms Instant local removal
    setMenuItems((prev) => prev.filter((i) => i.id !== dishId));
    showToast(`Deleted "${dishName}".`, "info");

    try {
      const res = await fetch(`/api/admin/${encodeURIComponent(restaurantSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_DISH", dishId }),
      });
      const data = await res.json();
      if (data.success && data.menuItems) {
        setMenuItems(data.menuItems);
      } else {
        setMenuItems(prevMenuItems);
        showToast(data.error || "Failed to delete dish", "error");
      }
    } catch {
      setMenuItems(prevMenuItems);
      showToast("Error deleting dish", "error");
    }
  };

  // 6. Save Dish (Add or Edit - 0ms Optimistic UI)
  const handleSaveDish = async (dishData: DishFormData) => {
    const prevMenuItems = [...menuItems];

    if (dishData.id) {
      // 0ms Instant update
      setMenuItems((prev) =>
        prev.map((i) => (i.id === dishData.id ? ({ ...i, ...dishData } as ClientMenuItem) : i))
      );
      showToast(`Dish "${dishData.name}" updated!`, "success");
    } else {
      // 0ms Instant add
      const tempId = `item_${Date.now()}`;
      const tempDish: ClientMenuItem = {
        id: tempId,
        restaurantId: "rest_current",
        categoryId: dishData.categoryId || null,
        category: dishData.category || "General",
        name: dishData.name.trim(),
        description: dishData.description?.trim() || null,
        imageUrl: dishData.imageUrl || null,
        priceInRupees: dishData.priceInRupees,
        priceInCents: dishData.priceInRupees,
        dietaryType: dishData.dietaryType,
        isAvailable: true,
        modifiers: dishData.modifiers || [],
      };
      setMenuItems((prev) => [tempDish, ...prev]);
      showToast(`Dish "${dishData.name}" added to menu!`, "success");
    }

    try {
      if (dishData.id) {
        const res = await fetch(`/api/admin/${encodeURIComponent(restaurantSlug)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UPDATE_DISH",
            dishId: dishData.id,
            dish: dishData,
          }),
        });
        const data = await res.json();
        if (data.success && data.menuItems) {
          setMenuItems(data.menuItems);
          if (data.categories) setCategories(data.categories);
        }
      } else {
        const res = await fetch(`/api/admin/${encodeURIComponent(restaurantSlug)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ADD_DISH",
            ...dishData,
          }),
        });
        const data = await res.json();
        if (data.success && data.menuItems) {
          setMenuItems(data.menuItems);
          if (data.categories) setCategories(data.categories);
        }
      }
    } catch (err: unknown) {
      setMenuItems(prevMenuItems);
      const msg = err instanceof Error ? err.message : "Failed to save dish";
      showToast(msg, "error");
      throw err;
    }
  };

  // 7. Bulk Import Handler
  const handleBulkImport = async (payload: {
    categories?: string[];
    dishes: Array<{
      category: string;
      name: string;
      priceInRupees: number;
      dietaryType?: "VEG" | "NON_VEG" | "EGG";
      description?: string;
    }>;
  }) => {
    const res = await fetch(`/api/admin/${encodeURIComponent(restaurantSlug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "BULK_IMPORT",
        ...payload,
      }),
    });
    const data = await res.json();
    if (data.success) {
      if (data.categories) setCategories(data.categories);
      if (data.menuItems) setMenuItems(data.menuItems);
      showToast(`Imported ${data.result.importedDishesCount} dishes!`, "success");
      return data.result;
    } else {
      throw new Error(data.error || "Failed to import menu");
    }
  };

  // Filtered dishes for current selected category & search query
  const displayedDishes = useMemo(() => {
    let list = menuItems;

    if (selectedCategory !== "All") {
      list = list.filter(
        (i) => i.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description && i.description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [menuItems, selectedCategory, searchQuery]);

  // Dish count per category map
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of menuItems) {
      const catKey = item.category || "General";
      map.set(catKey, (map.get(catKey) || 0) + 1);
    }
    return map;
  }, [menuItems]);

  const inStockCount = useMemo(
    () => displayedDishes.filter((i) => i.isAvailable).length,
    [displayedDishes]
  );
  const soldOutCount = displayedDishes.length - inStockCount;

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4 text-center space-y-3">
        <div className="w-10 h-10 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-[#1C1917]">Loading PlateSync Admin Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] print:bg-white text-[#1C1917] flex flex-col font-sans select-none print:p-0">
      {/* ------------------------------------------------------------------ */}
      {/* Top Navbar                                                         */}
      {/* ------------------------------------------------------------------ */}
      <header className="print:hidden bg-white border-b border-[#E7E5E4] px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Left: Brand info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1C1917] text-white flex items-center justify-center shadow-xs">
              <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-[#1C1917] tracking-tight">
                  {restaurant.name}
                </h1>
                <span className="bg-stone-100 border border-stone-200 text-stone-700 font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                  Admin Portal
                </span>
              </div>
              <p className="text-xs text-stone-500 font-mono">
                slug: <strong>{restaurantSlug}</strong>
              </p>
            </div>
          </div>

          {/* Center: View Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200">
            <button
              type="button"
              onClick={() => setActiveView("menu")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === "menu"
                  ? "bg-white text-[#1C1917] shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Category &amp; Stock</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("qr")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === "qr"
                  ? "bg-white text-[#1C1917] shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Table QR Codes</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Import</span>
            </button>
          </div>

          {/* Right: Quick External Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={`/r/${encodeURIComponent(restaurantSlug)}/t/1`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
            >
              <span>Guest Table 1</span>
              <ExternalLink className="w-3 h-3 text-stone-500" />
            </a>

            <a
              href={`/kds/${encodeURIComponent(restaurantSlug)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-950 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>KDS Screen</span>
              <ExternalLink className="w-3 h-3 text-amber-700" />
            </a>
          </div>
        </div>
      </header>

      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 pointer-events-none print:hidden">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-lg border text-xs font-semibold flex items-center gap-2 backdrop-blur-md ${
              toastMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : toastMessage.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-300"
                : "bg-white text-stone-800 border-stone-300"
            }`}
          >
            {toastMessage.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {toastMessage.type === "error" && <XCircle className="w-4 h-4 text-rose-600" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Main Content Area                                                  */}
      {/* ------------------------------------------------------------------ */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1 print:p-0 print:m-0 print:max-w-none">
        {activeView === "menu" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ---------------------------------------------------------------- */}
            {/* LEFT SIDEBAR: Category Manager (Add & Quick Presets & Rename)    */}
            {/* ---------------------------------------------------------------- */}
            <aside className="lg:col-span-4 bg-white border border-[#E7E5E4] rounded-3xl p-5 shadow-2xs space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#1C1917] tracking-tight uppercase flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-stone-600" />
                    <span>Categories ({categories.length})</span>
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Select a category to view dishes or add a new cuisine.
                </p>
              </div>

              {/* Add New Category Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddCategory();
                }}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New Category Name..."
                    className="flex-1 bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C1917] focus:outline-none focus:border-[#1C1917] focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newCategoryName.trim() || isAddingCategory}
                    className="px-3.5 py-2 bg-[#1C1917] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </form>

              {/* Quick-Add Cuisine Presets */}
              <div className="space-y-2 pt-2 border-t border-[#E7E5E4]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Quick Add Cuisine Presets:</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {CUISINE_PRESETS.map((preset) => {
                    const alreadyExists = categories.some(
                      (c) => c.name.toLowerCase() === preset.categoryName.toLowerCase()
                    );

                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleQuickAddPreset(preset.categoryName)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          alreadyExists
                            ? "bg-stone-100 text-stone-600 border-stone-200"
                            : "bg-[#FAF9F6] hover:bg-stone-100 text-stone-800 border-[#E7E5E4] hover:border-stone-300 shadow-2xs active:scale-95"
                        }`}
                        title={
                          alreadyExists
                            ? `Category "${preset.categoryName}" already exists (click to view)`
                            : `Add "${preset.categoryName}"`
                        }
                      >
                        <span>{preset.label}</span>
                        {alreadyExists && <span className="ml-1 text-[10px] text-stone-400">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Categories Navigation List */}
              <div className="space-y-1.5 pt-2 border-t border-[#E7E5E4] max-h-[460px] overflow-y-auto pr-1">
                {/* "All Items" row */}
                <button
                  type="button"
                  onClick={() => setSelectedCategory("All")}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategory === "All"
                      ? "bg-[#1C1917] text-white shadow-xs"
                      : "bg-[#FAF9F6] hover:bg-stone-100 text-stone-700"
                  }`}
                >
                  <span>All Dishes</span>
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded-full ${
                      selectedCategory === "All"
                        ? "bg-white/20 text-white"
                        : "bg-stone-200 text-stone-800"
                    }`}
                  >
                    {menuItems.length}
                  </span>
                </button>

                {/* Category Items */}
                {categories.map((cat) => {
                  const count = categoryCounts.get(cat.name) || 0;
                  const isSelected = selectedCategory === cat.name;
                  const isEditing = editingCategoryId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#1C1917] text-white shadow-xs font-semibold"
                          : "bg-[#FAF9F6] hover:bg-stone-100 text-stone-700"
                      }`}
                    >
                      {/* Name or Rename Input */}
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1.5 flex-1 min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            className="flex-1 bg-white border border-stone-300 rounded px-2 py-0.5 text-xs text-stone-900 focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRenameCategory(cat.id)}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryId(null)}
                            className="p-1 rounded bg-stone-300 text-stone-800 hover:bg-stone-400 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="truncate flex-1">{cat.name}</span>
                      )}

                      {/* Right Action Icons & Dish Count */}
                      {!isEditing && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`font-mono text-[11px] px-2 py-0.5 rounded-full ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-stone-200 text-stone-800"
                            }`}
                          >
                            {count}
                          </span>

                          {/* Rename Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCategoryId(cat.id);
                              setEditCategoryName(cat.name);
                            }}
                            className={`p-1 rounded hover:bg-white/30 transition-colors cursor-pointer ${
                              isSelected ? "text-white/80 hover:text-white" : "text-stone-400 hover:text-stone-800"
                            }`}
                            title="Rename Category"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCategory(cat, e)}
                            className={`p-1 rounded hover:bg-white/30 transition-colors cursor-pointer ${
                              isSelected ? "text-white/80 hover:text-rose-200" : "text-stone-400 hover:text-rose-600"
                            }`}
                            title="Delete Category"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* ---------------------------------------------------------------- */}
            {/* RIGHT MAIN PANEL: Dishes in Selected Category & Stock Management */}
            {/* ---------------------------------------------------------------- */}
            <div className="lg:col-span-8 space-y-4">
              {/* Category Header Bar with Stats & Search */}
              <div className="bg-white border border-[#E7E5E4] rounded-3xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-[#1C1917] tracking-tight">
                        {selectedCategory === "All" ? "All Dishes" : selectedCategory}
                      </h2>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                        {displayedDishes.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-stone-500 font-medium mt-1">
                      <span className="text-emerald-700 font-semibold">
                        ● {inStockCount} In Stock
                      </span>
                      <span>•</span>
                      <span className="text-rose-700 font-semibold">
                        ● {soldOutCount} Sold Out
                      </span>
                    </div>
                  </div>

                  {/* Add Dish Action */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDish(null);
                      setIsDishModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#1C1917] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer self-start sm:self-auto active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>+ Add New Dish</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search within ${selectedCategory}...`}
                    className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#1C1917] focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2 text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Main Dish List */}
              {displayedDishes.length === 0 ? (
                <div className="p-14 text-center space-y-3 bg-white border border-[#E7E5E4] rounded-3xl">
                  <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto">
                    <UtensilsCrossed className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#1C1917]">No Dishes in Category</h3>
                    <p className="text-xs text-stone-500">
                      Add a new dish to this category using the button above.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDish(null);
                      setIsDishModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#1C1917] text-white text-xs font-semibold rounded-xl hover:bg-black transition-colors cursor-pointer"
                  >
                    + Add New Dish
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {displayedDishes.map((dish) => {
                    const isVeg = isVegetarianItem(dish);
                    const price = dish.priceInRupees || dish.priceInCents || 0;
                    const modifierCount = dish.modifiers?.length || 0;

                    return (
                      <div
                        key={dish.id}
                        className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          dish.isAvailable ? "border-[#E7E5E4]" : "border-stone-300 opacity-80"
                        }`}
                      >
                        {/* Left: Dish Image + Info */}
                        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                          {/* Dish Photo or Placeholder */}
                          {dish.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={dish.imageUrl}
                              alt={dish.name}
                              loading="lazy"
                              decoding="async"
                              className="w-20 h-20 rounded-xl object-cover shrink-0 border border-stone-200"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-xl bg-stone-100 border border-stone-200 shrink-0 flex items-center justify-center text-stone-400">
                              <UtensilsCrossed className="w-6 h-6 stroke-[1.5]" />
                            </div>
                          )}

                          {/* Indicator, Full Name (no truncate), Category, Price, Description */}
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <FoodTypeIndicator
                                dietaryType={dish.dietaryType}
                                isVeg={isVeg}
                                className="shrink-0"
                              />
                              <h3 className="font-bold text-base text-[#1C1917] leading-snug">
                                {dish.name}
                              </h3>
                              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 shrink-0">
                                • {dish.category}
                              </span>
                            </div>

                            <div className="font-mono font-bold text-sm text-stone-900">
                              {formatRupees(price)}
                            </div>

                            {dish.description && (
                              <p className="text-xs text-stone-600 leading-relaxed">
                                {dish.description}
                              </p>
                            )}

                            {modifierCount > 0 && (
                              <div className="flex items-center gap-1 text-[11px] text-stone-500 pt-0.5">
                                <Layers className="w-3 h-3 text-stone-400" />
                                <span>
                                  {modifierCount} modifier group
                                  {modifierCount !== 1 ? "s" : ""} (
                                  {dish.modifiers.map((m) => m.name).join(", ")})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: 1-Click "In Stock / Sold Out" Toggle Switch & Actions */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                          {/* 1-Click Stock Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleAvailability(dish.id, dish.isAvailable)}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                              dish.isAvailable
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100"
                            }`}
                            title="1-Click toggle stock status for kitchen"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                dish.isAvailable ? "bg-emerald-600 animate-pulse" : "bg-rose-600"
                              }`}
                            />
                            <span>{dish.isAvailable ? "In Stock" : "Sold Out"}</span>
                          </button>

                          {/* Edit Dish */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDish(dish);
                              setIsDishModalOpen(true);
                            }}
                            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
                            title="Edit Dish"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Dish */}
                          <button
                            type="button"
                            onClick={() => handleDeleteDish(dish.id, dish.name)}
                            className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 transition-colors cursor-pointer"
                            title="Delete Dish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Table QR Generator View */
          <TableQrGenerator
            restaurantSlug={restaurantSlug}
            restaurantName={restaurant.name}
          />
        )}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Modals: Add / Edit Dish & Bulk Import                               */}
      {/* ------------------------------------------------------------------ */}
      <DishEditorModal
        isOpen={isDishModalOpen}
        onClose={() => {
          setIsDishModalOpen(false);
          setEditingDish(null);
        }}
        onSave={handleSaveDish}
        categories={categories}
        onQuickAddCategory={async (name) => {
          await handleAddCategory(name);
          const found = categories.find(
            (c) => c.name.toLowerCase() === name.toLowerCase()
          );
          return found || null;
        }}
        editingDish={editingDish}
      />

      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImport={handleBulkImport}
      />
    </div>
  );
}
