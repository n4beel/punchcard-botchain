import { formatEther } from "viem";

export type StampSlotStatus = "stamped" | "next" | "empty";

export interface StampSlot {
  index: number;
  status: StampSlotStatus;
  label: string;
}

export interface ProgramData {
  id: bigint;
  shop: `0x${string}`;
  name: string;
  needed: number;
  reward: bigint;
  cooldown: number;
  ready: number;
  redeemedCount: number;
  pool: bigint;
}

export interface CardData {
  stamps: number;
  lastStamp: bigint;
}

/**
 * Generates an accessible array of stamp slots for a punchcard grid.
 * @param stamps Number of stamps collected so far (0..needed)
 * @param needed Total stamps required to complete the card (2..30)
 */
export function stampGrid(stamps: number, needed: number): StampSlot[] {
  const slots: StampSlot[] = [];
  const safeNeeded = Math.max(1, Math.min(30, needed));
  const safeStamps = Math.max(0, Math.min(safeNeeded, stamps));

  for (let i = 1; i <= safeNeeded; i++) {
    let status: StampSlotStatus = "empty";
    let statusText = "uncollected";

    if (i <= safeStamps) {
      status = "stamped";
      statusText = "collected";
    } else if (i === safeStamps + 1 && safeStamps < safeNeeded) {
      status = "next";
      statusText = "next up";
    }

    slots.push({
      index: i,
      status,
      label: `Stamp ${i} of ${safeNeeded} (${statusText})`,
    });
  }

  return slots;
}

/**
 * Calculates unreserved free pool funds available for shop reclaim.
 * @param pool Total BOT in programme pool
 * @param ready Number of customers with completed, unredeemed cards
 * @param reward Payout in BOT per completed card
 */
export function freePool(
  pool: bigint,
  ready: number | bigint,
  reward: bigint
): bigint {
  const reserved = BigInt(ready) * reward;
  return pool > reserved ? pool - reserved : 0n;
}

/**
 * Computes the exact Date when a customer's next stamp opens.
 * Returns null if the card has never been stamped.
 */
export function nextStampAt(
  lastStamp: bigint | number,
  cooldown: bigint | number
): Date | null {
  const lastSec = Number(lastStamp);
  if (lastSec === 0) return null;
  const readySec = lastSec + Number(cooldown);
  return new Date(readySec * 1000);
}

/**
 * Determines whether cooldown is currently blocking a new stamp.
 */
export function isCooldownActive(
  lastStamp: bigint | number,
  cooldown: bigint | number,
  nowSec?: number
): boolean {
  const lastSec = Number(lastStamp);
  if (lastSec === 0) return false;
  const currentSec = nowSec ?? Math.floor(Date.now() / 1000);
  return currentSec < lastSec + Number(cooldown);
}

/**
 * Determines if a card is eligible for on-chain redemption.
 */
export function canRedeem(
  card: { stamps: number },
  program: { needed: number; pool: bigint; reward: bigint }
): { ok: boolean; reason?: string } {
  if (card.stamps < program.needed) {
    const left = program.needed - card.stamps;
    return {
      ok: false,
      reason: `Card needs ${left} more ${left === 1 ? "stamp" : "stamps"} before cashing in.`,
    };
  }
  if (program.pool < program.reward) {
    return {
      ok: false,
      reason: "The reward pool is empty. Ask the shop to top it up.",
    };
  }
  return { ok: true };
}

/**
 * Human readable cooldown duration formatting.
 */
export function formatCooldown(seconds: number): string {
  if (seconds < 3600) {
    const mins = Math.round(seconds / 60);
    return `${mins} min${mins === 1 ? "" : "s"}`;
  }
  if (seconds < 86400) {
    const hours = Math.round(seconds / 3600);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.round(seconds / 86400);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/**
 * Formats a reward value in BOT with trailing zero cleanup.
 */
export function formatReward(reward: bigint): string {
  if (reward === 0n) return "0 BOT";
  const str = formatEther(reward);
  const clean = str.includes(".") ? str.replace(/\.?0+$/, "") : str;
  return `${clean} BOT`;
}
