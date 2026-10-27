"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { parseEther, formatEther } from "viem";
import PageShell from "@/components/layout/PageShell";
import { usePunchcard } from "@/lib/usePunchcard";
import {
  MIN_NEEDED,
  MAX_NEEDED,
  MIN_COOLDOWN,
  MAX_COOLDOWN,
  MAX_NAME_BYTES,
} from "@/lib/limits";

const COOLDOWN_PRESETS = [
  { label: "1 hour", seconds: 3600 },
  { label: "6 hours", seconds: 21600 },
  { label: "12 hours", seconds: 43200 },
  { label: "24 hours (1 day)", seconds: 86400 },
  { label: "3 days", seconds: 259200 },
  { label: "7 days", seconds: 604800 },
];

export default function NewProgramPage() {
  const router = useRouter();
  const { address, createProgram, isTransacting } = usePunchcard();

  const [name, setName] = useState("");
  const [needed, setNeeded] = useState(5);
  const [reward, setReward] = useState("0.1");
  const [cooldown, setCooldown] = useState(3600);
  const [openingPool, setOpeningPool] = useState("0.5");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Compute consequence sentence
  const rewardBigInt = (() => {
    try {
      return parseEther(reward || "0");
    } catch {
      return 0n;
    }
  })();

  const tenCustomersPool = rewardBigInt * 10n;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const nameBytes = new TextEncoder().encode(name.trim()).length;
    if (nameBytes === 0) {
      setValidationError("Please enter a shop or programme name.");
      return;
    }
    if (nameBytes > MAX_NAME_BYTES) {
      setValidationError(`Programme name exceeds ${MAX_NAME_BYTES} bytes (${nameBytes} bytes).`);
      return;
    }
    if (needed < MIN_NEEDED || needed > MAX_NEEDED) {
      setValidationError(`Stamps needed must be between ${MIN_NEEDED} and ${MAX_NEEDED}.`);
      return;
    }
    if (rewardBigInt <= 0n) {
      setValidationError("Reward must be greater than zero.");
      return;
    }
    if (cooldown < MIN_COOLDOWN || cooldown > MAX_COOLDOWN) {
      setValidationError("Cooldown must be between 1 hour and 7 days.");
      return;
    }

    let poolVal = 0n;
    if (openingPool.trim()) {
      try {
        poolVal = parseEther(openingPool.trim());
      } catch {
        setValidationError("Invalid opening pool amount.");
        return;
      }
    }

    const createdId = await createProgram(
      name.trim(),
      needed,
      rewardBigInt,
      cooldown,
      poolVal
    );

    if (createdId) {
      router.push(`/p/${createdId}`);
    }
  };

  return (
    <PageShell
      title="Create Loyalty Programme"
      description="Start a customer loyalty card that pays out real BOT on the last stamp."
      showFloatingAction={false}
    >
      <div className="w-full max-w-xl mx-auto my-4 p-6 rounded-2xl border-2 border-[var(--border-default)] bg-[var(--bg-surface)] shadow-md">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Shop / Programme Name */}
          <div>
            <label
              htmlFor="prog-name"
              className="block text-[13px] font-heading font-semibold text-[var(--text-primary)] mb-1"
            >
              Shop or Programme Name
            </label>
            <input
              id="prog-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Corner Coffee Roast"
              maxLength={40}
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] font-medium text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Max 40 bytes. Keep it brief and friendly.
            </p>
          </div>

          {/* Stamps Needed (2..30) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="prog-needed"
                className="text-[13px] font-heading font-semibold text-[var(--text-primary)]"
              >
                Stamps Required for Reward
              </label>
              <span className="font-mono font-bold text-[14px] text-[var(--accent)]">
                {needed} stamps
              </span>
            </div>
            <input
              id="prog-needed"
              type="range"
              min={MIN_NEEDED}
              max={MAX_NEEDED}
              value={needed}
              onChange={(e) => setNeeded(Number(e.target.value))}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-mono">
              <span>{MIN_NEEDED} stamps</span>
              <span>15 stamps</span>
              <span>{MAX_NEEDED} stamps</span>
            </div>
          </div>

          {/* Reward Amount per Full Card */}
          <div>
            <label
              htmlFor="prog-reward"
              className="block text-[13px] font-heading font-semibold text-[var(--text-primary)] mb-1"
            >
              Payout Reward (BOT)
            </label>
            <div className="relative">
              <input
                id="prog-reward"
                type="text"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="0.1"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] font-mono font-bold text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <span className="absolute right-3.5 top-2.5 text-[12px] font-mono text-[var(--text-muted)] font-bold">
                BOT
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Amount sent to customer when they cash in their card.
            </p>
          </div>

          {/* Cooldown duration */}
          <div>
            <label
              htmlFor="prog-cooldown"
              className="block text-[13px] font-heading font-semibold text-[var(--text-primary)] mb-1"
            >
              Cooldown Between Stamps
            </label>
            <select
              id="prog-cooldown"
              value={cooldown}
              onChange={(e) => setCooldown(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] font-medium text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {COOLDOWN_PRESETS.map((p) => (
                <option key={p.seconds} value={p.seconds}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Minimum duration a customer must wait between consecutive stamps.
            </p>
          </div>

          {/* Opening pool */}
          <div>
            <label
              htmlFor="prog-pool"
              className="block text-[13px] font-heading font-semibold text-[var(--text-primary)] mb-1"
            >
              Opening Reward Pool (BOT)
            </label>
            <div className="relative">
              <input
                id="prog-pool"
                type="text"
                value={openingPool}
                onChange={(e) => setOpeningPool(e.target.value)}
                placeholder="0.5"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] font-mono font-bold text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <span className="absolute right-3.5 top-2.5 text-[12px] font-mono text-[var(--text-muted)] font-bold">
                BOT
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              You can start with 0 BOT and fund it later at any time.
            </p>
          </div>

          {/* Consequence sentence */}
          <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] text-[13px] leading-relaxed text-[var(--text-secondary)]">
            <span className="font-heading font-bold text-[var(--accent)] block mb-1">
              Commitment consequence:
            </span>
            You are committing <strong className="text-[var(--text-primary)] font-mono">{reward || "0"} BOT</strong> per completed card after <strong className="text-[var(--text-primary)] font-mono">{needed} stamps</strong>. You will need <strong className="text-[var(--text-primary)] font-mono">{formatEther(tenCustomersPool)} BOT</strong> in the pool to pay the first 10 customers.
          </div>

          {validationError && (
            <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] border border-[var(--danger)] text-[var(--danger)] text-[13px] font-medium">
              {validationError}
            </div>
          )}

          <button
            type="submit"
            disabled={isTransacting || !address}
            className="w-full py-3 rounded-xl font-heading font-bold text-[15px] bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90 active:scale-98 transition-all shadow-md disabled:opacity-50"
          >
            {isTransacting
              ? "Creating Programme..."
              : !address
              ? "Connect Wallet to Create"
              : "Create Programme"}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
