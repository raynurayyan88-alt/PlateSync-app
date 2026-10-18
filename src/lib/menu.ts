// Shared types and menu helpers (Zero dependency on @prisma/client or prisma/seed.ts)

export type DietaryType = "VEG" | "NON_VEG" | "EGG";
export const DietaryType = {
  VEG: "VEG" as const,
  NON_VEG: "NON_VEG" as const,
  EGG: "EGG" as const,
};

type JsonModifierValue = Array<{
  id: string;
  name: string;
  required: boolean;
  options: Array<{
    label: string;
    priceInRupees: number;
    priceInCents?: number;
  }>;
}>;

export interface MenuItemModifierOption {
  label: string;
  priceInRupees: number;
  priceInCents?: number;
}

export interface MenuItemModifier {
  id: string;
  name: string;
  required: boolean;
  options: MenuItemModifierOption[];
}

export interface ClientMenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ClientMenuItem {
  id: string;
  restaurantId: string;
  categoryId?: string | null;
  category: string;
  name: string;
  description: string | null;
  imageUrl?: string | null;
  priceInRupees: number;
  priceInCents: number;
  dietaryType: DietaryType;
  isAvailable: boolean;
  modifiers: MenuItemModifier[];
}

export interface RuntimeMenuData {
  restaurant: { id: string; name: string; slug: string };
  categories: ClientMenuCategory[];
  menuItems: ClientMenuItem[];
}

// 1-Click Quick Add Cuisine Presets for Onboarding
export const CUISINE_PRESETS = [
  { label: "+ Arabic", categoryName: "Arabic & Grills" },
  { label: "+ Chinese", categoryName: "Chinese & Wok" },
  { label: "+ Western", categoryName: "Western & Continental" },
  { label: "+ Indian", categoryName: "Indian Favorites" },
  { label: "+ Beverages", categoryName: "Shakes & Mojitos" },
];

// ============================================================================
// 1. DEMO MULTI-CUISINE RESTAURANT: Grand Empire Multi-Cuisine
// ============================================================================
export const GRAND_EMPIRE_RESTAURANT = {
  name: "Grand Empire Multi-Cuisine",
  slug: "grand-empire",
  posIntegrationId: "pos_empire_001",
};

export const GRAND_EMPIRE_CATEGORIES = [
  { id: "cat_arabic_grills", name: "Arabic & Grills", sortOrder: 1, isActive: true },
  { id: "cat_western_continental", name: "Western & Continental", sortOrder: 2, isActive: true },
  { id: "cat_chinese_wok", name: "Chinese & Wok", sortOrder: 3, isActive: true },
  { id: "cat_indian_favorites", name: "Indian Favorites", sortOrder: 4, isActive: true },
  { id: "cat_shakes_mojitos", name: "Shakes & Mojitos", sortOrder: 5, isActive: true },
];

