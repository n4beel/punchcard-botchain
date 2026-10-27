"use client";

import React from "react";
import Link from "next/link";

export default function FloatingAction() {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Link
        href="/new"
        aria-label="Create a new loyalty programme"
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] font-heading font-bold text-[14px] shadow-lg hover:opacity-90 active:scale-95 transition-all no-underline"
      >
        <span className="text-lg leading-none" aria-hidden="true">+</span>
        <span>New programme</span>
      </Link>
    </div>
  );
}
