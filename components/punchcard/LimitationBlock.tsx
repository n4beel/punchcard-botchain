"use client";

import React from "react";

export default function LimitationBlock() {
  return (
    <section
      aria-labelledby="limits-heading"
      className="w-full max-w-xl mx-auto my-6 p-4 sm:p-5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] flex-shrink-0"
          aria-hidden="true"
        />
        <h2
          id="limits-heading"
          className="text-[14px] sm:text-[15px] font-bold font-heading uppercase tracking-wide text-[var(--text-primary)]"
        >
          Trust this shop, not the chain
        </h2>
      </div>

      <ul className="space-y-2 text-[13px] leading-relaxed text-[var(--text-secondary)] list-none pl-0">
        <li className="flex items-start gap-2">
          <span className="text-[var(--accent)] font-bold select-none">•</span>
          <span>
            <strong className="text-[var(--text-primary)] font-medium">Only the shop can stamp.</strong> We can&apos;t see what you bought.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[var(--accent)] font-bold select-none">•</span>
          <span>
            <strong className="text-[var(--text-primary)] font-medium">Shop withdrawals:</strong> The shop can take back the part of the pool that isn&apos;t owed to full cards.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[var(--accent)] font-bold select-none">•</span>
          <span>
            <strong className="text-[var(--text-primary)] font-medium">Bound to address:</strong> A card belongs to your address and can&apos;t be moved.
          </span>
        </li>
      </ul>
    </section>
  );
}