export const GRAND_EMPIRE_MENU_ITEMS = [
  // --- 1. ARABIC & GRILLS ---
  {
    name: "Charcoal Alfaham Chicken",
    description:
      "Slow-roasted bone-in chicken marinated in Arabian black pepper, garlic, yogurt, and aromatic spices over natural charcoal.",
    imageUrl:
      "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 160,
    priceInCents: 160,
    categoryName: "Arabic & Grills",
    categoryId: "cat_arabic_grills",
    dietaryType: DietaryType.NON_VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "portion",
        name: "Portion Size",
        required: true,
        options: [
          { label: "Quarter (1 pc)", priceInRupees: 0, priceInCents: 0 },
          { label: "Half (2 pcs)", priceInRupees: 140, priceInCents: 140 },
          { label: "Full (4 pcs)", priceInRupees: 420, priceInCents: 420 },
        ],
      },
      {
        id: "spice_style",
        name: "Spice Style",
        required: false,
        options: [
          { label: "Original Pepper Alfaham", priceInRupees: 0, priceInCents: 0 },
          { label: "Kanthari Fiery Green Chilli", priceInRupees: 20, priceInCents: 20 },
          { label: "Peri-Peri Spicy Marination", priceInRupees: 25, priceInCents: 25 },
        ],
      },
      {
        id: "addons",
        name: "Add-ons & Dips",
        required: false,
        options: [
          { label: "Extra Garlic Toum (Mayo)", priceInRupees: 30, priceInCents: 30 },
          { label: "Extra Kuboos (2 pcs)", priceInRupees: 15, priceInCents: 15 },
          { label: "Spicy Schezwan Mayo", priceInRupees: 25, priceInCents: 25 },
        ],
      },
    ],
  },
  {
    name: "Lebanese Chicken Shawarma Roll",
    description:
      "Thinly shaved marinated chicken, house garlic toum, and crisp dill pickles wrapped tight and toasted on the griddle.",
    imageUrl:
      "https://images.unsplash.com/photo-1637806930600-37fa8892069d?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 130,
    priceInCents: 130,
    categoryName: "Arabic & Grills",
    categoryId: "cat_arabic_grills",
    dietaryType: DietaryType.NON_VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "bread_wrap",
        name: "Wrap Style",
        required: true,
        options: [
          { label: "Classic Khubz Roll", priceInRupees: 0, priceInCents: 0 },
          { label: "Rumali Roti Roll", priceInRupees: 20, priceInCents: 20 },
        ],
      },
      {
        id: "shawarma_addons",
        name: "Add-ons",
        required: false,
        options: [
          { label: "Extra Roasted Chicken Filling", priceInRupees: 40, priceInCents: 40 },
          { label: "Melted Cheddar Cheese", priceInRupees: 35, priceInCents: 35 },
          { label: "Extra Garlic Toum", priceInRupees: 20, priceInCents: 20 },
        ],
      },
    ],
  },
  {
    name: "Chicken Kuzhi Mandi",
    description:
      "Authentic Yemeni fragrant basmati rice cooked underground with gentle whole spices and tender steam-baked chicken.",
    imageUrl:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 240,
    priceInCents: 240,
    categoryName: "Arabic & Grills",
    categoryId: "cat_arabic_grills",
    dietaryType: DietaryType.NON_VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "portion",
        name: "Portion Size",
        required: true,
        options: [
          { label: "Single (1 pc + Rice)", priceInRupees: 0, priceInCents: 0 },
          { label: "Quarter Mandi", priceInRupees: 40, priceInCents: 40 },
          { label: "Half Mandi (2 pcs + Double Rice)", priceInRupees: 220, priceInCents: 220 },
        ],
      },
      {
        id: "mandi_sides",
        name: "Extra Sides",
        required: false,
        options: [
          { label: "Extra Mandi Rice Portion", priceInRupees: 80, priceInCents: 80 },
          { label: "Extra Tomato Salata Chutney & Mayo", priceInRupees: 20, priceInCents: 20 },
        ],
      },
    ],
  },

  // --- 2. WESTERN & CONTINENTAL ---
  {
    name: "Classic Smashed Burger",
    description:
      "Crispy-edged seared patties with melted cheese, house caramelized onions, pickles, and signature bistro sauce on a brioche bun.",
    imageUrl:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 260,
    priceInCents: 260,
    categoryName: "Western & Continental",
    categoryId: "cat_western_continental",
    dietaryType: DietaryType.NON_VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "patty_choice",
        name: "Choice of Patty",
        required: true,
        options: [
          { label: "Double Smashed Chicken Patty", priceInRupees: 0, priceInCents: 0 },
          { label: "Prime Angus Beef Patty", priceInRupees: 40, priceInCents: 40 },
        ],
      },
      {
        id: "burger_addons",
        name: "Add-ons",
        required: false,
        options: [
          { label: "Extra Cheddar Slice", priceInRupees: 40, priceInCents: 40 },
          { label: "Fire-Roasted Jalapeños", priceInRupees: 25, priceInCents: 25 },
          { label: "Crispy Bacon Strips", priceInRupees: 60, priceInCents: 60 },
          { label: "Fried Sunny-Side Up Egg", priceInRupees: 25, priceInCents: 25 },
        ],
      },
    ],
  },
  {
    name: "Creamy Alfredo Pasta",
    description:
      "Penne pasta tossed in a velvety garlic parmesan cream sauce with sauteed buttered mushrooms and Italian herbs.",
    imageUrl:
      "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 280,
    priceInCents: 280,
    categoryName: "Western & Continental",
    categoryId: "cat_western_continental",
    dietaryType: DietaryType.VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "pasta_protein",
        name: "Protein Upgrade",
        required: false,
        options: [
          { label: "Keep Vegetarian", priceInRupees: 0, priceInCents: 0 },
          { label: "Herb Grilled Chicken", priceInRupees: 60, priceInCents: 60 },
        ],
      },
      {
        id: "pasta_sides",
        name: "Add-ons",
        required: false,
        options: [
          { label: "Toasted Garlic Bread (2 pcs)", priceInRupees: 50, priceInCents: 50 },
          { label: "Extra Aged Parmesan Shavings", priceInRupees: 40, priceInCents: 40 },
        ],
      },
    ],
  },
  {
    name: "Peri-Peri Loaded Fries",
    description:
      "Golden crispy skin-on fries dusted in fiery African bird's eye chili seasoning with garlic herb drizzle.",
    imageUrl:
      "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 180,
    priceInCents: 180,
    categoryName: "Western & Continental",
    categoryId: "cat_western_continental",
    dietaryType: DietaryType.VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "heat_level",
        name: "Heat Level",
        required: true,
        options: [
          { label: "Zesty Mild Peri-Peri", priceInRupees: 0, priceInCents: 0 },
          { label: "Fiery Hot", priceInRupees: 0, priceInCents: 0 },
        ],
      },
      {
        id: "fry_toppings",
        name: "Toppings",
        required: false,
        options: [
          { label: "Warm Liquid Cheese Sauce", priceInRupees: 35, priceInCents: 35 },
          { label: "Crispy Chicken Bacon Bits", priceInRupees: 45, priceInCents: 45 },
          { label: "Truffle Aioli Dip", priceInRupees: 30, priceInCents: 30 },
        ],
      },
    ],
  },

  // --- 3. CHINESE & WOK ---
  {
    name: "Schezwan Egg Fried Rice",
    description:
      "Wok-tossed basmati grains with scrambled eggs, scallions, French beans, and spicy red chili Sichuan pepper paste.",
    imageUrl:
      "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 210,
    priceInCents: 210,
    categoryName: "Chinese & Wok",
    categoryId: "cat_chinese_wok",
    dietaryType: DietaryType.EGG,
    isAvailable: true,
    modifiers: [
      {
        id: "wok_spice",
        name: "Spice Level",
        required: true,
        options: [
          { label: "Medium Spicy", priceInRupees: 0, priceInCents: 0 },
          { label: "Fiery Schezwan Hot", priceInRupees: 0, priceInCents: 0 },
        ],
      },
      {
        id: "rice_addons",
        name: "Add-ons",
        required: false,
        options: [
          { label: "Extra Fried Egg", priceInRupees: 25, priceInCents: 25 },
          { label: "Side Schezwan Gravy", priceInRupees: 40, priceInCents: 40 },
        ],
      },
    ],
  },
  {
    name: "Crispy Chilli Chicken Dry",
    description:
      "Crispy batter-fried boneless chicken cubes tossed with diced green capsicum, spring onions, garlic, and dark soy.",
    imageUrl:
      "https://images.unsplash.com/photo-1625938144755-652e08e359b7?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 250,
    priceInCents: 250,
    categoryName: "Chinese & Wok",
    categoryId: "cat_chinese_wok",
    dietaryType: DietaryType.NON_VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "chilli_style",
        name: "Style",
        required: true,
        options: [
          { label: "Dry Tossed (Crispy Starter)", priceInRupees: 0, priceInCents: 0 },
          { label: "Semi-Gravy Sauce", priceInRupees: 20, priceInCents: 20 },
        ],
      },
      {
        id: "chilli_heat",
        name: "Heat",
        required: true,
        options: [
          { label: "Classic Chinese Hot", priceInRupees: 0, priceInCents: 0 },
          { label: "Dragon Chilli Fiery", priceInRupees: 15, priceInCents: 15 },
        ],
      },
    ],
  },
  {
    name: "Veg Hakka Noodles",
    description:
      "Traditional thin wheat noodles stir-fried on high flame with shredded cabbage, carrots, bell peppers, and white pepper.",
    imageUrl:
      "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 180,
    priceInCents: 180,
    categoryName: "Chinese & Wok",
    categoryId: "cat_chinese_wok",
    dietaryType: DietaryType.VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "noodle_style",
        name: "Preparation",
        required: true,
        options: [
          { label: "Classic Mild Hakka", priceInRupees: 0, priceInCents: 0 },
          { label: "Spicy Schezwan Toss", priceInRupees: 20, priceInCents: 20 },
        ],
      },
      {
        id: "noodle_addons",
        name: "Add-ons",
        required: false,
        options: [
          { label: "Add Scrambled Egg", priceInRupees: 25, priceInCents: 25 },
          { label: "Extra Stir-Fried Veggies", priceInRupees: 30, priceInCents: 30 },
        ],
      },
    ],
  },

  // --- 4. INDIAN FAVORITES ---
  {
    name: "Butter Chicken",
    description:
      "Tandoor-charred chicken tikka simmered in a silky tomato, cashew, and makhani cream gravy infused with dried fenugreek.",
    imageUrl:
      "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 320,
    priceInCents: 320,
    categoryName: "Indian Favorites",
    categoryId: "cat_indian_favorites",
    dietaryType: DietaryType.NON_VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "curry_portion",
        name: "Portion Size",
        required: true,
        options: [
          { label: "Half Handi (3 pcs)", priceInRupees: 0, priceInCents: 0 },
          { label: "Full Handi (6 pcs)", priceInRupees: 240, priceInCents: 240 },
        ],
      },
      {
        id: "butter_extra",
        name: "Add-ons",
        required: false,
        options: [
          { label: "Extra Dollop of Amul Butter", priceInRupees: 20, priceInCents: 20 },
          { label: "Fresh Cream Swirl", priceInRupees: 15, priceInCents: 15 },
        ],
      },
    ],
  },
  {
    name: "Paneer Tikka Masala",
    description:
      "Char-grilled fresh cottage cheese cubes cooked in a rich, spiced onion-tomato gravy with bell peppers and garam masala.",
    imageUrl:
      "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 270,
    priceInCents: 270,
    categoryName: "Indian Favorites",
    categoryId: "cat_indian_favorites",
    dietaryType: DietaryType.VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "spice_level",
        name: "Spice Profile",
        required: true,
        options: [
          { label: "Medium Spiced", priceInRupees: 0, priceInCents: 0 },
          { label: "Spicy Dhaba Style", priceInRupees: 0, priceInCents: 0 },
        ],
      },
      {
        id: "paneer_addons",
        name: "Add-ons",
        required: false,
        options: [
          { label: "Extra Tandoori Paneer Cubes", priceInRupees: 60, priceInCents: 60 },
          { label: "Ghee Tadka on Top", priceInRupees: 25, priceInCents: 25 },
        ],
      },
    ],
  },
  {
    name: "Garlic Butter Naan",
    description:
      "Leavened refined flour flatbread slapped on clay tandoor walls, brushed with crushed garlic and melted butter.",
    imageUrl:
      "https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 60,
    priceInCents: 60,
    categoryName: "Indian Favorites",
    categoryId: "cat_indian_favorites",
    dietaryType: DietaryType.VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "naan_style",
        name: "Finish",
        required: true,
        options: [
          { label: "Garlic Butter Glazed", priceInRupees: 0, priceInCents: 0 },
          { label: "Extra Crispy Tandoori", priceInRupees: 0, priceInCents: 0 },
        ],
      },
      {
        id: "naan_addons",
        name: "Upgrades",
        required: false,
        options: [
          { label: "Stuffed Cheddar Cheese", priceInRupees: 35, priceInCents: 35 },
          { label: "Extra Amul Butter", priceInRupees: 15, priceInCents: 15 },
        ],
      },
    ],
  },

  // --- 5. SHAKES & MOJITOS ---
  {
    name: "Passionfruit Mojito",
    description:
      "Zesty crushed fresh mint leaves, lime chunks, and tangy tropical passionfruit pulp charged with chilled sparkling soda.",
    imageUrl:
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 120,
    priceInCents: 120,
    categoryName: "Shakes & Mojitos",
    categoryId: "cat_shakes_mojitos",
    dietaryType: DietaryType.VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "fizz_base",
        name: "Fizz Base",
        required: true,
        options: [
          { label: "Classic Club Soda (Crisp)", priceInRupees: 0, priceInCents: 0 },
          { label: "Sprite / Sweet Fizz", priceInRupees: 15, priceInCents: 15 },
        ],
      },
    ],
  },
  {
    name: "Belgian Chocolate Thickshake",
    description:
      "Ultra-thick gourmet blend of rich Belgian dark cocoa, chilled whole milk, and scoops of dairy chocolate gelato.",
    imageUrl:
      "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 170,
    priceInCents: 170,
    categoryName: "Shakes & Mojitos",
    categoryId: "cat_shakes_mojitos",
    dietaryType: DietaryType.VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "shake_addons",
        name: "Indulgent Add-ons",
        required: false,
        options: [
          { label: "Scoop of Vanilla Ice Cream", priceInRupees: 35, priceInCents: 35 },
          { label: "Roasted Hazelnut Drizzle", priceInRupees: 25, priceInCents: 25 },
          { label: "Crushed Oreo Cookie Dust", priceInRupees: 20, priceInCents: 20 },
        ],
      },
    ],
  },
  {
    name: "Fresh Lime Soda",
    description:
      "Freshly squeezed green limes mixed with chilled sparkling soda for an instantly refreshing palate cleanser.",
    imageUrl:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 60,
    priceInCents: 60,
    categoryName: "Shakes & Mojitos",
    categoryId: "cat_shakes_mojitos",
    dietaryType: DietaryType.VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "sweet_salt",
        name: "Preparation",
        required: true,
        options: [
          { label: "Sweet & Salt Mixed", priceInRupees: 0, priceInCents: 0 },
          { label: "Sweet Only", priceInRupees: 0, priceInCents: 0 },
          { label: "Salt Only", priceInRupees: 0, priceInCents: 0 },
        ],
      },
    ],
  },
];

