import { activeBotChain } from "@/lib/botchain/chain";
import { formatEther } from "viem";

/**
 * User-facing error decoders for Punchcard.
 * Matches spec §4 copy requirements.
 */
export function describeError(err: unknown): string {
  // A wallet on the other BOT Chain network: writes are pinned to this build's chain (lib/useChainWrite.ts), so wagmi
  // refuses before the wallet opens. Say what to do, not the library's name for it.
  if (/ConnectorChainMismatch|chain mismatch|does not match the target chain/i.test(err instanceof Error ? `${err.name} ${err.message}` : String(err))) {
    return `Your wallet is on a different network. Switch it to ${activeBotChain.name}, then try again.`;
  }
  if (!err) return "An unexpected error occurred.";

  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("User rejected") || msg.includes("user rejected")) {
    return "Transaction was cancelled in wallet.";
  }

  if (msg.includes("TooSoon")) {
    const match = msg.match(/readyAt:\s*(\d+)/i) || msg.match(/TooSoon\((\d+)\)/);
    if (match && match[1]) {
      const readyTime = new Date(Number(match[1]) * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `Next stamp for this customer opens at ${readyTime}.`;
    }
    return "Next stamp cannot be issued yet. Customer is currently on cooldown.";
  }

  if (msg.includes("PoolEmpty")) {
    const match = msg.match(/pool:\s*(\d+).*?reward:\s*(\d+)/i) || msg.match(/PoolEmpty\((\d+),\s*(\d+)\)/);
    if (match && match[1] && match[2]) {
      const poolBot = formatEther(BigInt(match[1]));
      const rewardBot = formatEther(BigInt(match[2]));
      return `The reward pool has ${poolBot} BOT; the reward is ${rewardBot} BOT. Ask the shop to top it up.`;
    }
    return "The reward pool is empty. Ask the shop to top it up.";
  }

  if (msg.includes("Reserved")) {
    const match = msg.match(/free:\s*(\d+)/i) || msg.match(/Reserved\((\d+)\)/);
    if (match && match[1]) {
      const freeBot = formatEther(BigInt(match[1]));
      return `Cannot release reserved funds. Free pool is ${freeBot} BOT.`;
    }
    return "Cannot release reserved funds owed to completed cards.";
  }

  if (msg.includes("NotShop")) {
    return "Only the shop can stamp cards for this programme.";
  }

  if (msg.includes("CardFull")) {
    return "This card is full and ready to be cashed in.";
  }

  if (msg.includes("SelfStamp")) {
    return "Shops cannot stamp their own loyalty cards.";
  }

  if (msg.includes("NotFull")) {
    return "This card needs more stamps before it can be redeemed.";
  }

  if (msg.includes("NoSuchProgram")) {
    return "Loyalty programme not found.";
  }

  if (msg.includes("NothingToWithdraw")) {
    return "No pending balance available to withdraw.";
  }

  if (msg.includes("EmptyName")) {
    return "Programme name cannot be empty.";
  }

  if (msg.includes("NameTooLong")) {
    return "Programme name exceeds maximum length (40 bytes).";
  }

  if (msg.includes("BadNeeded")) {
    return "Stamps required must be between 2 and 30.";
  }

  if (msg.includes("ZeroReward")) {
    return "Reward payout must be greater than zero.";
  }

  if (msg.includes("BadCooldown")) {
    return "Cooldown between stamps must be between 1 hour and 7 days.";
  }

  if (msg.includes("ZeroCustomer")) {
    return "Invalid customer address.";
  }

  if (msg.includes("ZeroAmount")) {
    return "Funding amount must be greater than zero.";
  }

  if (msg.includes("TransferFailed")) {
    return "BOT transfer failed.";
  }

  if (msg.includes("insufficient funds") || msg.includes("exceeds balance")) {
    return "Insufficient BOT in wallet to pay transaction value and gas.";
  }

  return msg.length > 140 ? `${msg.slice(0, 137)}…` : msg;
}
