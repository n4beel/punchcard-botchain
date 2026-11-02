"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatEther, parseEther } from "viem";
import StampGrid from "./StampGrid";
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

interface LoyaltyCardProps {
  program: ProgramData;
  card?: CardData;
  connectedAddress?: `0x${string}`;
  isLifted?: boolean;
  onSelect?: () => void;
  onRedeem?: (id: bigint) => Promise<void>;
  onFund?: (id: bigint, amount: bigint) => Promise<void>;
  onReleaseFree?: (id: bigint, amount: bigint) => Promise<void>;
}

export default function LoyaltyCard({
  program,
  card,
  connectedAddress,
  isLifted = true,
  onSelect,
  onRedeem,
  onFund,
  onReleaseFree,
}: LoyaltyCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [redeemPending, setRedeemPending] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [fundPending, setFundPending] = useState(false);
  const [releasePending, setReleasePending] = useState(false);

  const stamps = card ? card.stamps : 0;
  const lastStamp = card ? card.lastStamp : 0n;
  const isShop = connectedAddress && connectedAddress.toLowerCase() === program.shop.toLowerCase();
  const readyToRedeem = canRedeem(card ?? { stamps: 0, lastStamp: 0n }, program);
  const poolSuffices = program.pool >= program.reward;
  const cooldownActive = isCooldownActive(lastStamp, program.cooldown);
  const nextDate = nextStampAt(lastStamp, program.cooldown);

  const unreserved = freePool(program.pool, program.ready, program.reward);
  const reserved = BigInt(program.ready) * program.reward;

  async function handleRedeem(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onRedeem || redeemPending) return;
    try {
      setRedeemPending(true);
      await onRedeem(program.id);
    } finally {
      setRedeemPending(false);
    }
  }

  async function handleFund(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!onFund || fundPending || !fundAmount) return;
    try {
      setFundPending(true);
      await onFund(program.id, parseEther(fundAmount));
      setFundAmount("");
    } finally {
      setFundPending(false);
    }
  }

  async function handleReleaseFree(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onReleaseFree || releasePending || unreserved === 0n) return;
    try {
      setReleasePending(true);
      await onReleaseFree(program.id, unreserved);
    } finally {
      setReleasePending(false);
    }
  }

  return (
    <div
      role="article"
      aria-label={`Loyalty card for ${program.name}`}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect?.();
        }
      }}
      className={`
        w-full max-w-xl mx-auto rounded-2xl perspective-1000 transition-all duration-200 cursor-pointer select-none
        ${isLifted ? "card-lift-shadow -translate-y-1 z-10" : "card-stack-shadow hover:-translate-y-0.5 opacity-95"}
      `}
    >
      <div
        className={`
          relative w-full rounded-2xl border-2 border-[var(--border-default)] bg-[var(--bg-surface)]
          transform-style-3d flip-transition overflow-hidden
          ${isFlipped ? "rotate-y-180" : ""}
        `}
        style={{
          boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.8)",
        }}
      >
        {/* FRONT SIDE (Customer Loyalty Card) */}
        <div className={`p-5 sm:p-6 flex flex-col justify-between ${isFlipped ? "invisible pointer-events-none" : ""}`}>
          {/* Card Header */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-dashed border-[var(--border-default)]">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] flex-shrink-0" aria-hidden="true" />
                <h3 className="font-heading text-lg sm:text-xl font-bold truncate text-[var(--text-primary)]">
                  {program.name}
                </h3>
              </div>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5 mono truncate">
                Shop: {program.shop.slice(0, 8)}...{program.shop.slice(-6)}
              </p>
            </div>

            <div className="flex flex-col items-end flex-shrink-0">
              <span className="px-2.5 py-1 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] font-mono text-[13px] font-bold shadow-xs">
                {formatReward(program.reward)}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] mt-1">
                {formatCooldown(program.cooldown)} cooldown
              </span>
            </div>
          </div>

          {/* Stamp Grid */}
          <div className="py-6 px-1">
            <StampGrid stamps={stamps} needed={program.needed} size={program.needed > 15 ? "sm" : "md"} />
          </div>

          {/* Card Footer / Action */}
          <div className="pt-4 border-t border-dashed border-[var(--border-default)] flex flex-wrap items-center justify-between gap-3">
            <div className="text-[13px] text-[var(--text-secondary)]">
              {readyToRedeem ? (
                poolSuffices ? (
                  <span className="text-[var(--success)] font-semibold flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-[var(--success)]" />
                    Card full! Ready to cash in.
                  </span>
                ) : (
                  <span className="text-[var(--warning)] font-semibold flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-[var(--warning)]" />
                    Waiting for the shop to top up
                  </span>
                )
              ) : cooldownActive ? (
                <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-[var(--border-strong)]" />
                  Cooldown active {nextDate ? `until ${nextDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                </span>
              ) : (
                <span className="mono">
                  {stamps} / {program.needed} stamps collected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {readyToRedeem && poolSuffices && (
                <button
                  type="button"
                  onClick={handleRedeem}
                  disabled={redeemPending}
                  className="px-4 py-2 rounded-md font-heading font-bold text-[14px] bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90 active:scale-95 transition-all shadow-sm"
                >
                  {redeemPending ? "Cashing in..." : "Cash in"}
                </button>
              )}

              {isShop && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                  className="px-3 py-1.5 rounded-md text-[12px] font-medium border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1"
                >
                  <span>Shop controls</span>
                  <span aria-hidden="true">↺</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* BACK SIDE (Shop Manager Flip) */}
        {isShop && (
          <div
            className={`
              absolute inset-0 p-5 sm:p-6 flex flex-col justify-between bg-[var(--bg-surface)] rotate-y-180 backface-hidden
              ${!isFlipped ? "invisible pointer-events-none" : ""}
            `}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-dashed border-[var(--border-default)]">
              <div>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--accent)] font-heading">
                  Shop Management Backside
                </span>
                <h4 className="font-heading text-lg font-bold text-[var(--text-primary)]">
                  {program.name}
                </h4>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
                className="px-3 py-1.5 rounded-md text-[12px] font-medium border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1"
              >
                <span>Front</span>
                <span aria-hidden="true">↺</span>
              </button>
            </div>

            {/* Back Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 text-center">
              <div className="p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                <p className="text-[11px] text-[var(--text-muted)]">Reward Pool</p>
                <p className="font-mono text-[14px] font-bold text-[var(--text-primary)] mt-0.5">
                  {formatEther(program.pool)} BOT
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                <p className="text-[11px] text-[var(--text-muted)]">Reserved Owed</p>
                <p className="font-mono text-[14px] font-bold text-[var(--warning)] mt-0.5">
                  {formatEther(reserved)} BOT
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                <p className="text-[11px] text-[var(--text-muted)]">Free to Release</p>
                <p className="font-mono text-[14px] font-bold text-[var(--success)] mt-0.5">
                  {formatEther(unreserved)} BOT
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                <p className="text-[11px] text-[var(--text-muted)]">Total Cashed In</p>
                <p className="font-mono text-[14px] font-bold text-[var(--text-primary)] mt-0.5">
                  {program.redeemedCount}
                </p>
              </div>
            </div>

            {/* Shop Actions */}
            <div className="space-y-3 pt-2 border-t border-dashed border-[var(--border-default)]">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/p/${program.id}/stamp`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-3.5 py-2 rounded-md font-heading font-semibold text-[13px] bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90 transition-all shadow-xs"
                >
                  Open Stamp Screen
                </Link>

                {unreserved > 0n && (
                  <button
                    type="button"
                    onClick={handleReleaseFree}
                    disabled={releasePending}
                    className="px-3.5 py-2 rounded-md text-[13px] font-medium border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] transition-all"
                  >
                    {releasePending ? "Releasing..." : `Release Free (${formatEther(unreserved)} BOT)`}
                  </button>
                )}
              </div>

              {/* Fund inline form */}
              <form onSubmit={handleFund} className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.5 BOT"
                  value={fundAmount}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="w-28 px-2.5 py-1.5 rounded-md font-mono text-[13px] border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)]"
                />
                <button
                  type="submit"
                  disabled={fundPending || !fundAmount}
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-1.5 rounded-md text-[12px] font-semibold border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:text-[var(--accent)] disabled:opacity-50 transition-all"
                >
                  {fundPending ? "Adding..." : "Top up pool"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