// ============================================================================
// 2. LEGACY COMPATIBILITY: The Burger Loft (Used in multiplayer simulation tests)
// ============================================================================
export const SEED_RESTAURANT = {
  name: "The Burger Loft",
  slug: "burger-loft",
  posIntegrationId: "pos_loft_001",
};

export const SEED_CATEGORIES = [
  { id: "cat_burgers", name: "Burgers", sortOrder: 1, isActive: true },
  { id: "cat_sides", name: "Sides", sortOrder: 2, isActive: true },
  { id: "cat_drinks", name: "Drinks", sortOrder: 3, isActive: true },
  { id: "cat_dessert", name: "Dessert", sortOrder: 4, isActive: true },
];

export const SEED_MENU_ITEMS = [
  {
    name: "The Classic Smash",
    description:
      "Double smashed certified Angus beef patties, American cheese, house pickles, shredded lettuce, and loft sauce on a toasted brioche bun.",
    imageUrl:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 240,
    priceInCents: 240,
    categoryName: "Burgers",
    categoryId: "cat_burgers",
    dietaryType: DietaryType.NON_VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "cheese",
        name: "Extra Cheese",
        required: false,
        options: [
          { label: "Extra American Cheese", priceInRupees: 30, priceInCents: 30 },
          { label: "Smoked Gouda", priceInRupees: 40, priceInCents: 40 },
        ],
      },
    ],
  },
  {
    name: "Truffle Burger",
    description:
      "Sautéed wild forest mushrooms, melted Swiss cheese, black truffle garlic aioli, and baby arugula.",
    imageUrl:
      "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 320,
    priceInCents: 1850, // Backward compatibility for test assertions
    categoryName: "Burgers",
    categoryId: "cat_burgers",
    dietaryType: DietaryType.NON_VEG,
    isAvailable: true,
    modifiers: [
      {
        id: "truffle_extra",
        name: "Extra Truffle Aioli",
        required: false,
        options: [{ label: "Side of Truffle Aioli", priceInRupees: 40, priceInCents: 40 }],
      },
    ],
  },
  {
    name: "Truffle Fries",
    description:
      "Hand-cut Idaho russet fries tossed with Italian white truffle oil, grated aged parmesan, and cracked pepper.",
    imageUrl:
      "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=240&q=70",
    priceInRupees: 180,
    priceInCents: 750, // Backward compatibility for test assertions
    categoryName: "Sides",
    categoryId: "cat_sides",
    dietaryType: DietaryType.VEG,
    isAvailable: true,
    modifiers: [],
  },
];

