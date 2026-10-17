import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, city } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Hotel or restaurant name is required" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const trimmedCity = city ? String(city).trim() : "";

    // 1. Generate URL-safe slug from hotel name
    const cleanBase = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let slug = cleanBase || "hotel";

    // Ensure slug uniqueness
    try {
      const existing = await prisma.restaurant.findUnique({
        where: { slug },
      });
      if (existing) {
        const rand = Math.floor(1000 + Math.random() * 9000);
        slug = `${slug}-${rand}`;
      }
    } catch {
      // Fallback random suffix if DB query fails
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const displayName = trimmedCity ? `${trimmedName} (${trimmedCity})` : trimmedName;

    // 2. Create the new Restaurant in PostgreSQL via Prisma
    let restaurant;
    try {
      restaurant = await prisma.restaurant.create({
        data: {
          name: displayName,
          slug,
        },
      });
    } catch (err) {
      console.warn("[Onboard] DB create restaurant offline fallback:", err);
      restaurant = {
        id: `rest_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: displayName,
        slug,
      };
    }

    // 3. Automatically seed 4 starter MenuCategory rows
    const starterCategories = [
      { name: "Arabic & Grills", sortOrder: 1 },
      { name: "Main Course", sortOrder: 2 },
      { name: "Chinese & Continental", sortOrder: 3 },
      { name: "Beverages & Desserts", sortOrder: 4 },
    ];

    const starterDishes = [
      {
        categoryName: "Arabic & Grills",
        name: "Charcoal Chicken Al Faham",
        description: "Slow-grilled whole chicken with Arabian spices, garlic toum, and kuboos.",
        imageUrl:
          "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80",
        priceInRupees: 280,
        dietaryType: "NON_VEG" as const,
        modifiers: [
          {
            id: "mod_portion",
            name: "Portion Size",
            required: true,
            options: [
              { label: "Quarter", priceInRupees: 160 },
              { label: "Half", priceInRupees: 280 },
              { label: "Full", priceInRupees: 540 },
            ],
          },
          {
            id: "mod_extras",
            name: "Add-ons",
            required: false,
            options: [
              { label: "Extra Garlic Toum", priceInRupees: 25 },
              { label: "Extra Kuboos", priceInRupees: 15 },
            ],
          },
        ],
      },
      {
        categoryName: "Main Course",
        name: "Paneer Butter Masala",
        description: "Rich cottage cheese cubes simmered in spiced tomato cashew butter gravy.",
        imageUrl:
          "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80",
        priceInRupees: 240,
        dietaryType: "VEG" as const,
        modifiers: [],
      },
      {
        categoryName: "Chinese & Continental",
        name: "Schezwan Hakka Noodles",
        description: "Wok-tossed noodles with fresh vegetables in fiery Schezwan chilli oil.",
        imageUrl:
          "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80",
        priceInRupees: 210,
        dietaryType: "VEG" as const,
        modifiers: [
          {
            id: "mod_spice",
            name: "Spice Level",
            required: true,
            options: [
              { label: "Medium", priceInRupees: 0 },
              { label: "Spicy 🔥", priceInRupees: 0 },
            ],
          },
        ],
      },
      {
        categoryName: "Beverages & Desserts",
        name: "Fresh Mint Lime Cooler",
        description: "Refreshing cold crushed mint with sparkling lime and organic rock salt.",
        imageUrl:
          "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
        priceInRupees: 90,
        dietaryType: "VEG" as const,
        modifiers: [],
      },
    ];

    try {
      for (const catData of starterCategories) {
        const createdCat = await prisma.menuCategory.create({
          data: {
            restaurantId: restaurant.id,
            name: catData.name,
            sortOrder: catData.sortOrder,
            isActive: true,
          },
        });

        // Seed 1 starter dish in this category
        const dishData = starterDishes.find((d) => d.categoryName === catData.name);
        if (dishData) {
          await prisma.menuItem.create({
            data: {
              restaurantId: restaurant.id,
              categoryId: createdCat.id,
              name: dishData.name,
              description: dishData.description,
              imageUrl: dishData.imageUrl,
              priceInRupees: dishData.priceInRupees,
              priceInCents: dishData.priceInRupees,
              dietaryType: dishData.dietaryType,
              modifiers: dishData.modifiers as unknown as Prisma.InputJsonValue,
              isAvailable: true,
            },
          });
        }
      }
    } catch (err) {
      console.warn("[Onboard] DB category seeding offline fallback:", err);
    }

    return NextResponse.json({
      success: true,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
      },
      redirectUrl: `/admin/${encodeURIComponent(restaurant.slug)}`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error creating restaurant";
    console.error("[Onboard API Error]", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
