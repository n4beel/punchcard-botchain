"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { isAddress, type Address } from "viem";
import PageShell from "@/components/layout/PageShell";
import StampGrid from "@/components/punchcard/StampGrid";
import { usePunchcard } from "@/lib/usePunchcard";
import {
  type ProgramData,
  type CardData,
  formatCooldown,
  formatReward,
  isCooldownActive,
  nextStampAt,
} from "@/lib/punchcard";

// Preset customer test accounts from local stack seeder
const QUICK_ACCOUNTS: { label: string; address: Address }[] = [
  { label: "Customer A (Bob)", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
  { label: "Customer B (Charlie)", address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" },
  { label: "Customer C (Dave)", address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" },
  { label: "Customer D (Eve)", address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" },
  { label: "Outsider (Frank)", address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc" },
];

export default function StampScreenPage() {
  const params = useParams();
  const rawId = params?.id as string;
  const programId = rawId ? BigInt(rawId) : 0n;

  const { address, fetchProgram, fetchCard, stampCustomer, isTransacting } = usePunchcard();

  const [program, setProgram] = useState<ProgramData | null>(null);
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCard, setCustomerCard] = useState<CardData | null>(null);
  const [isLoadingProg, setIsLoadingProg] = useState(true);
  const [isLoadingCard, setIsLoadingCard] = useState(false);

  const loadProgram = useCallback(async () => {
    if (programId <= 0n) return;
    try {
      const p = await fetchProgram(programId);
      setProgram(p);
    } finally {
      setIsLoadingProg(false);
    }
  }, [programId, fetchProgram]);

  useEffect(() => {
    loadProgram();
  }, [loadProgram]);

  const loadCustomerCard = useCallback(async (custAddr: string) => {
    if (!custAddr || !isAddress(custAddr) || programId <= 0n) {
      setCustomerCard(null);
      return;
    }
    try {
      setIsLoadingCard(true);
      const c = await fetchCard(programId, custAddr as Address);
      setCustomerCard(c ?? { stamps: 0, lastStamp: 0n });
    } finally {
      setIsLoadingCard(false);
    }
  }, [programId, fetchCard]);

  useEffect(() => {
    if (isAddress(customerAddress)) {
      loadCustomerCard(customerAddress);
    } else {
      setCustomerCard(null);
    }
  }, [customerAddress, loadCustomerCard]);

  if (isLoadingProg) {
    return (
      <PageShell title="Shop Stamp Counter" description="Loading programme...">
        <div className="w-full max-w-xl mx-auto my-12 text-center text-[var(--text-muted)] text-[14px]">
          Opening stamp counter for programme #{rawId}...
        </div>
      </PageShell>
    );
  }

  if (!program) {
    return (
      <PageShell title="Programme Not Found" description="Could not find this programme.">
        <div className="w-full max-w-xl mx-auto my-12 text-center p-8 rounded-2xl border-2 border-dashed border-[var(--border-default)] bg-[var(--bg-surface)]">
          <p className="text-[14px] text-[var(--text-muted)]">Programme #{rawId} does not exist.</p>
          <div className="mt-4">
            <Link href="/" className="px-4 py-2 rounded-lg font-heading font-semibold text-[13px] bg-[var(--accent)] text-[var(--accent-ink)]">
              Back to Wallet
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const isShopOwner = address && address.toLowerCase() === program.shop.toLowerCase();
  const validAddress = isAddress(customerAddress);
  const isSelf = validAddress && address && customerAddress.toLowerCase() === address.toLowerCase();

  const stamps = customerCard ? customerCard.stamps : 0;
  const lastStamp = customerCard ? customerCard.lastStamp : 0n;
  const isFull = customerCard ? customerCard.stamps >= program.needed : false;
  const cooldownActive = customerCard ? isCooldownActive(lastStamp, program.cooldown) : false;
  const nextDate = customerCard ? nextStampAt(lastStamp, program.cooldown) : null;

  const canStamp =
    isShopOwner &&
    validAddress &&
    !isSelf &&
    !isFull &&
    !cooldownActive &&
    !isTransacting;

  const handleStamp = async () => {
    if (!canStamp) return;
    const ok = await stampCustomer(program.id, customerAddress as Address);
    if (ok) {
      await loadCustomerCard(customerAddress);
      await loadProgram();
    }
  };

  return (
    <PageShell
      title={`Stamp Counter · ${program.name}`}
      description="Shop stamping station: paste a customer's address to apply a physical stamp."
    >
      <div className="w-full max-w-xl mx-auto space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between text-[13px]">
          <Link
            href={`/p/${program.id}`}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 font-heading font-semibold"
          >
            ← Back to Programme Card
          </Link>
          <span className="mono text-[12px] text-[var(--text-muted)]">
            Reward: {formatReward(program.reward)} · Cooldown: {formatCooldown(program.cooldown)}
          </span>
        </div>

        {/* Shop validation check */}
        {!isShopOwner && (
          <div className="p-4 rounded-xl bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] border border-[var(--warning)] text-[var(--text-primary)] text-[13px] leading-relaxed">
            <strong className="block font-heading font-bold text-[var(--warning)] mb-1">
              Shop Owner Restriction
            </strong>
            Only the shop ({program.shop.slice(0, 8)}...{program.shop.slice(-6)}) can stamp loyalty cards for this programme. Switch to the shop account in your wallet to stamp customers.
          </div>
        )}

        {/* Customer Address Input & Quick Select */}
        <div className="p-5 sm:p-6 rounded-2xl border-2 border-[var(--border-default)] bg-[var(--bg-surface)] card-lift-shadow space-y-4">
          <div>
            <label
              htmlFor="cust-addr"
              className="block text-[13px] font-heading font-bold text-[var(--text-primary)] mb-1"
            >
              Customer Wallet Address
            </label>
            <input
              id="cust-addr"
              type="text"
              placeholder="0x..."
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value.trim())}
              disabled={!isShopOwner}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] font-mono text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          {/* Quick select presets */}
          <div>
            <p className="text-[11px] font-heading font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Quick Select Test Customers:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ACCOUNTS.map((acc) => (
                <button
                  key={acc.address}
                  type="button"
                  onClick={() => setCustomerAddress(acc.address)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all ${
                    customerAddress.toLowerCase() === acc.address.toLowerCase()
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] font-bold shadow-xs"
                      : "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Customer Card Preview */}
          {validAddress && (
            <div className="pt-4 border-t border-dashed border-[var(--border-default)] space-y-4">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-heading font-bold text-[var(--text-primary)]">
                  Customer Card Status:
                </span>
                <span className="font-mono text-[var(--text-secondary)]">
                  {stamps} / {program.needed} stamps
                </span>
              </div>

              {isLoadingCard ? (
                <div className="py-6 text-center text-[var(--text-muted)] text-[12px]">
                  Reading customer card...
                </div>
              ) : (
                <div className="py-2">
                  <StampGrid stamps={stamps} needed={program.needed} size="md" />
                </div>
              )}

              {/* Status Feedback Warnings */}
              {isSelf && (
                <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] border border-[var(--danger)] text-[var(--danger)] text-[12px] font-medium">
                  Shop cannot stamp self. Stamping requires a distinct customer address.
                </div>
              )}

              {isFull && (
                <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--success)_15%,transparent)] border border-[var(--success)] text-[var(--text-primary)] text-[12px] font-medium">
                  Customer card is already full ({stamps}/{program.needed})! They can cash in {formatReward(program.reward)} on their card.
                </div>
              )}

              {cooldownActive && (
                <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] border border-[var(--warning)] text-[var(--text-primary)] text-[12px] font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--warning)] flex-shrink-0" />
                  <span>
                    Cooldown active. Next stamp for this customer opens at{" "}
                    <strong>
                      {nextDate
                        ? nextDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "soon"}
                    </strong>
                    .
                  </span>
                </div>
              )}

              {/* Big Stamp Action Button */}
              <button
                type="button"
                onClick={handleStamp}
                disabled={!canStamp}
                className={`
                  w-full py-3.5 rounded-xl font-heading font-bold text-[16px] transition-all shadow-md flex items-center justify-center gap-2
                  ${
                    canStamp
                      ? "bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90 active:scale-98 cursor-pointer"
                      : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-default)] cursor-not-allowed opacity-60"
                  }
                `}
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M12 2v20M2 12h20" />
                </svg>
                <span>
                  {isTransacting
                    ? "Applying Stamp..."
                    : isFull
                    ? "Card Full"
                    : cooldownActive
                    ? "Cooldown Active"
                    : !isShopOwner
                    ? "Shop Only"
                    : `Stamp Customer (Stamp #${stamps + 1})`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