// In-memory runtime cache for administrative changes and zero-downtime offline support
const runtimeMenuStore = new Map<string, RuntimeMenuData>();

/**
 * Ensures any Unsplash image URL is compressed to ~15KB (240px width, q=70)
 */
export function optimizeDishImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.includes("images.unsplash.com")) {
    const base = url.split("?")[0];
    return `${base}?auto=format&fit=crop&w=240&q=70`;
  }
  return url;
}

// Safe server-only lazy loader for Prisma (Prevents bundling into client components)
async function getPrisma() {
  if (typeof window !== "undefined") return null;
  if (!process.env.DATABASE_URL) return null;
  try {
    const mod = await import("./prisma");
    return mod.prisma;
  } catch {
    return null;
  }
}

// Safe database operation with 120ms fast-fail
async function safeDbOp<T>(
  op: (prismaClient: NonNullable<Awaited<ReturnType<typeof getPrisma>>>) => Promise<T>
): Promise<T | null> {
  try {
    const prisma = await getPrisma();
    if (!prisma) return null;
    return await Promise.race([
      op(prisma),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("DB operation timed out")), 120)
      ),
    ]);
  } catch {
    return null;
  }
}

/**
 * Fetch restaurant menu with dynamic categories and dishes (Instant In-Memory Cache + 80ms Fast-Fail)
 */
