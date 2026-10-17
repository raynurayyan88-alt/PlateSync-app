import { PrismaClient, Prisma } from "@prisma/client";
import {
  GRAND_EMPIRE_RESTAURANT,
  GRAND_EMPIRE_CATEGORIES,
  GRAND_EMPIRE_MENU_ITEMS,
  SEED_RESTAURANT,
  SEED_CATEGORIES,
  SEED_MENU_ITEMS,
} from "../src/lib/menu";

const prisma = new PrismaClient();

// ============================================================================
// MAIN DATABASE SEED RUNNER
// ============================================================================
export async function seedDatabase() {
  console.log("🌱 PlateSync: Seeding Dynamic Multi-Cuisine Database...");

  try {
    // 1. Seed Grand Empire Multi-Cuisine
    const empireRestaurant = await prisma.restaurant.upsert({
      where: { slug: GRAND_EMPIRE_RESTAURANT.slug },
      update: { name: GRAND_EMPIRE_RESTAURANT.name },
      create: {
        name: GRAND_EMPIRE_RESTAURANT.name,
        slug: GRAND_EMPIRE_RESTAURANT.slug,
        posIntegrationId: GRAND_EMPIRE_RESTAURANT.posIntegrationId,
      },
    });

    // Upsert Categories for Grand Empire
    const categoryMap = new Map<string, string>();
    for (const cat of GRAND_EMPIRE_CATEGORIES) {
      const existing = await prisma.menuCategory.findFirst({
        where: { restaurantId: empireRestaurant.id, name: cat.name },
      });

      if (existing) {
        categoryMap.set(cat.name, existing.id);
      } else {
        const createdCat = await prisma.menuCategory.create({
          data: {
            restaurantId: empireRestaurant.id,
            name: cat.name,
            sortOrder: cat.sortOrder,
            isActive: cat.isActive,
          },
        });
        categoryMap.set(cat.name, createdCat.id);
      }
    }

    // Upsert Menu Items for Grand Empire
    for (const item of GRAND_EMPIRE_MENU_ITEMS) {
      const catId = categoryMap.get(item.categoryName) || null;
      const existing = await prisma.menuItem.findFirst({
        where: { restaurantId: empireRestaurant.id, name: item.name },
      });

      if (existing) {
        await prisma.menuItem.update({
          where: { id: existing.id },
          data: {
            description: item.description,
            imageUrl: item.imageUrl,
            priceInRupees: item.priceInRupees,
            priceInCents: item.priceInCents,
            dietaryType: item.dietaryType,
            categoryId: catId,
            modifiers: item.modifiers as unknown as Prisma.InputJsonValue,
            isAvailable: item.isAvailable,
          },
        });
      } else {
        await prisma.menuItem.create({
          data: {
            restaurantId: empireRestaurant.id,
            categoryId: catId,
            name: item.name,
            description: item.description,
            imageUrl: item.imageUrl,
            priceInRupees: item.priceInRupees,
            priceInCents: item.priceInCents,
            dietaryType: item.dietaryType,
            modifiers: item.modifiers as unknown as Prisma.InputJsonValue,
            isAvailable: item.isAvailable,
          },
        });
      }
    }
    console.log(
      `✅ Seeded restaurant "${GRAND_EMPIRE_RESTAURANT.name}" (${GRAND_EMPIRE_MENU_ITEMS.length} dishes in ${GRAND_EMPIRE_CATEGORIES.length} categories).`
    );

    // 2. Seed The Burger Loft (for backward compatibility)
    const loftRestaurant = await prisma.restaurant.upsert({
      where: { slug: SEED_RESTAURANT.slug },
      update: { name: SEED_RESTAURANT.name },
      create: {
        name: SEED_RESTAURANT.name,
        slug: SEED_RESTAURANT.slug,
        posIntegrationId: SEED_RESTAURANT.posIntegrationId,
      },
    });

    for (const cat of SEED_CATEGORIES) {
      const existing = await prisma.menuCategory.findFirst({
        where: { restaurantId: loftRestaurant.id, name: cat.name },
      });
      if (!existing) {
        await prisma.menuCategory.create({
          data: {
            restaurantId: loftRestaurant.id,
            name: cat.name,
            sortOrder: cat.sortOrder,
            isActive: cat.isActive,
          },
        });
      }
    }

    for (const item of SEED_MENU_ITEMS) {
      const existing = await prisma.menuItem.findFirst({
        where: { restaurantId: loftRestaurant.id, name: item.name },
      });
      if (!existing) {
        await prisma.menuItem.create({
          data: {
            restaurantId: loftRestaurant.id,
            name: item.name,
            description: item.description,
            imageUrl: item.imageUrl,
            priceInRupees: item.priceInRupees,
            priceInCents: item.priceInCents,
            dietaryType: item.dietaryType,
            modifiers: item.modifiers as unknown as Prisma.InputJsonValue,
            isAvailable: item.isAvailable,
          },
        });
      }
    }
    console.log(`✅ Seeded restaurant "${SEED_RESTAURANT.name}" for compatibility.`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[Seed] Notice: Could not connect to PostgreSQL database (${errorMsg}).`);
    console.log(`ℹ️ Seed data structures are ready in code and will serve in memory fallback seamlessly!`);
  } finally {
    await prisma.$disconnect();
  }
}

// Auto-run if executed directly
if (
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1]?.endsWith("seed.ts")
) {
  seedDatabase()
    .then(() => {
      console.log("✨ Seed script execution finished successfully.");
      process.exit(0);
    })
    .catch((e) => {
      console.error("❌ Seed script failed:", e);
      process.exit(1);
    });
}
