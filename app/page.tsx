"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import PageShell from "@/components/layout/PageShell";
import LimitationBlock from "@/components/punchcard/LimitationBlock";
import CardStack from "@/components/punchcard/CardStack";
import { usePunchcard } from "@/lib/usePunchcard";
import type { ProgramData, CardData } from "@/lib/punchcard";
import { app } from "@/lib/app-config";

type FilterTab = "all" | "my-cards" | "my-shops";

export default function HomePage() {
  const {
    deployed,
    address,
    fetchLatestPrograms,
    fetchCard,
    redeemCard,
    fundProgram,
    releaseFreePool,
  } = usePunchcard();

  const [programs, setPrograms] = useState<ProgramData[]>([]);
  const [cards, setCards] = useState<Record<string, CardData>>({});
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!deployed) {
      setIsLoading(false);
      return;
    }
    try {
      const progs = await fetchLatestPrograms(0n, 50n);
      setPrograms(progs);

      if (address && progs.length > 0) {
        const cardEntries = await Promise.all(
          progs.map(async (p) => {
            const c = await fetchCard(p.id, address);
            return [p.id.toString(), c ?? { stamps: 0, lastStamp: 0n }] as const;
          })
        );
        setCards(Object.fromEntries(cardEntries));
      }
    } finally {
      setIsLoading(false);
    }
  }, [deployed, address, fetchLatestPrograms, fetchCard]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live polling every 6 seconds while window is focused
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadData();
      }
    }, 6000);
    return () => clearInterval(timer);
  }, [loadData]);

  // Filter programmes based on tab
  const filteredPrograms = useMemo(() => {
    if (activeTab === "all") return programs;
    if (activeTab === "my-shops") {
      if (!address) return [];
      return programs.filter(
        (p) => p.shop.toLowerCase() === address.toLowerCase()
      );
    }
    if (activeTab === "my-cards") {
      if (!address) return [];
      return programs.filter((p) => {
        const c = cards[p.id.toString()];
        return c && c.stamps > 0;
      });
    }
    return programs;
  }, [activeTab, programs, cards, address]);

  const handleRedeem = async (id: bigint) => {
    const ok = await redeemCard(id);
    if (ok) await loadData();
  };

  const handleFund = async (id: bigint, amount: bigint) => {
    const ok = await fundProgram(id, amount);
    if (ok) await loadData();
  };

  const handleReleaseFree = async (id: bigint, amount: bigint) => {
    const ok = await releaseFreePool(id, amount);
    if (ok) await loadData();
  };

  return (
    <PageShell title={app.name} description={app.tagline}>
      <div className="flex flex-col gap-6">
        {/* Corner-shop trust limitation banner */}
        <LimitationBlock />

        {/* Filter controls */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-md text-[13px] font-heading font-semibold transition-all ${
                activeTab === "all"
                  ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
              }`}
            >
              All Programmes ({programs.length})
            </button>

            {address && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab("my-cards")}
                  className={`px-3 py-1.5 rounded-md text-[13px] font-heading font-semibold transition-all ${
                    activeTab === "my-cards"
                      ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                  }`}
                >
                  My Cards
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("my-shops")}
                  className={`px-3 py-1.5 rounded-md text-[13px] font-heading font-semibold transition-all ${
                    activeTab === "my-shops"
                      ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                  }`}
                >
                  Programmes I Run
                </button>
              </>
            )}
          </div>
        </div>

        {/* Card stack view */}
        {isLoading ? (
          <div className="w-full max-w-xl mx-auto my-12 text-center text-[var(--text-muted)] text-[14px]">
            Checking loyalty cards in wallet...
          </div>
        ) : (
          <CardStack
            programs={filteredPrograms}
            cards={cards}
            connectedAddress={address}
            onRedeem={handleRedeem}
            onFund={handleFund}
            onReleaseFree={handleReleaseFree}
          />
        )}
      </div>
    </PageShell>
  );
}