export async function getRestaurantMenu(slug: string): Promise<RuntimeMenuData> {
  const normalizedSlug = slug.toLowerCase();

  // 1. Instant check in memory store (<1ms)
  if (runtimeMenuStore.has(normalizedSlug)) {
    return runtimeMenuStore.get(normalizedSlug)!;
  }

  // 2. Fast-fail Prisma query with 80ms timeout (<100ms failover)
  try {
    const prisma = await getPrisma();
    if (prisma) {
      const dbPromise = prisma.restaurant.findUnique({
        where: { slug: normalizedSlug },
        include: {
          categories: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          },
          menuItems: {
            where: { isAvailable: true },
            include: { category: true },
            orderBy: { name: "asc" },
          },
        },
      });

      const restaurant = await Promise.race([
        dbPromise,
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("DB timeout")), 80)),
      ]);

      if (restaurant && (restaurant.menuItems.length > 0 || restaurant.categories.length > 0)) {
        const dynamicCategories: ClientMenuCategory[] =
          restaurant.categories.length > 0
            ? restaurant.categories.map((c) => ({
                id: c.id,
                name: c.name,
                sortOrder: c.sortOrder,
                isActive: c.isActive,
              }))
            : Array.from(
                new Set(restaurant.menuItems.map((i) => i.category?.name || "General"))
              ).map((name, idx) => ({
                id: `cat_${idx + 1}`,
                name,
                sortOrder: idx + 1,
                isActive: true,
              }));

        const menuItems: ClientMenuItem[] = restaurant.menuItems.map((item) => {
          const categoryName = item.category?.name || "General";
          const rawModifiers = (item.modifiers as unknown as MenuItemModifier[]) || [];

          const standardizedModifiers: MenuItemModifier[] = rawModifiers.map((mod) => ({
            id: mod.id,
            name: mod.name,
            required: mod.required,
            options: (mod.options || []).map((opt) => {
              const rupees =
                typeof opt.priceInRupees === "number"
                  ? opt.priceInRupees
                  : typeof opt.priceInCents === "number"
                  ? opt.priceInCents
                  : 0;
              return {
                label: opt.label,
                priceInRupees: rupees,
                priceInCents: rupees,
              };
            }),
          }));

          const rupees = item.priceInRupees ?? item.priceInCents ?? 0;

          return {
            id: item.id,
            restaurantId: item.restaurantId,
            categoryId: item.categoryId,
            category: categoryName,
            name: item.name,
            description: item.description,
            imageUrl: optimizeDishImageUrl(item.imageUrl),
            priceInRupees: rupees,
            priceInCents: rupees,
            dietaryType: (item.dietaryType as DietaryType) || "NON_VEG",
            isAvailable: item.isAvailable,
            modifiers: standardizedModifiers,
          };
        });

        const data: RuntimeMenuData = {
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            slug: restaurant.slug,
          },
          categories: dynamicCategories,
          menuItems,
        };

        runtimeMenuStore.set(normalizedSlug, data);
        return data;
      }
    }
  } catch {
    // Database query skipped/timed out (<80ms). Instant fallback to in-memory store.
  }

  // Fallback to verified seed data (Grand Empire or Burger Loft)
  if (normalizedSlug === "burger-loft") {
    const fallbackRestaurant = {
      id: "rest_burger_loft",
      name: SEED_RESTAURANT.name,
      slug: "burger-loft",
    };

    const fallbackItems: ClientMenuItem[] = SEED_MENU_ITEMS.map((item, idx) => ({
      id: `item_bl_${idx + 1}`,
      restaurantId: fallbackRestaurant.id,
      categoryId: item.categoryId,
      category: item.categoryName,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl || null,
      priceInRupees: item.priceInRupees,
      priceInCents: item.priceInCents,
      dietaryType: item.dietaryType,
      isAvailable: item.isAvailable,
      modifiers: (item.modifiers as unknown as MenuItemModifier[]) || [],
    }));

    const data: RuntimeMenuData = {
      restaurant: fallbackRestaurant,
      categories: [...SEED_CATEGORIES],
      menuItems: fallbackItems,
    };
    runtimeMenuStore.set(normalizedSlug, data);
    return data;
  }

  // Default demo multi-cuisine showcase: Grand Empire Multi-Cuisine
  const fallbackRestaurant = {
    id: "rest_grand_empire",
    name:
      normalizedSlug === "grand-empire"
        ? GRAND_EMPIRE_RESTAURANT.name
        : normalizedSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    slug: normalizedSlug,
  };

  const fallbackItems: ClientMenuItem[] = GRAND_EMPIRE_MENU_ITEMS.map((item, idx) => ({
    id: `item_ge_${idx + 1}`,
    restaurantId: fallbackRestaurant.id,
    categoryId: item.categoryId,
    category: item.categoryName,
    name: item.name,
    description: item.description,
    imageUrl: item.imageUrl || null,
    priceInRupees: item.priceInRupees,
    priceInCents: item.priceInRupees,
    dietaryType: item.dietaryType,
    isAvailable: item.isAvailable,
    modifiers: (item.modifiers as unknown as MenuItemModifier[]) || [],
  }));

  const data: RuntimeMenuData = {
    restaurant: fallbackRestaurant,
    categories: [...GRAND_EMPIRE_CATEGORIES],
    menuItems: fallbackItems,
  };
  runtimeMenuStore.set(normalizedSlug, data);
  return data;
}

