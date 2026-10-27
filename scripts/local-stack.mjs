/**
 * Local stack runner and seeder for Punchcard (Archetype Z · Card stack).
 *
 * Spawns anvil on port 8721 with chain id 968, deploys Punchcard, and seeds state:
 * - Programme 1 (Daily Roast Espresso): 5 stamps, 0.1 BOT reward, 1h cooldown, 1.0 BOT pool
 *   - Account 1 (Bob): 3 stamps, cooldown ready
 *   - Account 2 (Charlie): 5 stamps (full card, ready to cash in)
 *   - Account 4 (Eve): 1 stamp, cooldown active
 * - Programme 2 (Artisan Sourdough Bakery): 3 stamps, 0.2 BOT reward, 1h cooldown, 0.05 BOT pool (under-funded)
 *   - Account 3 (Dave): 3 stamps (full card, waiting for pool top-up)
 * - Account 5 (Frank): Outsider / fresh wallet
 *
 * Usage:
 *   node scripts/local-stack.mjs
 *   npm run dev
 */

import { spawn, execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const PORT = 8721;
const RPC = `http://127.0.0.1:${PORT}`;
const CHAIN_ID = 968;

const KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // 0: Alice (Shop)
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // 1: Bob (Customer A, 3 stamps)
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // 2: Charlie (Customer B, full card)
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // 3: Dave (Customer C, full card in under-funded)
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // 4: Eve (Customer D, cooldown active)
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba", // 5: Frank (Outsider)
];

const accounts = KEYS.map((k) => privateKeyToAccount(k));

