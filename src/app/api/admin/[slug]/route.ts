import { NextRequest, NextResponse } from "next/server";
import {
  getRestaurantMenu,
  addCategory,
  quickAddPresetCategory,
  updateCategory,
  reorderCategories,
  deleteCategory,
  addDish,
  updateDish,
  toggleDishAvailability,
  deleteDish,
  bulkImportMenu,
  CUISINE_PRESETS,
} from "@/lib/menu";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const menuData = await getRestaurantMenu(slug);

    const totalDishes = menuData.menuItems.length;
    const inStockDishes = menuData.menuItems.filter((i) => i.isAvailable).length;
    const soldOutDishes = totalDishes - inStockDishes;
    const vegDishes = menuData.menuItems.filter((i) => i.dietaryType === "VEG").length;
    const nonVegDishes = menuData.menuItems.filter((i) => i.dietaryType === "NON_VEG").length;
    const eggDishes = menuData.menuItems.filter((i) => i.dietaryType === "EGG").length;

    return NextResponse.json({
      success: true,
      restaurant: menuData.restaurant,
      categories: menuData.categories,
      menuItems: menuData.menuItems,
      cuisinePresets: CUISINE_PRESETS,
      stats: {
        totalDishes,
        inStockDishes,
        soldOutDishes,
        totalCategories: menuData.categories.length,
        vegDishes,
        nonVegDishes,
        eggDishes,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error fetching admin menu";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case "ADD_CATEGORY": {
        if (!body.name || !body.name.trim()) {
          return NextResponse.json(
            { success: false, error: "Category name is required" },
            { status: 400 }
          );
        }
        const createdCat = await addCategory(slug, {
          name: body.name,
          sortOrder: body.sortOrder,
        });
        const updated = await getRestaurantMenu(slug);
        return NextResponse.json({
          success: true,
          category: createdCat,
          categories: updated.categories,
        });
      }

      case "QUICK_PRESET_CATEGORY": {
        if (!body.categoryName) {
          return NextResponse.json(
            { success: false, error: "Preset category name is required" },
            { status: 400 }
          );
        }
        const cat = await quickAddPresetCategory(slug, body.categoryName);
        const updated = await getRestaurantMenu(slug);
        return NextResponse.json({
          success: true,
          category: cat,
          categories: updated.categories,
        });
      }

      case "UPDATE_CATEGORY": {
        if (!body.categoryId) {
          return NextResponse.json(
            { success: false, error: "Category ID is required" },
            { status: 400 }
          );
        }
        const updatedCat = await updateCategory(slug, body.categoryId, {
          name: body.name,
          sortOrder: body.sortOrder,
          isActive: body.isActive,
        });
        const updated = await getRestaurantMenu(slug);
        return NextResponse.json({
          success: true,
          category: updatedCat,
          categories: updated.categories,
          menuItems: updated.menuItems,
        });
      }

      case "REORDER_CATEGORIES": {
        if (!Array.isArray(body.orderList)) {
          return NextResponse.json(
            { success: false, error: "orderList must be an array" },
            { status: 400 }
          );
        }
        const categories = await reorderCategories(slug, body.orderList);
        return NextResponse.json({ success: true, categories });
      }

      case "DELETE_CATEGORY": {
        if (!body.categoryId) {
          return NextResponse.json(
            { success: false, error: "Category ID is required" },
            { status: 400 }
          );
        }
        await deleteCategory(slug, body.categoryId);
        const updated = await getRestaurantMenu(slug);
        return NextResponse.json({
          success: true,
          categories: updated.categories,
          menuItems: updated.menuItems,
        });
      }

      case "ADD_DISH": {
        if (!body.name || !body.priceInRupees) {
          return NextResponse.json(
            { success: false, error: "Dish name and priceInRupees are required" },
            { status: 400 }
          );
        }
        const newDish = await addDish(slug, {
          categoryId: body.categoryId,
          category: body.category,
          name: body.name,
          description: body.description,
          imageUrl: body.imageUrl,
          priceInRupees: Number(body.priceInRupees),
          dietaryType: body.dietaryType || "NON_VEG",
          modifiers: body.modifiers,
          isAvailable: body.isAvailable ?? true,
        });
        const updated = await getRestaurantMenu(slug);
        return NextResponse.json({
          success: true,
          dish: newDish,
          categories: updated.categories,
          menuItems: updated.menuItems,
        });
      }

      case "UPDATE_DISH": {
        if (!body.dishId) {
          return NextResponse.json(
            { success: false, error: "Dish ID is required" },
            { status: 400 }
          );
        }
        const updatedDish = await updateDish(slug, body.dishId, body.dish || body);
        const updated = await getRestaurantMenu(slug);
        return NextResponse.json({
          success: true,
          dish: updatedDish,
          categories: updated.categories,
          menuItems: updated.menuItems,
        });
      }

      case "TOGGLE_DISH_AVAILABILITY": {
        if (!body.dishId) {
          return NextResponse.json(
            { success: false, error: "Dish ID is required" },
            { status: 400 }
          );
        }
        const isAvailable = await toggleDishAvailability(slug, body.dishId, body.isAvailable);
        return NextResponse.json({ success: true, dishId: body.dishId, isAvailable });
      }

      case "DELETE_DISH": {
        if (!body.dishId) {
          return NextResponse.json(
            { success: false, error: "Dish ID is required" },
            { status: 400 }
          );
        }
        await deleteDish(slug, body.dishId);
        const updated = await getRestaurantMenu(slug);
        return NextResponse.json({ success: true, menuItems: updated.menuItems });
      }

      case "BULK_IMPORT": {
        if (!body.dishes || !Array.isArray(body.dishes)) {
          return NextResponse.json(
            { success: false, error: "Payload must contain a dishes array" },
            { status: 400 }
          );
        }
        const result = await bulkImportMenu(slug, {
          categories: body.categories,
          dishes: body.dishes,
        });
        const updated = await getRestaurantMenu(slug);
        return NextResponse.json({
          success: true,
          result,
          categories: updated.categories,
          menuItems: updated.menuItems,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error handling admin mutation";
    console.error("[Admin API Error]", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