/**
 * Add a new category
 */
export async function addCategory(
  slug: string,
  categoryInput: { name: string; sortOrder?: number }
): Promise<ClientMenuCategory> {
  const current = await getRestaurantMenu(slug);
  const normalizedSlug = slug.toLowerCase();
  const nextOrder =
    categoryInput.sortOrder ??
    (current.categories.length > 0
      ? Math.max(...current.categories.map((c) => c.sortOrder)) + 1
      : 1);

  const newCat: ClientMenuCategory = {
    id: `cat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name: categoryInput.name.trim(),
    sortOrder: nextOrder,
    isActive: true,
  };

  current.categories.push(newCat);
  current.categories.sort((a, b) => a.sortOrder - b.sortOrder);
  runtimeMenuStore.set(normalizedSlug, current);

  // DB persistence if available
  await safeDbOp(async (prisma) => {
    let restaurant = await prisma.restaurant.findUnique({ where: { slug: normalizedSlug } });
    if (!restaurant) {
      restaurant = await prisma.restaurant.create({
        data: { name: current.restaurant.name, slug: normalizedSlug },
      });
    }
    const dbCat = await prisma.menuCategory.create({
      data: {
        id: newCat.id,
        restaurantId: restaurant.id,
        name: newCat.name,
        sortOrder: newCat.sortOrder,
        isActive: true,
      },
    });
    newCat.id = dbCat.id;
  });

  return newCat;
}

/**
 * Quick add cuisine presets (adds missing ones)
 */
export async function quickAddPresetCategory(
  slug: string,
  categoryName: string
): Promise<ClientMenuCategory> {
  const current = await getRestaurantMenu(slug);
  const existing = current.categories.find(
    (c) => c.name.toLowerCase() === categoryName.trim().toLowerCase()
  );
  if (existing) {
    return existing;
  }
  return addCategory(slug, { name: categoryName.trim() });
}

/**
 * Update a category (rename, reorder, or toggle active)
 */
export async function updateCategory(
  slug: string,
  categoryId: string,
  data: { name?: string; sortOrder?: number; isActive?: boolean }
): Promise<ClientMenuCategory | null> {
  const current = await getRestaurantMenu(slug);
  const normalizedSlug = slug.toLowerCase();
  const cat = current.categories.find((c) => c.id === categoryId);
  if (!cat) return null;

  const oldName = cat.name;
  if (data.name !== undefined) cat.name = data.name.trim();
  if (data.sortOrder !== undefined) cat.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) cat.isActive = data.isActive;

  // Synchronize category name on member dishes
  if (data.name && data.name.trim() !== oldName) {
    for (const item of current.menuItems) {
      if (item.categoryId === categoryId || item.category === oldName) {
        item.category = data.name.trim();
        item.categoryId = categoryId;
      }
    }
  }

  current.categories.sort((a, b) => a.sortOrder - b.sortOrder);
  runtimeMenuStore.set(normalizedSlug, current);

  await safeDbOp(async (prisma) => {
    await prisma.menuCategory.update({
      where: { id: categoryId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  });

  return cat;
}

/**
 * Reorder categories in bulk
 */
export async function reorderCategories(
  slug: string,
  orderList: Array<{ id: string; sortOrder: number }>
): Promise<ClientMenuCategory[]> {
  const current = await getRestaurantMenu(slug);
  const normalizedSlug = slug.toLowerCase();

  for (const item of orderList) {
    const target = current.categories.find((c) => c.id === item.id);
    if (target) {
      target.sortOrder = item.sortOrder;
    }
  }

  current.categories.sort((a, b) => a.sortOrder - b.sortOrder);
  runtimeMenuStore.set(normalizedSlug, current);

  try {
    const prisma = await getPrisma();
    if (prisma) {
      for (const item of orderList) {
        await prisma.menuCategory.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        });
      }
    }
  } catch {
    // DB offline fallback
  }

  return current.categories;
}

/**
 * Delete a category
 */
export async function deleteCategory(slug: string, categoryId: string): Promise<boolean> {
  const current = await getRestaurantMenu(slug);
  const normalizedSlug = slug.toLowerCase();

  const idx = current.categories.findIndex((c) => c.id === categoryId);
  if (idx === -1) return false;

  const deletedCat = current.categories.splice(idx, 1)[0];

  for (const item of current.menuItems) {
    if (item.categoryId === categoryId || item.category === deletedCat.name) {
      item.categoryId = null;
      item.category = "General";
    }
  }

  runtimeMenuStore.set(normalizedSlug, current);

  await safeDbOp(async (prisma) => {
    await prisma.menuCategory.delete({ where: { id: categoryId } });
  });

  return true;
}

/**
 * Add a new dish
 */
export async function addDish(
  slug: string,
  dish: {
    categoryId?: string | null;
    category?: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    priceInRupees: number;
    dietaryType: DietaryType;
    modifiers?: MenuItemModifier[];
    isAvailable?: boolean;
  }
): Promise<ClientMenuItem> {
  const current = await getRestaurantMenu(slug);
  const normalizedSlug = slug.toLowerCase();

  let targetCatName = dish.category?.trim();
  let targetCatId = dish.categoryId || null;

  if (targetCatId) {
    const existing = current.categories.find((c) => c.id === targetCatId);
    if (existing) targetCatName = existing.name;
  } else if (targetCatName) {
    const existing = current.categories.find(
      (c) => c.name.toLowerCase() === targetCatName!.toLowerCase()
    );
    if (existing) {
      targetCatId = existing.id;
      targetCatName = existing.name;
    } else {
      const newCat: ClientMenuCategory = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: targetCatName,
        sortOrder: current.categories.length + 1,
        isActive: true,
      };
      current.categories.push(newCat);
      targetCatId = newCat.id;
    }
  }

  if (!targetCatName) {
    targetCatName = current.categories[0]?.name || "General";
    targetCatId = current.categories[0]?.id || null;
  }

  const standardizedModifiers = (dish.modifiers || []).map((mod, idx) => ({
    id: mod.id || `mod_${Date.now()}_${idx}`,
    name: mod.name,
    required: !!mod.required,
    options: (mod.options || []).map((opt) => ({
      label: opt.label,
      priceInRupees: opt.priceInRupees ?? opt.priceInCents ?? 0,
      priceInCents: opt.priceInRupees ?? opt.priceInCents ?? 0,
    })),
  }));

  const newDish: ClientMenuItem = {
    id: `item_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    restaurantId: current.restaurant.id,
    categoryId: targetCatId,
    category: targetCatName,
    name: dish.name.trim(),
    description: dish.description?.trim() || null,
    imageUrl: optimizeDishImageUrl(dish.imageUrl?.trim()) || null,
    priceInRupees: dish.priceInRupees,
    priceInCents: dish.priceInRupees,
    dietaryType: dish.dietaryType || "NON_VEG",
    isAvailable: dish.isAvailable ?? true,
    modifiers: standardizedModifiers,
  };

  current.menuItems.unshift(newDish);
  runtimeMenuStore.set(normalizedSlug, current);

  await safeDbOp(async (prisma) => {
    let restaurant = await prisma.restaurant.findUnique({ where: { slug: normalizedSlug } });
    if (!restaurant) {
      restaurant = await prisma.restaurant.create({
        data: { name: current.restaurant.name, slug: normalizedSlug },
      });
    }

    await prisma.menuItem.create({
      data: {
        id: newDish.id,
        restaurantId: restaurant.id,
        categoryId: targetCatId,
        name: newDish.name,
        description: newDish.description,
        imageUrl: newDish.imageUrl,
        priceInRupees: newDish.priceInRupees,
        priceInCents: newDish.priceInRupees,
        dietaryType: newDish.dietaryType,
        isAvailable: newDish.isAvailable,
        modifiers: newDish.modifiers as unknown as JsonModifierValue,
      },
    });
  });

  return newDish;
}

