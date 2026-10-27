"use client";

import React from "react";
import { stampGrid } from "@/lib/punchcard";

interface StampGridProps {
  stamps: number;
  needed: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * StampGrid: Renders a tactile row/grid of N stamps (2..30).
 *
 * Each stamp circle is fully accessible with screen-reader aria-labels.
 * - Stamped: tomato filled (#E4572E) with white mark
 * - Next: tomato outlined with pulse-once animation
 * - Remaining: subtle beige/brown outline with stamp index
 */
export default function StampGrid({
  stamps,
  needed,
  className = "",
  size = "md",
}: StampGridProps) {
  const slots = stampGrid(stamps, needed);

  const sizeClasses = {
    sm: "w-8 h-8 text-[11px]",
    md: "w-11 h-11 text-[13px]",
    lg: "w-14 h-14 text-[16px]",
  }[size];

  return (
    <div
      role="region"
      aria-label={`Loyalty card stamp progress: ${stamps} of ${needed} stamps collected`}
      className={`grid gap-2.5 sm:gap-3 justify-center items-center ${className}`}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${size === "sm" ? "32px" : size === "lg" ? "56px" : "44px"}, 1fr))`,
        maxWidth: "100%",
      }}
    >
      {slots.map((slot) => {
        const isStamped = slot.status === "stamped";
        const isNext = slot.status === "next";

        let ariaLabel = `Stamp ${slot.index} of ${needed}: `;
        if (isStamped) {
          ariaLabel += "collected";
        } else if (isNext) {
          ariaLabel += "next stamp to collect";
        } else {
          ariaLabel += "not yet collected";
        }

        return (
          <div
            key={slot.index}
            aria-label={ariaLabel}
            tabIndex={0}
            className={`
              relative flex items-center justify-center rounded-full font-mono font-bold transition-all
              ${sizeClasses}
              ${
                isStamped
                  ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm border-2 border-[var(--accent)]"
                  : isNext
                  ? "bg-[var(--bg-surface)] text-[var(--accent)] border-2 border-dashed border-[var(--accent)] pulse-once"
                  : "bg-[var(--bg-base)] text-[var(--text-muted)] border-2 border-[var(--border-default)]"
              }
            `}
          >
            {isStamped ? (
              // Stamped symbol: tactile checkmark / stamp icon
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <span className="mono">{slot.index}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
