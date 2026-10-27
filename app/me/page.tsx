"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import PageShell from "@/components/layout/PageShell";
import ConnectButton from "@/components/ui/ConnectButton";
import { usePunchcard } from "@/lib/usePunchcard";
import { type ProgramData, type CardData, formatReward } from "@/lib/punchcard";

export default function MeDashboardPage() {
  const {
    address,
    fetchPending,
    fetchLatestPrograms,
    fetchCard,
    withdrawPending,
    isTransacting,
  } = usePunchcard();

  const [pendingBalance, setPendingBalance] = useState<bigint | null>(null);
  const [myPrograms, setMyPrograms] = useState<ProgramData[]>([]);
  const [myCards, setMyCards] = useState<{ program: ProgramData; card: CardData }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }
    try {
      const bal = await fetchPending(address);
      setPendingBalance(bal);

      const allProgs = await fetchLatestPrograms(0n, 50n);
      // Filter programmes user owns
      const owned = allProgs.filter(
        (p) => p.shop.toLowerCase() === address.toLowerCase()
      );
      setMyPrograms(owned);

      // Check cards user holds stamps in
      const cardResults = await Promise.all(
        allProgs.map(async (p) => {
          const c = await fetchCard(p.id, address);
          if (c && c.stamps > 0) {
            return { program: p, card: c };
          }
          return null;
        })
      );
      setMyCards(cardResults.filter((x): x is { program: ProgramData; card: CardData } => x !== null));
    } finally {
      setIsLoading(false);
    }
  }, [address, fetchPending, fetchLatestPrograms, fetchCard]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadData();
      }
    }, 6000);
    return () => clearInterval(timer);
  }, [loadData]);

  const handleWithdraw = async () => {
    const ok = await withdrawPending();
    if (ok) {
      await loadData();
    }
  };

  return (
    <PageShell
      title="Earnings & Balance"
      description="Withdraw earned loyalty payouts and unreserved shop funds."
    >
      <div className="w-full max-w-xl mx-auto space-y-6">
        {!address ? (
          <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] text-center space-y-4">
            <h3 className="font-heading text-lg font-bold text-[var(--text-primary)]">
              Connect Your Wallet
            </h3>
            <p className="text-[13px] text-[var(--text-muted)] max-w-md mx-auto">
              Connect your Web3 wallet to check your earned loyalty rewards and withdraw pending BOT.
            </p>
            <div className="inline-block">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <>
            {/* Pending Withdrawal Hero Card */}
            <div className="p-6 sm:p-7 rounded-2xl border-2 border-[var(--border-default)] bg-[var(--bg-surface)] card-lift-shadow space-y-5">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-dashed border-[var(--border-default)]">
                <div>
                  <span className="text-[11px] font-heading font-semibold uppercase tracking-wider text-[var(--accent)]">
                    Pending Pull-Payment
                  </span>
                  <h3 className="font-heading text-2xl font-bold text-[var(--text-primary)] mt-0.5">
                    {pendingBalance === null ? (
                      <span className="text-[var(--text-muted)]">Loading...</span>
                    ) : (
                      `${formatEther(pendingBalance)} BOT`
                    )}
                  </h3>
                  <p className="text-[12px] mono text-[var(--text-muted)] mt-1">
                    Wallet: {address.slice(0, 8)}...{address.slice(-6)}
                  </p>
                </div>

                {pendingBalance !== null && pendingBalance > 0n && (
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={isTransacting}
                    className="px-5 py-2.5 rounded-xl font-heading font-bold text-[14px] bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90 active:scale-95 transition-all shadow-md"
                  >
                    {isTransacting ? "Withdrawing..." : "Withdraw to Wallet"}
                  </button>
                )}
              </div>

              {/* Security info note */}
              <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                <p>
                  <strong>Why pull payment?</strong> BOT Chain loyalty payouts use the standard pull-payment design pattern. When you cash in a full card or release shop funds, your BOT is credited to your pending balance and safely held on-chain until you withdraw it.
                </p>
              </div>
            </div>

            {/* My Active Loyalty Cards */}
            <div className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
              <h4 className="font-heading font-bold text-[15px] text-[var(--text-primary)] mb-3">
                Your Active Cards ({myCards.length})
              </h4>
              {myCards.length === 0 ? (
                <p className="text-[13px] text-[var(--text-muted)]">
                  No active cards found with stamps yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {myCards.map(({ program, card }) => (
                    <div
                      key={program.id.toString()}
                      className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] flex items-center justify-between gap-3"
                    >
                      <div>
                        <Link
                          href={`/p/${program.id}`}
                          className="font-heading font-bold text-[14px] text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
                        >
                          {program.name}
                        </Link>
                        <p className="text-[11px] mono text-[var(--text-muted)] mt-0.5">
                          {card.stamps} / {program.needed} stamps collected · {formatReward(program.reward)}
                        </p>
                      </div>

                      <Link
                        href={`/p/${program.id}`}
                        className="px-3 py-1 rounded-md text-[12px] font-heading font-semibold border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:text-[var(--accent)] transition-colors"
                      >
                        View Card →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Programmes I Run */}
            {myPrograms.length > 0 && (
              <div className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
                <h4 className="font-heading font-bold text-[15px] text-[var(--text-primary)] mb-3">
                  Programmes You Manage ({myPrograms.length})
                </h4>
                <div className="space-y-2.5">
                  {myPrograms.map((p) => (
                    <div
                      key={p.id.toString()}
                      className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] flex items-center justify-between gap-3"
                    >
                      <div>
                        <Link
                          href={`/p/${p.id}`}
                          className="font-heading font-bold text-[14px] text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
                        >
                          {p.name}
                        </Link>
                        <p className="text-[11px] mono text-[var(--text-muted)] mt-0.5">
                          Pool: {formatEther(p.pool)} BOT · Cashed In: {p.redeemedCount}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/p/${p.id}/stamp`}
                          className="px-3 py-1 rounded-md text-[12px] font-heading font-semibold bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90 transition-all shadow-xs"
                        >
                          Stamp Screen
                        </Link>
                        <Link
                          href={`/p/${p.id}`}
                          className="px-3 py-1 rounded-md text-[12px] font-heading font-semibold border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:text-[var(--accent)] transition-colors"
                        >
                          Manage
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