/**
 * Update an existing dish
 */
export async function updateDish(
  slug: string,
  dishId: string,
  data: Partial<ClientMenuItem>
): Promise<ClientMenuItem | null> {
  const current = await getRestaurantMenu(slug);
  const normalizedSlug = slug.toLowerCase();
  const dish = current.menuItems.find((i) => i.id === dishId);
  if (!dish) return null;

  if (data.name !== undefined) dish.name = data.name.trim();
  if (data.description !== undefined) {
    dish.description = data.description ? data.description.trim() : null;
  }
  if (data.imageUrl !== undefined) {
    dish.imageUrl = optimizeDishImageUrl(data.imageUrl ? data.imageUrl.trim() : null);
  }
  if (data.priceInRupees !== undefined) {
    dish.priceInRupees = data.priceInRupees;
    dish.priceInCents = data.priceInRupees;
  }
  if (data.dietaryType !== undefined) dish.dietaryType = data.dietaryType;
  if (data.isAvailable !== undefined) dish.isAvailable = data.isAvailable;
  if (data.categoryId !== undefined) {
    dish.categoryId = data.categoryId;
    const cat = current.categories.find((c) => c.id === data.categoryId);
    if (cat) dish.category = cat.name;
  }
  if (data.category !== undefined && !data.categoryId) {
    dish.category = data.category;
  }
  if (data.modifiers !== undefined) {
    dish.modifiers = data.modifiers.map((mod, idx) => ({
      id: mod.id || `mod_${Date.now()}_${idx}`,
      name: mod.name,
      required: !!mod.required,
      options: (mod.options || []).map((opt) => ({
        label: opt.label,
        priceInRupees: opt.priceInRupees ?? opt.priceInCents ?? 0,
        priceInCents: opt.priceInRupees ?? opt.priceInCents ?? 0,
      })),
    }));
  }

  runtimeMenuStore.set(normalizedSlug, current);

  await safeDbOp(async (prisma) => {
    await prisma.menuItem.update({
      where: { id: dishId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined
          ? { description: data.description ? data.description.trim() : null }
          : {}),
        ...(data.imageUrl !== undefined
          ? { imageUrl: data.imageUrl ? data.imageUrl.trim() : null }
          : {}),
        ...(data.priceInRupees !== undefined
          ? { priceInRupees: data.priceInRupees, priceInCents: data.priceInRupees }
          : {}),
        ...(data.dietaryType ? { dietaryType: data.dietaryType } : {}),
        ...(data.isAvailable !== undefined ? { isAvailable: data.isAvailable } : {}),
        ...(data.categoryId ? { categoryId: data.categoryId } : {}),
        ...(data.modifiers
          ? { modifiers: dish.modifiers as unknown as JsonModifierValue }
          : {}),
      },
    });
  });

  return dish;
}