const local = defineChain({
  id: CHAIN_ID,
  name: "anvil",
  nativeCurrency: { name: "Test BOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

try {
  execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`);
} catch {}

console.log(`Starting anvil on port ${PORT}...`);
spawn(
  "anvil",
  [
    "--port",
    String(PORT),
    "--chain-id",
    String(CHAIN_ID),
    "--accounts",
    "10",
    "--balance",
    "1000",
    "--silent",
  ],
  { detached: true, stdio: "ignore" }
).unref();

const pub = createPublicClient({ chain: local, transport: http() });

for (let i = 0; i < 40; i++) {
  try {
    await pub.getBlockNumber();
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 100));
  }
}

const artifact = JSON.parse(
  readFileSync(
    new URL("../contracts/out/Punchcard.sol/Punchcard.json", import.meta.url),
    "utf8"
  )
);

const wallets = accounts.map((account) =>
  createWalletClient({ account, chain: local, transport: http() })
);

console.log("Deploying Punchcard contract...");
const deployHash = await wallets[0].deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode.object,
});

const deployReceipt = await pub.waitForTransactionReceipt({ hash: deployHash });
const contractAddress = deployReceipt.contractAddress;
const startBlock = deployReceipt.blockNumber;

console.log(`Deployed Punchcard to ${contractAddress} at block ${startBlock}`);

async function advanceTime(seconds) {
  await pub.request({ method: "evm_increaseTime", params: [seconds] });
  await pub.request({ method: "evm_mine", params: [] });
}

console.log("Seeding programmes and cards...");

// 1. Programme 1 (Alice): Daily Roast Espresso
// 5 stamps needed, 0.1 BOT reward, 3600s cooldown, funded with 1.0 BOT
console.log("Creating Programme 1: Daily Roast Espresso...");
const create1Tx = await wallets[0].writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "create",
  args: ["Daily Roast Espresso", 5, parseEther("0.1"), 3600],
  value: parseEther("1.0"),
});
await pub.waitForTransactionReceipt({ hash: create1Tx });

// Advance time & stamp Charlie (stamp 1)
await advanceTime(3600);
let tx = await wallets[0].writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "stamp",
  args: [1n, accounts[2].address],
});
await pub.waitForTransactionReceipt({ hash: tx });

// Advance time & stamp Charlie (stamp 2) and Bob (stamp 1)
await advanceTime(3600);
tx = await wallets[0].writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "stamp",
  args: [1n, accounts[2].address],
});
await pub.waitForTransactionReceipt({ hash: tx });
tx = await wallets[0].writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "stamp",
  args: [1n, accounts[1].address],
});
await pub.waitForTransactionReceipt({ hash: tx });

// Advance time & stamp Charlie (stamp 3) and Bob (stamp 2)
await advanceTime(3600);
tx = await wallets[0].writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "stamp",
  args: [1n, accounts[2].address],
});
await pub.waitForTransactionReceipt({ hash: tx });
tx = await wallets[0].writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "stamp",
  args: [1n, accounts[1].address],
});
await pub.waitForTransactionReceipt({ hash: tx });

// Advance time & stamp Charlie (stamp 4) and Bob (stamp 3)
await advanceTime(3600);
tx = await wallets[0].writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "stamp",
  args: [1n, accounts[2].address],
});
await pub.waitForTransactionReceipt({ hash: tx });
tx = await wallets[0].writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "stamp",
  args: [1n, accounts[1].address],
});
await pub.waitForTransactionReceipt({ hash: tx });

// Advance time & stamp Charlie (stamp 5 -> FULL!)
await advanceTime(3600);
tx = await wallets[0].writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "stamp",
  args: [1n, accounts[2].address],
});
await pub.waitForTransactionReceipt({ hash: tx });

// Advance time so Bob's cooldown is expired (ready for stamp 4)
await advanceTime(3600);

// 2. Programme 2 (Alice): Artisan Sourdough Bakery
// 3 stamps needed, 0.2 BOT reward, 3600s cooldown, funded with only 0.05 BOT (under-funded)
console.log("Creating Programme 2: Artisan Sourdough Bakery...");
const create2Tx = await wallets[0].writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "create",
  args: ["Artisan Sourdough Bakery", 3, parseEther("0.2"), 3600],
  value: parseEther("0.05"),
});
await pub.waitForTransactionReceipt({ hash: create2Tx });

// Stamp Dave 3 times (advancing time) -> Dave reaches full card in under-funded programme
for (let i = 0; i < 3; i++) {
  tx = await wallets[0].writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: "stamp",
    args: [2n, accounts[3].address],
  });
  await pub.waitForTransactionReceipt({ hash: tx });
  if (i < 2) await advanceTime(3600);
}

// Finally stamp Eve (Customer D) in Programme 1 without advancing time!
// This makes Eve's cooldown active for the next hour.
console.log("Stamping Eve in Programme 1 (cooldown active)...");
tx = await wallets[0].writeContract({
  address: contractAddress,
  abi: artifact.abi,
  functionName: "stamp",
  args: [1n, accounts[4].address],
});
await pub.waitForTransactionReceipt({ hash: tx });

console.log("\nRoles Table:");
console.log("------------------------------------------------------------------------------------------------");
console.log("| Role                 | Index | Address                                    | Private Key (first 10) |");
console.log("------------------------------------------------------------------------------------------------");
console.log(`| Shop (Alice)         | 0     | ${accounts[0].address} | ${KEYS[0].slice(0, 10)}... |`);
console.log(`| Customer A (Bob)     | 1     | ${accounts[1].address} | ${KEYS[1].slice(0, 10)}... |`);
console.log(`| Customer B (Charlie) | 2     | ${accounts[2].address} | ${KEYS[2].slice(0, 10)}... |`);
console.log(`| Customer C (Dave)    | 3     | ${accounts[3].address} | ${KEYS[3].slice(0, 10)}... |`);
console.log(`| Customer D (Eve)     | 4     | ${accounts[4].address} | ${KEYS[4].slice(0, 10)}... |`);
console.log(`| Outsider (Frank)     | 5     | ${accounts[5].address} | ${KEYS[5].slice(0, 10)}... |`);
console.log("------------------------------------------------------------------------------------------------\n");

console.log("Seeded Status Table:");
console.log("------------------------------------------------------------------------------------------------");
console.log("| Programme ID & Name          | Customer             | Card State                | Ready To Action  |");
console.log("------------------------------------------------------------------------------------------------");
console.log("| 1 · Daily Roast Espresso     | Customer A (Bob)     | 3/5 stamps                | Stamp ready      |");
console.log("| 1 · Daily Roast Espresso     | Customer B (Charlie) | 5/5 stamps (Full)         | Redeem 0.1 BOT   |");
console.log("| 1 · Daily Roast Espresso     | Customer D (Eve)     | 1/5 stamps (Cooldown)     | Wait cooldown    |");
console.log("| 2 · Artisan Sourdough Bakery | Customer C (Dave)    | 3/3 stamps (Under-funded) | Needs pool topup |");
console.log("| Any                          | Outsider (Frank)     | No cards                  | Start fresh card |");
console.log("------------------------------------------------------------------------------------------------\n");

// Write .env.local
const envContent = [
  `NEXT_PUBLIC_BOTCHAIN_NETWORK=testnet`,
  `NEXT_PUBLIC_BOHR_RPC=${RPC}`,
  `NEXT_PUBLIC_CONTRACT_968=${contractAddress}`,
  `NEXT_PUBLIC_DEPLOY_BLOCK_968=${startBlock}`,
  "",
].join("\n");

writeFileSync(".env.local", envContent);
console.log("Wrote .env.local");
console.log(`\nLocal stack ready on port ${PORT}!`);
