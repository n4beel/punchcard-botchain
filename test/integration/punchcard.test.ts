import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEther,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { punchcardAbi } from "@/lib/botchain/abi";

const PORT = 8621;
const RPC = `http://127.0.0.1:${PORT}`;
const CHAIN_ID = 968;

const localChain = defineChain({
  id: CHAIN_ID,
  name: "anvil",
  nativeCurrency: { name: "Test BOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

const ACCOUNTS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Alice (Shop)
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // Bob (Customer 1)
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // Charlie (Customer 2)
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // Dave (Customer 3)
  "0x47e179ec340f649b836459260f82e1ad918eef894f1177389214ff586a72b84e", // Eve (Outsider)
].map((k) => privateKeyToAccount(k as `0x${string}`));

describe("Punchcard On-Chain Integration Tests", () => {
  let anvil: ChildProcess;
  let contractAddress: Address;

  const publicClient = createPublicClient({
    chain: localChain,
    transport: http(RPC),
  });

  const [alice, bob, charlie, dave, eve] = ACCOUNTS.map((account) =>
    createWalletClient({
      account,
      chain: localChain,
      transport: http(RPC),
    })
  );

  beforeAll(async () => {
    anvil = spawn("anvil", [
      "--port",
      String(PORT),
      "--chain-id",
      String(CHAIN_ID),
      "--silent",
    ]);

    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        await publicClient.getBlockNumber();
        ready = true;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!ready) throw new Error(`Anvil failed to start on port ${PORT}`);

    // Deploy contract
    const artifactPath = join(
      process.cwd(),
      "contracts",
      "out",
      "Punchcard.sol",
      "Punchcard.json"
    );
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));

    const hash = await alice.deployContract({
      abi: artifact.abi,
      bytecode: artifact.bytecode.object,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    contractAddress = receipt.contractAddress as Address;
  });

  afterAll(async () => {
    anvil?.kill();
  });

  async function increaseTime(seconds: number) {
    await publicClient.request({
      // @ts-expect-error Anvil custom RPC method
      method: "evm_increaseTime",
      // @ts-expect-error Anvil custom RPC method
      params: [seconds],
    });
    await publicClient.request({
      // @ts-expect-error Anvil custom RPC method
      method: "evm_mine",
      // @ts-expect-error Anvil custom RPC method
      params: [],
    });
  }

  it("deploys with programCount = 0", async () => {
    const count = await publicClient.readContract({
      address: contractAddress,
      abi: punchcardAbi,
      functionName: "programCount",
    });
    expect(count).toBe(0n);
  });

  describe("Validation on create()", () => {
    it("reverts on BadNeeded (< 2)", async () => {
      await expect(
        alice.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "create",
          args: ["Corner Coffee", 1, parseEther("0.1"), 3600],
        })
      ).rejects.toThrow();
    });

    it("reverts on BadNeeded (> 30)", async () => {
      await expect(
        alice.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "create",
          args: ["Corner Coffee", 31, parseEther("0.1"), 3600],
        })
      ).rejects.toThrow();
    });

    it("reverts on ZeroReward", async () => {
      await expect(
        alice.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "create",
          args: ["Corner Coffee", 5, 0n, 3600],
        })
      ).rejects.toThrow();
    });

    it("reverts on BadCooldown (< 3600)", async () => {
      await expect(
        alice.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "create",
          args: ["Corner Coffee", 5, parseEther("0.1"), 3599],
        })
      ).rejects.toThrow();
    });

    it("reverts on BadCooldown (> 604800)", async () => {
      await expect(
        alice.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "create",
          args: ["Corner Coffee", 5, parseEther("0.1"), 604801],
        })
      ).rejects.toThrow();
    });

    it("reverts on NameTooLong (> 40 bytes)", async () => {
      await expect(
        alice.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "create",
          args: [
            "This bakery name is completely ridiculous and over forty bytes",
            5,
            parseEther("0.1"),
            3600,
          ],
        })
      ).rejects.toThrow();
    });
  });

  describe("Programme creation and funding", () => {
    it("creates Programme #1 with initial pool", async () => {
      const hash = await alice.writeContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "create",
        args: ["Corner Coffee", 3, parseEther("0.1"), 3600],
        value: parseEther("0.5"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const count = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "programCount",
      });
      expect(count).toBe(1n);

      const prog = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "programOf",
        args: [1n],
      });
      expect(prog.shop.toLowerCase()).toBe(alice.account.address.toLowerCase());
      expect(prog.needed).toBe(3);
      expect(prog.reward).toBe(parseEther("0.1"));
      expect(prog.cooldown).toBe(3600);
      expect(prog.pool).toBe(parseEther("0.5"));
      expect(prog.name).toBe("Corner Coffee");
    });

    it("allows anyone to fund Programme #1", async () => {
      const hash = await bob.writeContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "fund",
        args: [1n],
        value: parseEther("0.2"),
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const prog = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "programOf",
        args: [1n],
      });
      expect(prog.pool).toBe(parseEther("0.7"));
    });

    it("reverts fund on NoSuchProgram", async () => {
      await expect(
        bob.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "fund",
          args: [999n],
          value: parseEther("0.1"),
        })
      ).rejects.toThrow();
    });
  });

  describe("Stamping flow and limits", () => {
    it("reverts when non-shop tries to stamp (NotShop)", async () => {
      await expect(
        bob.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "stamp",
          args: [1n, charlie.account.address],
        })
      ).rejects.toThrow();
    });

    it("reverts when shop stamps self (SelfStamp)", async () => {
      await expect(
        alice.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "stamp",
          args: [1n, alice.account.address],
        })
      ).rejects.toThrow();
    });

    it("shop stamps Bob successfully (stamp 1)", async () => {
      const hash = await alice.writeContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "stamp",
        args: [1n, bob.account.address],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const card = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "cardOf",
        args: [1n, bob.account.address],
      });
      expect(card.stamps).toBe(1);
    });

    it("reverts on immediate re-stamp (TooSoon)", async () => {
      await expect(
        alice.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "stamp",
          args: [1n, bob.account.address],
        })
      ).rejects.toThrow();
    });

    it("stamps Bob again after cooldown (stamp 2)", async () => {
      await increaseTime(3600);

      const hash = await alice.writeContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "stamp",
        args: [1n, bob.account.address],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const card = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "cardOf",
        args: [1n, bob.account.address],
      });
      expect(card.stamps).toBe(2);
    });

    it("stamps Bob to full (stamp 3, ready incremented)", async () => {
      await increaseTime(3600);

      const hash = await alice.writeContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "stamp",
        args: [1n, bob.account.address],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const card = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "cardOf",
        args: [1n, bob.account.address],
      });
      expect(card.stamps).toBe(3);

      const prog = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "programOf",
        args: [1n],
      });
      expect(prog.ready).toBe(1);
    });

    it("reverts stamping a card that is already full (CardFull)", async () => {
      await increaseTime(3600);

      await expect(
        alice.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "stamp",
          args: [1n, bob.account.address],
        })
      ).rejects.toThrow();
    });
  });

  describe("Redemption and pool reservation", () => {
    it("reverts redeem when card is not full (NotFull)", async () => {
      await expect(
        charlie.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "redeem",
          args: [1n],
        })
      ).rejects.toThrow();
    });

    it("Bob redeems full card: stamps reset, ready decrements, pending credited", async () => {
      const hash = await bob.writeContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "redeem",
        args: [1n],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const card = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "cardOf",
        args: [1n, bob.account.address],
      });
      expect(card.stamps).toBe(0);

      const prog = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "programOf",
        args: [1n],
      });
      expect(prog.ready).toBe(0);
      expect(prog.redeemedCount).toBe(1);
      expect(prog.pool).toBe(parseEther("0.6")); // 0.7 - 0.1

      const pending = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "pending",
        args: [bob.account.address],
      });
      expect(pending).toBe(parseEther("0.1"));
    });

    it("handles PoolEmpty on redeem: keeps card full and reverts", async () => {
      // Create underfunded programme 2 (reward 1.0 BOT, pool 0)
      const hCreate = await alice.writeContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "create",
        args: ["Underfunded Bakery", 2, parseEther("1.0"), 3600],
        value: 0n,
      });
      await publicClient.waitForTransactionReceipt({ hash: hCreate });

      // Alice stamps Dave twice
      let hStamp = await alice.writeContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "stamp",
        args: [2n, dave.account.address],
      });
      await publicClient.waitForTransactionReceipt({ hash: hStamp });

      await increaseTime(3600);
      hStamp = await alice.writeContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "stamp",
        args: [2n, dave.account.address],
      });
      await publicClient.waitForTransactionReceipt({ hash: hStamp });

      // Dave attempts to redeem
      await expect(
        dave.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "redeem",
          args: [2n],
        })
      ).rejects.toThrow();

      // Card must still be full!
      const card = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "cardOf",
        args: [2n, dave.account.address],
      });
      expect(card.stamps).toBe(2);
    });
  });

  describe("Free pool release and withdrawal", () => {
    it("reverts releaseFree if not shop (NotShop)", async () => {
      await expect(
        bob.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "releaseFree",
          args: [1n, parseEther("0.1")],
        })
      ).rejects.toThrow();
    });

    it("reverts releaseFree if exceeding free pool (Reserved)", async () => {
      // Prog 1 pool is 0.6 BOT, ready is 0, free is 0.6 BOT.
      await expect(
        alice.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "releaseFree",
          args: [1n, parseEther("0.61")],
        })
      ).rejects.toThrow();
    });

    it("shop releases free pool to pending", async () => {
      const hash = await alice.writeContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "releaseFree",
        args: [1n, parseEther("0.4")],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const prog = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "programOf",
        args: [1n],
      });
      expect(prog.pool).toBe(parseEther("0.2"));

      const pendingAlice = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "pending",
        args: [alice.account.address],
      });
      expect(pendingAlice).toBe(parseEther("0.4"));
    });

    it("reverts withdraw when balance is zero (NothingToWithdraw)", async () => {
      await expect(
        charlie.writeContract({
          address: contractAddress,
          abi: punchcardAbi,
          functionName: "withdraw",
        })
      ).rejects.toThrow();
    });

    it("Bob pulls pending reward via withdraw()", async () => {
      const balBefore = await publicClient.getBalance({
        address: bob.account.address,
      });

      const hash = await bob.writeContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "withdraw",
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const gasPaid = receipt.gasUsed * receipt.effectiveGasPrice;

      const balAfter = await publicClient.getBalance({
        address: bob.account.address,
      });
      expect(balAfter + gasPaid - balBefore).toBe(parseEther("0.1"));

      const pendingBob = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "pending",
        args: [bob.account.address],
      });
      expect(pendingBob).toBe(0n);
    });

    it("Alice pulls released free pool via withdraw()", async () => {
      const balBefore = await publicClient.getBalance({
        address: alice.account.address,
      });

      const hash = await alice.writeContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "withdraw",
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const gasPaid = receipt.gasUsed * receipt.effectiveGasPrice;

      const balAfter = await publicClient.getBalance({
        address: alice.account.address,
      });
      expect(balAfter + gasPaid - balBefore).toBe(parseEther("0.4"));

      const pendingAlice = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "pending",
        args: [alice.account.address],
      });
      expect(pendingAlice).toBe(0n);
    });
  });

  describe("Contract views", () => {
    it("reads freePool() accurately", async () => {
      // Prog 1: pool 0.2, ready 0, reward 0.1 -> free = 0.2
      const free1 = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "freePool",
        args: [1n],
      });
      expect(free1).toBe(parseEther("0.2"));

      // Prog 2: pool 0, ready 1, reward 1.0 -> free = 0
      const free2 = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "freePool",
        args: [2n],
      });
      expect(free2).toBe(0n);
    });

    it("reads latest() with pagination", async () => {
      const [progs, ids] = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "latest",
        args: [0n, 10n],
      });
      expect(ids.length).toBe(2);
      expect(ids[0]).toBe(2n);
      expect(ids[1]).toBe(1n);
      expect(progs.length).toBe(2);
      expect(progs[0].name).toBe("Underfunded Bakery"); // newest first
      expect(progs[1].name).toBe("Corner Coffee");
    });

    it("reads byShop()", async () => {
      const ids = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "byShop",
        args: [alice.account.address],
      });
      expect(ids.length).toBe(2);
      expect(ids[0]).toBe(1n);
      expect(ids[1]).toBe(2n);

      const emptyIds = await publicClient.readContract({
        address: contractAddress,
        abi: punchcardAbi,
        functionName: "byShop",
        args: [eve.account.address],
      });
      expect(emptyIds.length).toBe(0);
    });
  });
});
