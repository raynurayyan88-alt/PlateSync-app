import { ImageResponse } from "next/og";

export const alt = "PlateSync - Multiplayer QR Menu & Kitchen Display System for Indian Restaurants";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#1C1917",
          padding: "60px 72px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle decorative background glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "300px",
            width: "600px",
            height: "400px",
            borderRadius: "9999px",
            backgroundColor: "rgba(234, 88, 12, 0.15)",
          }}
        />

        {/* Top Header: Brand Logo & Pill Tag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                backgroundColor: "#EA580C",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                color: "#FFFFFF",
              }}
            >
              🍽️
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span
                style={{
                  fontSize: "44px",
                  fontWeight: 900,
                  color: "#FFFFFF",
                  letterSpacing: "-1px",
                }}
              >
                PlateSync
              </span>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#F59E0B",
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                }}
              >
                India
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              padding: "10px 22px",
              borderRadius: "9999px",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "9999px",
                backgroundColor: "#10B981",
              }}
            />
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#E7E5E4",
                letterSpacing: "0.5px",
              }}
            >
              Live Multiplayer Table OS
            </span>
          </div>
        </div>

        {/* Center: Main Value Proposition */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: "1040px",
          }}
        >
          <div
            style={{
              fontSize: "52px",
              fontWeight: 900,
              color: "#FFFFFF",
              lineHeight: 1.18,
              letterSpacing: "-1.5px",
              marginBottom: "20px",
            }}
          >
            Multiplayer QR Menu Software &amp; Kitchen Display System (KDS)
          </div>

          <div
            style={{
              fontSize: "24px",
              fontWeight: 500,
              color: "#A8A29E",
              lineHeight: 1.45,
              maxWidth: "880px",
            }}
          >
            Every guest at Table 5 orders together in one shared real-time cart. Round-by-round consensus voting, audible kitchen display chimes, and instant cashier counter billing.
          </div>
        </div>

        {/* Bottom Feature Badges & Domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                backgroundColor: "#292524",
                color: "#E7E5E4",
                fontSize: "17px",
                fontWeight: 700,
                padding: "8px 18px",
                borderRadius: "12px",
                border: "1px solid #44403C",
              }}
            >
              Zero App Installs
            </div>
            <div
              style={{
                backgroundColor: "#292524",
                color: "#E7E5E4",
                fontSize: "17px",
                fontWeight: 700,
                padding: "8px 18px",
                borderRadius: "12px",
                border: "1px solid #44403C",
              }}
            >
              Zero POS Changes
            </div>
            <div
              style={{
                backgroundColor: "#292524",
                color: "#E7E5E4",
                fontSize: "17px",
                fontWeight: 700,
                padding: "8px 18px",
                borderRadius: "12px",
                border: "1px solid #44403C",
              }}
            >
              Flat Monthly ₹ Pricing
            </div>
          </div>

          <div
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#EA580C",
              letterSpacing: "0.5px",
            }}
          >
            platesync.in
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
