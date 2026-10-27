"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatEther, parseEther } from "viem";
import PageShell from "@/components/layout/PageShell";
import StampGrid from "@/components/punchcard/StampGrid";
import ConnectButton from "@/components/ui/ConnectButton";
import { usePunchcard } from "@/lib/usePunchcard";
import {
  type ProgramData,
  type CardData,
  freePool,
  formatCooldown,
  formatReward,
  canRedeem,
  isCooldownActive,
  nextStampAt,
} from "@/lib/punchcard";

export default function ProgramDetailPage() {
  const params = useParams();
  const rawId = params?.id as string;
  const programId = rawId ? BigInt(rawId) : 0n;

  const {
    address,
    fetchProgram,
    fetchCard,
    redeemCard,
    fundProgram,
    releaseFreePool,
  } = usePunchcard();

  const [program, setProgram] = useState<ProgramData | null>(null);
  const [card, setCard] = useState<CardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isActionPending, setIsActionPending] = useState(false);

  const loadData = useCallback(async () => {
    if (programId <= 0n) return;
    try {
      const p = await fetchProgram(programId);
      setProgram(p);

      if (address) {
        const c = await fetchCard(programId, address);
        setCard(c ?? { stamps: 0, lastStamp: 0n });
      }
    } finally {
      setIsLoading(false);
    }
  }, [programId, address, fetchProgram, fetchCard]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll state every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadData();
      }
    }, 6000);
    return () => clearInterval(timer);
  }, [loadData]);

  if (isLoading) {
    return (
      <PageShell title="Loyalty Programme" description="Loading programme details...">
        <div className="w-full max-w-xl mx-auto my-12 text-center text-[var(--text-muted)] text-[14px]">
          Reading programme #{rawId}...
        </div>
      </PageShell>
    );
  }

  if (!program) {
    return (
      <PageShell title="Programme Not Found" description="This loyalty card does not exist.">
        <div className="w-full max-w-xl mx-auto my-12 text-center p-8 rounded-2xl border-2 border-dashed border-[var(--border-default)] bg-[var(--bg-surface)]">
          <h3 className="font-heading text-lg font-bold text-[var(--text-primary)]">
            Programme #{rawId} Not Found
          </h3>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">
            The programme may have been entered incorrectly or has not been deployed.
          </p>
          <div className="mt-4">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg font-heading font-semibold text-[13px] bg-[var(--accent)] text-[var(--accent-ink)]"
            >
              Back to Wallet
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const isShop = address && address.toLowerCase() === program.shop.toLowerCase();
  const stamps = card ? card.stamps : 0;
  const lastStamp = card ? card.lastStamp : 0n;
  const readyToRedeem = canRedeem(card ?? { stamps: 0, lastStamp: 0n }, program);
  const poolSuffices = program.pool >= program.reward;
  const cooldownActive = isCooldownActive(lastStamp, program.cooldown);
  const nextDate = nextStampAt(lastStamp, program.cooldown);

  const unreserved = freePool(program.pool, program.ready, program.reward);
  const reserved = BigInt(program.ready) * program.reward;

  const handleRedeem = async () => {
    try {
      setIsActionPending(true);
      const ok = await redeemCard(program.id);
      if (ok) await loadData();
    } finally {
      setIsActionPending(false);
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpAmount) return;
    try {
      setIsActionPending(true);
      const ok = await fundProgram(program.id, parseEther(topUpAmount));
      if (ok) {
        setTopUpAmount("");
        await loadData();
      }
    } finally {
      setIsActionPending(false);
    }
  };

  const handleReleaseFree = async () => {
    if (unreserved === 0n) return;
    try {
      setIsActionPending(true);
      const ok = await releaseFreePool(program.id, unreserved);
      if (ok) await loadData();
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <PageShell
      title={program.name}
      description={`Collect ${program.needed} stamps to earn ${formatReward(program.reward)}`}
    >
      <div className="w-full max-w-xl mx-auto space-y-6">
        {/* Main Public Loyalty Card */}
        <div className="p-6 rounded-2xl border-2 border-[var(--border-default)] bg-[var(--bg-surface)] card-lift-shadow">
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-dashed border-[var(--border-default)]">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent)] font-bold">
                Programme #{program.id.toString()}
              </span>
              <h2 className="font-heading text-xl font-bold text-[var(--text-primary)] mt-0.5">
                {program.name}
              </h2>
              <p className="text-[12px] text-[var(--text-muted)] mt-1 mono">
                Shop: {program.shop}
              </p>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] font-mono text-[14px] font-bold shadow-xs">
                {formatReward(program.reward)}
              </span>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {formatCooldown(program.cooldown)} cooldown
              </p>
            </div>
          </div>

          {/* Connected User Stamp Grid */}
          <div className="py-6">
            {address ? (
              <div>
                <p className="text-[12px] font-heading font-semibold text-[var(--text-secondary)] mb-3 text-center">
                  Your Card: {stamps} of {program.needed} stamps collected
                </p>
                <StampGrid stamps={stamps} needed={program.needed} size={program.needed > 15 ? "sm" : "lg"} />
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-[13px] text-[var(--text-secondary)] mb-3">
                  Connect your wallet to view your stamps and redeem rewards.
                </p>
                <div className="inline-block">
                  <ConnectButton />
                </div>
              </div>
            )}
          </div>

          {/* User Status / Action Bar */}
          {address && (
            <div className="pt-4 border-t border-dashed border-[var(--border-default)] flex flex-wrap items-center justify-between gap-3">
              <div className="text-[13px]">
                {readyToRedeem ? (
                  poolSuffices ? (
                    <span className="text-[var(--success)] font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                      Card complete! Ready to cash in.
                    </span>
                  ) : (
                    <span className="text-[var(--warning)] font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                      Waiting for the shop to top up
                    </span>
                  )
                ) : cooldownActive ? (
                  <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--border-strong)]" />
                    Cooldown active {nextDate ? `until ${nextDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)]">
                    Visit the shop to receive your next stamp.
                  </span>
                )}
              </div>

              {readyToRedeem && poolSuffices && (
                <button
                  type="button"
                  onClick={handleRedeem}
                  disabled={isActionPending}
                  className="px-5 py-2.5 rounded-lg font-heading font-bold text-[14px] bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90 active:scale-95 transition-all shadow-md"
                >
                  {isActionPending ? "Cashing in..." : `Cash in ${formatReward(program.reward)}`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Public Programme Stats */}
        <div className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
          <h3 className="text-[13px] font-heading font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
            Programme Pool & Solvency Stats
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
              <p className="text-[11px] text-[var(--text-muted)]">Total Pool</p>
              <p className="font-mono text-[14px] font-bold text-[var(--text-primary)] mt-0.5">
                {formatEther(program.pool)} BOT
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
              <p className="text-[11px] text-[var(--text-muted)]">Reserved Owed</p>
              <p className="font-mono text-[14px] font-bold text-[var(--warning)] mt-0.5">
                {formatEther(reserved)} BOT
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {program.ready} full cards
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
              <p className="text-[11px] text-[var(--text-muted)]">Free Pool</p>
              <p className="font-mono text-[14px] font-bold text-[var(--success)] mt-0.5">
                {formatEther(unreserved)} BOT
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
              <p className="text-[11px] text-[var(--text-muted)]">Cashed In</p>
              <p className="font-mono text-[14px] font-bold text-[var(--text-primary)] mt-0.5">
                {program.redeemedCount}
              </p>
            </div>
          </div>
        </div>

        {/* Shop Owner Tools */}
        {isShop && (
          <div className="p-5 rounded-xl border-2 border-[var(--accent)] bg-[var(--bg-surface)] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-heading font-bold text-[var(--text-primary)]">
                Shop Manager Controls
              </h3>
              <Link
                href={`/p/${program.id}/stamp`}
                className="px-3.5 py-1.5 rounded-md font-heading font-bold text-[12px] bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90 shadow-xs"
              >
                Open Stamp Counter →
              </Link>
            </div>

            <div className="space-y-4 pt-2">
              <form onSubmit={handleTopUp} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="0.5"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-32 px-3 py-1.5 rounded-md font-mono text-[13px] border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)]"
                />
                <span className="text-[12px] font-mono text-[var(--text-muted)]">BOT</span>
                <button
                  type="submit"
                  disabled={isActionPending || !topUpAmount}
                  className="px-3 py-1.5 rounded-md text-[13px] font-semibold border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:text-[var(--accent)] transition-all"
                >
                  Top Up Pool
                </button>
              </form>

              {unreserved > 0n && (
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-[12px] text-[var(--text-muted)]">
                    Free pool available to withdraw: {formatEther(unreserved)} BOT
                  </span>
                  <button
                    type="button"
                    onClick={handleReleaseFree}
                    disabled={isActionPending}
                    className="px-3 py-1.5 rounded-md text-[12px] font-medium border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] transition-all"
                  >
                    Release {formatEther(unreserved)} BOT to Earnings
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
