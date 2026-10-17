import React from "react";

export type DietaryType = "VEG" | "NON_VEG" | "EGG";

interface FoodTypeIndicatorProps {
  dietaryType?: DietaryType | string;
  isVeg?: boolean;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Standard Indian Food Type Indicator Icon (FSSAI Compliant)
 * - VEG: Green square border with solid green filled dot.
 * - NON_VEG: Crimson/Brown square border with solid crimson filled dot.
 * - EGG: Amber/Yellow square border with solid amber filled dot.
 */
export default function FoodTypeIndicator({
  dietaryType,
  isVeg,
  className = "",
  size = "md",
}: FoodTypeIndicatorProps) {
  const isSmall = size === "sm";

  // Determine effective type
  let type: DietaryType = "NON_VEG";
  if (dietaryType) {
    const upper = String(dietaryType).toUpperCase();
    if (upper === "VEG") type = "VEG";
    else if (upper === "EGG") type = "EGG";
    else type = "NON_VEG";
  } else if (isVeg !== undefined) {
    type = isVeg ? "VEG" : "NON_VEG";
  }

  if (type === "VEG") {
    return (
      <span
        title="Vegetarian (Pure Veg)"
        aria-label="Vegetarian"
        className={`inline-flex items-center justify-center ${
          isSmall ? "w-3.5 h-3.5" : "w-4 h-4"
        } rounded-[3px] border-[1.5px] border-emerald-600 bg-white shrink-0 shadow-2xs ${className}`}
      >
        <span
          className={`${
            isSmall ? "w-1.5 h-1.5" : "w-2 h-2"
          } rounded-full bg-emerald-600`}
        />
      </span>
    );
  }

  if (type === "EGG") {
    return (
      <span
        title="Eggitarian (Contains Egg)"
        aria-label="Eggitarian"
        className={`inline-flex items-center justify-center ${
          isSmall ? "w-3.5 h-3.5" : "w-4 h-4"
        } rounded-[3px] border-[1.5px] border-amber-600 bg-white shrink-0 shadow-2xs ${className}`}
      >
        <span
          className={`${
            isSmall ? "w-1.5 h-1.5" : "w-2 h-2"
          } rounded-full bg-amber-600`}
        />
      </span>
    );
  }

  return (
    <span
      title="Non-Vegetarian (Meat / Poultry / Seafood)"
      aria-label="Non-Vegetarian"
      className={`inline-flex items-center justify-center ${
        isSmall ? "w-3.5 h-3.5" : "w-4 h-4"
      } rounded-[3px] border-[1.5px] border-rose-800 bg-white shrink-0 shadow-2xs ${className}`}
    >
      <span
        className={`${
          isSmall ? "w-1.5 h-1.5" : "w-2 h-2"
        } rounded-full bg-rose-800`}
      />
    </span>
  );
}
