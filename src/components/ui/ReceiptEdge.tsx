"use client";

import React from "react";

interface ReceiptEdgeProps {
  className?: string;
  fillColor?: string;
  edgeHeight?: number;
  position?: "top" | "bottom";
}

/**
 * Tactile Paper & Live Presence — Perforated Serrated Paper Receipt Edge
 * Renders an authentic zig-zag saw-tooth perforated receipt edge.
 */
export default function ReceiptEdge({
  className = "",
  fillColor = "#FFFFFF",
  edgeHeight = 8,
  position = "top",
}: ReceiptEdgeProps) {
  // 50 teeth across 1200 units width for fine, authentic paper receipt teeth
  const teethCount = 50;
  const toothWidth = 1200 / teethCount; // 24
  const halfTooth = toothWidth / 2; // 12

  let pathData = "";

  if (position === "top") {
    // Teeth point upwards, solid paper is below connecting seamlessly to card
    let segments = "M0,24 L0,0 ";
    for (let i = 0; i < teethCount; i++) {
      const midX = i * toothWidth + halfTooth;
      const endX = (i + 1) * toothWidth;
      segments += `L${midX},14 L${endX},0 `;
    }
    segments += "L1200,24 Z";
    pathData = segments;
  } else {
    // Teeth point downwards at bottom of paper ticket
    let segments = "M0,0 L0,24 ";
    for (let i = 0; i < teethCount; i++) {
      const midX = i * toothWidth + halfTooth;
      const endX = (i + 1) * toothWidth;
      segments += `L${midX},10 L${endX},24 `;
    }
    segments += "L1200,0 Z";
    pathData = segments;
  }

  return (
    <div
      className={`w-full overflow-hidden leading-none select-none pointer-events-none ${className}`}
      style={{ height: `${edgeHeight}px` }}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full block"
        preserveAspectRatio="none"
        viewBox="0 0 1200 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d={pathData} fill={fillColor} />
      </svg>
    </div>
  );
}
