/**
 * Tactile Paper & Live Presence — Signature Guest Palette
 * Distinct, tasteful pastel signature colors for table diners.
 */

export interface PaletteColor {
  name: string;
  hex: string;
  textHex: string;
  borderHex: string;
  bgLightHex: string;
}

export const PASTEL_GUEST_PALETTE: PaletteColor[] = [
  {
    name: "Terracotta",
    hex: "#E07A5F",
    textHex: "#FFFFFF",
    borderHex: "#D0694E",
    bgLightHex: "rgba(224, 122, 95, 0.12)",
  },
  {
    name: "Sage",
    hex: "#81B29A",
    textHex: "#FFFFFF",
    borderHex: "#6FA088",
    bgLightHex: "rgba(129, 178, 154, 0.14)",
  },
  {
    name: "Indigo",
    hex: "#6D597A",
    textHex: "#FFFFFF",
    borderHex: "#5B4768",
    bgLightHex: "rgba(109, 89, 122, 0.14)",
  },
  {
    name: "Amber",
    hex: "#F2CC8F",
    textHex: "#5C3A00",
    borderHex: "#E0BA7D",
    bgLightHex: "rgba(242, 204, 143, 0.22)",
  },
  {
    name: "Ocean",
    hex: "#3D5A80",
    textHex: "#FFFFFF",
    borderHex: "#2C496F",
    bgLightHex: "rgba(61, 90, 128, 0.14)",
  },
  {
    name: "Rose",
    hex: "#E29578",
    textHex: "#FFFFFF",
    borderHex: "#D18467",
    bgLightHex: "rgba(226, 149, 120, 0.14)",
  },
  {
    name: "Moss",
    hex: "#606C38",
    textHex: "#FFFFFF",
    borderHex: "#4F5B27",
    bgLightHex: "rgba(96, 108, 56, 0.14)",
  },
  {
    name: "Clay",
    hex: "#B5838D",
    textHex: "#FFFFFF",
    borderHex: "#A4727C",
    bgLightHex: "rgba(181, 131, 141, 0.14)",
  },
];

/**
 * Deterministically get a signature color for a user ID or index.
 */
export function getGuestSignatureColor(userIdOrName: string, index?: number): PaletteColor {
  if (typeof index === "number" && index >= 0) {
    return PASTEL_GUEST_PALETTE[index % PASTEL_GUEST_PALETTE.length];
  }
  let hash = 0;
  for (let i = 0; i < userIdOrName.length; i++) {
    hash = (hash << 5) - hash + userIdOrName.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % PASTEL_GUEST_PALETTE.length;
  return PASTEL_GUEST_PALETTE[idx];
}

/**
 * Builds a Map of userId -> PaletteColor ensuring every active table diner
 * gets a distinct, non-colliding signature pastel color.
 */
export function buildTableColorMap(
  users: Array<{ id: string; name?: string; color?: string }>
): Map<string, PaletteColor> {
  const map = new Map<string, PaletteColor>();
  users.forEach((user, idx) => {
    map.set(user.id, PASTEL_GUEST_PALETTE[idx % PASTEL_GUEST_PALETTE.length]);
  });
  return map;
}
