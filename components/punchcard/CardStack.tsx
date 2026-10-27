"use client";

import React, { useState } from "react";
import LoyaltyCard from "./LoyaltyCard";
import type { ProgramData, CardData } from "@/lib/punchcard";

interface CardStackProps {
  programs: ProgramData[];
  cards: Record<string, CardData>;
  connectedAddress?: `0x${string}`;
  onRedeem?: (id: bigint) => Promise<void>;
  onFund?: (id: bigint, amount: bigint) => Promise<void>;
  onReleaseFree?: (id: bigint, amount: bigint) => Promise<void>;
}

export default function CardStack({
  programs,
  cards,
  connectedAddress,
  onRedeem,
  onFund,
  onReleaseFree,
}: CardStackProps) {
  const [activeId, setActiveId] = useState<bigint | null>(
    programs.length > 0 ? programs[0].id : null
  );

  if (programs.length === 0) {
    return (
      <div className="w-full max-w-xl mx-auto my-12 text-center p-8 rounded-2xl border-2 border-dashed border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="w-12 h-12 mx-auto rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--accent)] mb-3">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>
        <h3 className="font-heading text-lg font-bold text-[var(--text-primary)]">
          Nothing in your wallet yet.
        </h3>
        <p className="text-[13px] text-[var(--text-muted)] mt-1 max-w-md mx-auto">
          Start collecting stamps from participating corner shops or create your own loyalty programme.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto my-6">
      {/* Wallet Stack Instructions */}
      <div className="flex items-center justify-between text-[12px] text-[var(--text-muted)] mb-3 px-1">
        <span>{programs.length} {programs.length === 1 ? "card" : "cards"} in wallet</span>
        <span>Tap a card to bring it forward</span>
      </div>

      <div className="flex flex-col space-y-4">
        {programs.map((program) => {
          const isLifted = activeId === program.id;
          const card = cards[program.id.toString()];

          return (
            <div key={program.id.toString()} className="transition-all duration-200">
              <LoyaltyCard
                program={program}
                card={card}
                connectedAddress={connectedAddress}
                isLifted={isLifted}
                onSelect={() => setActiveId(program.id)}
                onRedeem={onRedeem}
                onFund={onFund}
                onReleaseFree={onReleaseFree}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
