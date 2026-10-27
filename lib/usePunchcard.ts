"use client";

import { useState, useCallback } from "react";
import {
  usePublicClient,
  useWalletClient,
  useChainId,
  useAccount,
} from "wagmi";
import { punchcardAbi } from "./botchain/abi";
import { getDeployment, isDeployed } from "./botchain/deployment";
import { type BotChainId, isBotChainId } from "./botchain/chain";
import { describeError } from "./errors";
import { useToast } from "@/components/ui/Toast";
import type { ProgramData, CardData } from "./punchcard";

export function usePunchcard() {
  const chainId = useChainId();
  const currentChainId: BotChainId = isBotChainId(chainId) ? chainId : 968;
  const deployment = getDeployment(currentChainId);
  const deployed = isDeployed(currentChainId);

  const publicClient = usePublicClient(); // stable-hook-result
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { toast } = useToast();

  const [isTransacting, setIsTransacting] = useState(false);

  // Read latest programmes
  const fetchLatestPrograms = useCallback(
    async (offset = 0n, count = 50n): Promise<ProgramData[]> => {
      if (!publicClient || !deployed) return [];
      try {
        const [progs, ids] = await publicClient.readContract({
          address: deployment.address,
          abi: punchcardAbi,
          functionName: "latest",
          args: [offset, count],
        });

        return progs.map((p, idx) => ({
          id: ids[idx],
          shop: p.shop,
          name: p.name,
          needed: p.needed,
          reward: p.reward,
          cooldown: p.cooldown,
          ready: p.ready,
          redeemedCount: p.redeemedCount,
          pool: p.pool,
        }));
      } catch (err) {
        console.error("fetchLatestPrograms error:", err);
        return [];
      }
    },
    [publicClient, deployed, deployment.address]
  );

  // Read single programme
  const fetchProgram = useCallback(
    async (id: bigint): Promise<ProgramData | null> => {
      if (!publicClient || !deployed || id <= 0n) return null;
      try {
        const p = await publicClient.readContract({
          address: deployment.address,
          abi: punchcardAbi,
          functionName: "programOf",
          args: [id],
        });
        return {
          id,
          shop: p.shop,
          name: p.name,
          needed: p.needed,
          reward: p.reward,
          cooldown: p.cooldown,
          ready: p.ready,
          redeemedCount: p.redeemedCount,
          pool: p.pool,
        };
      } catch (err) {
        console.error("fetchProgram error:", err);
        return null;
      }
    },
    [publicClient, deployed, deployment.address]
  );

  // Read card of customer
  const fetchCard = useCallback(
    async (id: bigint, customer: `0x${string}`): Promise<CardData | null> => {
      if (!publicClient || !deployed || id <= 0n || !customer) return null;
      try {
        const c = await publicClient.readContract({
          address: deployment.address,
          abi: punchcardAbi,
          functionName: "cardOf",
          args: [id, customer],
        });
        return {
          stamps: c.stamps,
          lastStamp: c.lastStamp,
        };
      } catch (err) {
        console.error("fetchCard error:", err);
        return null;
      }
    },
    [publicClient, deployed, deployment.address]
  );

  // Read current chain block timestamp
  const fetchBlockTimestamp = useCallback(async (): Promise<number> => {
    if (!publicClient) return Math.floor(Date.now() / 1000);
    try {
      const block = await publicClient.getBlock();
      return Number(block.timestamp);
    } catch {
      return Math.floor(Date.now() / 1000);
    }
  }, [publicClient]);

  // Read pending balance
  const fetchPending = useCallback(
    async (who: `0x${string}`): Promise<bigint> => {
      if (!publicClient || !deployed || !who) return 0n;
      try {
        const bal = await publicClient.readContract({
          address: deployment.address,
          abi: punchcardAbi,
          functionName: "pending",
          args: [who],
        });
        return bal;
      } catch (err) {
        console.error("fetchPending error:", err);
        return 0n;
      }
    },
    [publicClient, deployed, deployment.address]
  );

  // Create Programme
  const createProgram = useCallback(
    async (
      name: string,
      needed: number,
      reward: bigint,
      cooldown: number,
      openingPool: bigint
    ): Promise<bigint | null> => {
      if (!walletClient || !publicClient) {
        toast("error", "Connect wallet first");
        return null;
      }
      try {
        setIsTransacting(true);
        const hash = await walletClient.writeContract({
          address: deployment.address,
          abi: punchcardAbi,
          functionName: "create",
          args: [name, needed, reward, cooldown],
          value: openingPool,
        });

        toast("info", "Transaction sent: creating programme...");
        await publicClient.waitForTransactionReceipt({ hash });

        // Retrieve created id from programCount
        const count = await publicClient.readContract({
          address: deployment.address,
          abi: punchcardAbi,
          functionName: "programCount",
        });

        toast("success", `Created "${name}"! (Programme #${count})`);
        return count;
      } catch (err) {
        const message = describeError(err);
        toast("error", message);
        return null;
      } finally {
        setIsTransacting(false);
      }
    },
    [walletClient, publicClient, deployment.address, toast]
  );

  // Fund Programme
  const fundProgram = useCallback(
    async (id: bigint, amount: bigint): Promise<boolean> => {
      if (!walletClient || !publicClient) {
        toast("error", "Connect wallet first");
        return false;
      }
      try {
        setIsTransacting(true);
        const hash = await walletClient.writeContract({
          address: deployment.address,
          abi: punchcardAbi,
          functionName: "fund",
          args: [id],
          value: amount,
        });

        toast("info", "Transaction sent: topping up pool...");
        await publicClient.waitForTransactionReceipt({ hash });
        toast("success", "Pool topped up successfully!");
        return true;
      } catch (err) {
        const message = describeError(err);
        toast("error", message);
        return false;
      } finally {
        setIsTransacting(false);
      }
    },
    [walletClient, publicClient, deployment.address, toast]
  );

  // Stamp Customer
  const stampCustomer = useCallback(
    async (id: bigint, customer: `0x${string}`): Promise<boolean> => {
      if (!walletClient || !publicClient) {
        toast("error", "Connect wallet first");
        return false;
      }
      try {
        setIsTransacting(true);
        const hash = await walletClient.writeContract({
          address: deployment.address,
          abi: punchcardAbi,
          functionName: "stamp",
          args: [id, customer],
        });

        toast("info", "Transaction sent: stamping customer card...");
        await publicClient.waitForTransactionReceipt({ hash });
        toast("success", "Stamp applied successfully!");
        return true;
      } catch (err) {
        const message = describeError(err);
        toast("error", message);
        return false;
      } finally {
        setIsTransacting(false);
      }
    },
    [walletClient, publicClient, deployment.address, toast]
  );

  // Redeem Full Card
  const redeemCard = useCallback(
    async (id: bigint): Promise<boolean> => {
      if (!walletClient || !publicClient) {
        toast("error", "Connect wallet first");
        return false;
      }
      try {
        setIsTransacting(true);
        const hash = await walletClient.writeContract({
          address: deployment.address,
          abi: punchcardAbi,
          functionName: "redeem",
          args: [id],
        });

        toast("info", "Transaction sent: cashing in card...");
        await publicClient.waitForTransactionReceipt({ hash });
        toast("success", "Reward cashed in! Check your earnings on /me.");
        return true;
      } catch (err) {
        const message = describeError(err);
        toast("error", message);
        return false;
      } finally {
        setIsTransacting(false);
      }
    },
    [walletClient, publicClient, deployment.address, toast]
  );

  // Release Free Pool
  const releaseFreePool = useCallback(
    async (id: bigint, amount: bigint): Promise<boolean> => {
      if (!walletClient || !publicClient) {
        toast("error", "Connect wallet first");
        return false;
      }
      try {
        setIsTransacting(true);
        const hash = await walletClient.writeContract({
          address: deployment.address,
          abi: punchcardAbi,
          functionName: "releaseFree",
          args: [id, amount],
        });

        toast("info", "Transaction sent: releasing free pool...");
        await publicClient.waitForTransactionReceipt({ hash });
        toast("success", "Free pool released to your earnings!");
        return true;
      } catch (err) {
        const message = describeError(err);
        toast("error", message);
        return false;
      } finally {
        setIsTransacting(false);
      }
    },
    [walletClient, publicClient, deployment.address, toast]
  );

  // Withdraw Pending
  const withdrawPending = useCallback(async (): Promise<boolean> => {
    if (!walletClient || !publicClient) {
      toast("error", "Connect wallet first");
      return false;
    }
    try {
      setIsTransacting(true);
      const hash = await walletClient.writeContract({
        address: deployment.address,
        abi: punchcardAbi,
        functionName: "withdraw",
      });

      toast("info", "Transaction sent: withdrawing BOT to wallet...");
      await publicClient.waitForTransactionReceipt({ hash });
      toast("success", "Withdrawal complete! Funds are in your wallet.");
      return true;
    } catch (err) {
      const message = describeError(err);
      toast("error", message);
      return false;
    } finally {
      setIsTransacting(false);
    }
  }, [walletClient, publicClient, deployment.address, toast]);

  return {
    deployment,
    deployed,
    address,
    isTransacting,
    fetchLatestPrograms,
    fetchProgram,
    fetchCard,
    fetchBlockTimestamp,
    fetchPending,
    createProgram,
    fundProgram,
    stampCustomer,
    redeemCard,
    releaseFreePool,
    withdrawPending,
  };
}
