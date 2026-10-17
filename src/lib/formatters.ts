/**
 * PlateSync Currency & Item Formatters
 */

/**
 * Format price in Indian Rupees (₹) with 'en-IN' locale
 * e.g., ₹240, ₹1,450 with no unnecessary '.00' decimals.
 */
export function formatRupees(amountInRupees: number): string {
  if (typeof amountInRupees !== "number" || isNaN(amountInRupees)) {
    return "₹0";
  }
  const isWhole = Number.isInteger(amountInRupees);
  if (isWhole) {
    return `₹${amountInRupees.toLocaleString("en-IN")}`;
  }
  return `₹${amountInRupees.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Checks if a menu item is vegetarian based on dietaryType or standard keywords
 */
export function isVegetarianItem(item: {
  name: string;
  category?: string;
  description?: string | null;
  dietaryType?: string | null;
}): boolean {
  if (item.dietaryType) {
    return item.dietaryType.toUpperCase() === "VEG";
  }

  const nonVegKeywords = [
    "beef",
    "bacon",
    "angus",
    "chicken",
    "meat",
    "pork",
    "patty",
    "smash",
    "pepperoni",
    "ham",
    "turkey",
    "fish",
    "prawn",
    "shrimp",
    "mutton",
    "lamb",
    "alfaham",
    "shawarma",
    "mandi",
  ];

  const lowerName = item.name.toLowerCase();
  const lowerCategory = (item.category || "").toLowerCase();
  const lowerDesc = (item.description || "").toLowerCase();

  // Explicit vegetarian markers
  if (
    lowerName.includes("veg") ||
    lowerName.includes("beyond") ||
    lowerName.includes("paneer") ||
    lowerName.includes("mushroom") ||
    lowerName.includes("truffle fries") ||
    lowerCategory.includes("drinks") ||
    lowerCategory.includes("dessert") ||
    lowerCategory.includes("shakes") ||
    lowerCategory.includes("mojitos") ||
    lowerCategory.includes("sides") ||
    lowerName.includes("fries") ||
    lowerName.includes("onion rings") ||
    lowerName.includes("lemonade") ||
    lowerName.includes("shake") ||
    lowerName.includes("mojito") ||
    lowerName.includes("soda") ||
    lowerName.includes("naan") ||
    lowerName.includes("roti") ||
    lowerName.includes("brownie") ||
    lowerName.includes("cheesecake")
  ) {
    return true;
  }

  // Check for non-veg keywords
  if (nonVegKeywords.some((kw) => lowerName.includes(kw) || lowerDesc.includes(kw))) {
    return false;
  }

  return true;
}