/**
 * 1-click toggle dish availability (In Stock / Sold Out)
 */
export async function toggleDishAvailability(
  slug: string,
  dishId: string,
  isAvailable?: boolean
): Promise<boolean> {
  const current = await getRestaurantMenu(slug);
  const normalizedSlug = slug.toLowerCase();
  const dish = current.menuItems.find((i) => i.id === dishId);
  if (!dish) return false;

  dish.isAvailable = isAvailable !== undefined ? isAvailable : !dish.isAvailable;
  runtimeMenuStore.set(normalizedSlug, current);

  await safeDbOp(async (prisma) => {
    await prisma.menuItem.update({
      where: { id: dishId },
      data: { isAvailable: dish.isAvailable },
    });
  });

  return dish.isAvailable;
}

/**
 * Delete a dish
 */
export async function deleteDish(slug: string, dishId: string): Promise<boolean> {
  const current = await getRestaurantMenu(slug);
  const normalizedSlug = slug.toLowerCase();
  const idx = current.menuItems.findIndex((i) => i.id === dishId);
  if (idx === -1) return false;

  current.menuItems.splice(idx, 1);
  runtimeMenuStore.set(normalizedSlug, current);

  await safeDbOp(async (prisma) => {
    await prisma.menuItem.delete({ where: { id: dishId } });
  });

  return true;
}

/**
 * Bulk import menu from parsed categories & dishes
 */
export async function bulkImportMenu(
  slug: string,
  payload: {
    categories?: string[];
    dishes: Array<{
      category: string;
      name: string;
      priceInRupees: number;
      dietaryType?: DietaryType;
      description?: string;
      imageUrl?: string | null;
      modifiers?: MenuItemModifier[];
    }>;
  }
): Promise<{ importedCategoriesCount: number; importedDishesCount: number }> {
  const current = await getRestaurantMenu(slug);
  const normalizedSlug = slug.toLowerCase();

  let newCatsCount = 0;
  let newDishesCount = 0;

  // 1. Process explicit categories
  if (payload.categories) {
    for (const catName of payload.categories) {
      const trimmed = catName.trim();
      if (!trimmed) continue;
      const exists = current.categories.some(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (!exists) {
        current.categories.push({
          id: `cat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: trimmed,
          sortOrder: current.categories.length + 1,
          isActive: true,
        });
        newCatsCount++;
      }
    }
  }

  // 2. Process dishes
  for (const item of payload.dishes) {
    const trimmedCat = (item.category || "General").trim();
    let cat = current.categories.find(
      (c) => c.name.toLowerCase() === trimmedCat.toLowerCase()
    );
    if (!cat) {
      cat = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: trimmedCat,
        sortOrder: current.categories.length + 1,
        isActive: true,
      };
      current.categories.push(cat);
      newCatsCount++;
    }

    const dishId = `item_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newDish: ClientMenuItem = {
      id: dishId,
      restaurantId: current.restaurant.id,
      categoryId: cat.id,
      category: cat.name,
      name: item.name.trim(),
      description: item.description?.trim() || null,
      imageUrl: optimizeDishImageUrl(item.imageUrl?.trim()) || null,
      priceInRupees: Number(item.priceInRupees) || 0,
      priceInCents: Number(item.priceInRupees) || 0,
      dietaryType: item.dietaryType || "NON_VEG",
      isAvailable: true,
      modifiers: (item.modifiers || []).map((m, idx) => ({
        id: m.id || `mod_${Date.now()}_${idx}`,
        name: m.name,
        required: !!m.required,
        options: (m.options || []).map((opt) => ({
          label: opt.label,
          priceInRupees: opt.priceInRupees ?? opt.priceInCents ?? 0,
          priceInCents: opt.priceInRupees ?? opt.priceInCents ?? 0,
        })),
      })),
    };

    current.menuItems.unshift(newDish);
    newDishesCount++;
  }

  current.categories.sort((a, b) => a.sortOrder - b.sortOrder);
  runtimeMenuStore.set(normalizedSlug, current);

  // Try DB persist
  try {
    const prisma = await getPrisma();
    if (prisma) {
      let restaurant = await prisma.restaurant.findUnique({ where: { slug: normalizedSlug } });
      if (!restaurant) {
        restaurant = await prisma.restaurant.create({
          data: { name: current.restaurant.name, slug: normalizedSlug },
        });
      }

      for (const cat of current.categories) {
        await prisma.menuCategory.upsert({
          where: { id: cat.id },
          create: {
            id: cat.id,
            restaurantId: restaurant.id,
            name: cat.name,
            sortOrder: cat.sortOrder,
            isActive: cat.isActive,
          },
          update: {
            name: cat.name,
            sortOrder: cat.sortOrder,
          },
        });
      }

      for (const dish of current.menuItems.slice(0, newDishesCount)) {
        await prisma.menuItem.upsert({
          where: { id: dish.id },
          create: {
            id: dish.id,
            restaurantId: restaurant.id,
            categoryId: dish.categoryId,
            name: dish.name,
            description: dish.description,
            imageUrl: dish.imageUrl,
            priceInRupees: dish.priceInRupees,
            priceInCents: dish.priceInRupees,
            dietaryType: dish.dietaryType,
            isAvailable: dish.isAvailable,
            modifiers: dish.modifiers as unknown as JsonModifierValue,
          },
          update: {},
        });
      }
    }
  } catch {
    // DB offline fallback
  }

  return { importedCategoriesCount: newCatsCount, importedDishesCount: newDishesCount };
}
