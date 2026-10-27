import { decodeEventLog, type Log } from "viem";
import { punchcardAbi } from "./botchain/abi";

export interface CreatedEvent {
  id: bigint;
  shop: `0x${string}`;
  name: string;
  needed: number;
  reward: bigint;
  cooldown: number;
  pool: bigint;
}

export interface StampedEvent {
  id: bigint;
  customer: `0x${string}`;
  stamps: number;
}

export interface RedeemedEvent {
  id: bigint;
  customer: `0x${string}`;
  reward: bigint;
}

export interface FundedEvent {
  id: bigint;
  from: `0x${string}`;
  amount: bigint;
}

export function parseStampedLog(log: Log): StampedEvent | null {
  try {
    const decoded = decodeEventLog({
      abi: punchcardAbi,
      data: log.data,
      topics: log.topics,
      eventName: "Stamped",
    });
    return {
      id: decoded.args.id,
      customer: decoded.args.customer,
      stamps: Number(decoded.args.stamps),
    };
  } catch {
    return null;
  }
}

export function parseCreatedLog(log: Log): CreatedEvent | null {
  try {
    const decoded = decodeEventLog({
      abi: punchcardAbi,
      data: log.data,
      topics: log.topics,
      eventName: "Created",
    });
    return {
      id: decoded.args.id,
      shop: decoded.args.shop,
      name: decoded.args.name,
      needed: Number(decoded.args.needed),
      reward: decoded.args.reward,
      cooldown: Number(decoded.args.cooldown),
      pool: decoded.args.pool,
    };
  } catch {
    return null;
  }
}

export function parseRedeemedLog(log: Log): RedeemedEvent | null {
  try {
    const decoded = decodeEventLog({
      abi: punchcardAbi,
      data: log.data,
      topics: log.topics,
      eventName: "Redeemed",
    });
    return {
      id: decoded.args.id,
      customer: decoded.args.customer,
      reward: decoded.args.reward,
    };
  } catch {
    return null;
  }
}
