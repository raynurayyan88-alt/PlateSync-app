import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFFFF",
          borderRadius: "112px",
          border: "8px solid #F1F5F9",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          width="440"
          height="440"
          fill="none"
          stroke="#EA580C"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Top-Right Sync Arc */}
          <path
            d="M 216 88 A 176 176 0 0 1 432 256 A 176 176 0 0 1 384 372"
            strokeWidth="28"
          />
          <polyline points="244,64 216,88 244,112" strokeWidth="28" />

          {/* Bottom-Left Sync Arc */}
          <path
            d="M 296 424 A 176 176 0 0 1 80 256 A 176 176 0 0 1 128 140"
            strokeWidth="28"
          />
          <polyline points="268,448 296,424 268,400" strokeWidth="28" />

          {/* Dining Cloche Dome */}
          <path d="M 160 312 A 96 96 0 0 1 352 312" strokeWidth="28" />

          {/* Plate Rim / Base Tray */}
          <line x1="132" y1="312" x2="380" y2="312" strokeWidth="28" />
          <path d="M 184 340 L 328 340" strokeWidth="20" />

          {/* Cloche Handle: Minimalist Geometric QR Finder Node */}
          <rect
            x="238"
            y="180"
            width="36"
            height="36"
            rx="8"
            stroke="#EA580C"
            strokeWidth="12"
          />
          <rect x="250" y="192" width="12" height="12" rx="3" fill="#EA580C" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
