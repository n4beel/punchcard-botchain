/**
 * Punchcard contract ABI.
 * Typed with `as const` for complete viem / wagmi inference.
 */
export const punchcardAbi = [
  // --- Structs / Types ---
  // Program: (address shop, uint128 reward, uint32 needed, uint32 cooldown, uint32 ready, uint32 redeemedCount, uint128 pool, string name)
  // Card: (uint32 stamps, uint64 lastStamp)

  // --- Functions ---
  {
    type: "function",
    name: "create",
    inputs: [
      { name: "name", type: "string" },
      { name: "needed", type: "uint32" },
      { name: "reward", type: "uint128" },
      { name: "cooldown", type: "uint32" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "fund",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "stamp",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "customer", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "redeem",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "releaseFree",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint128" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "programOf",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "shop", type: "address" },
          { name: "reward", type: "uint128" },
          { name: "needed", type: "uint32" },
          { name: "cooldown", type: "uint32" },
          { name: "ready", type: "uint32" },
          { name: "redeemedCount", type: "uint32" },
          { name: "pool", type: "uint128" },
          { name: "name", type: "string" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "cardOf",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "who", type: "address" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "stamps", type: "uint32" },
          { name: "lastStamp", type: "uint64" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "freePool",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "uint128" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "byShop",
    inputs: [{ name: "shop", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "latest",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "count", type: "uint256" },
    ],
    outputs: [
      {
        name: "progs",
        type: "tuple[]",
        components: [
          { name: "shop", type: "address" },
          { name: "reward", type: "uint128" },
          { name: "needed", type: "uint32" },
          { name: "cooldown", type: "uint32" },
          { name: "ready", type: "uint32" },
          { name: "redeemedCount", type: "uint32" },
          { name: "pool", type: "uint128" },
          { name: "name", type: "string" },
        ],
      },
      { name: "ids", type: "uint256[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pending",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "programCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },

  // --- Events ---
  {
    type: "event",
    name: "Created",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "shop", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "needed", type: "uint32", indexed: false },
      { name: "reward", type: "uint128", indexed: false },
      { name: "cooldown", type: "uint32", indexed: false },
      { name: "pool", type: "uint128", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Funded",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "from", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Stamped",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "customer", type: "address", indexed: true },
      { name: "stamps", type: "uint32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Redeemed",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "customer", type: "address", indexed: true },
      { name: "reward", type: "uint128", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Released",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "amount", type: "uint128", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "recipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },

  // --- Errors ---
  { type: "error", name: "NoSuchProgram", inputs: [] },
  { type: "error", name: "EmptyName", inputs: [] },
  { type: "error", name: "NameTooLong", inputs: [] },
  { type: "error", name: "BadNeeded", inputs: [] },
  { type: "error", name: "ZeroReward", inputs: [] },
  { type: "error", name: "BadCooldown", inputs: [] },
  { type: "error", name: "ZeroCustomer", inputs: [] },
  { type: "error", name: "NotShop", inputs: [] },
  { type: "error", name: "SelfStamp", inputs: [] },
  { type: "error", name: "CardFull", inputs: [] },
  {
    type: "error",
    name: "TooSoon",
    inputs: [{ name: "readyAt", type: "uint256" }],
  },
  { type: "error", name: "NotFull", inputs: [] },
  {
    type: "error",
    name: "PoolEmpty",
    inputs: [
      { name: "pool", type: "uint128" },
      { name: "reward", type: "uint128" },
    ],
  },
  {
    type: "error",
    name: "Reserved",
    inputs: [{ name: "free", type: "uint128" }],
  },
  { type: "error", name: "ZeroAmount", inputs: [] },
  { type: "error", name: "NothingToWithdraw", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },
  { type: "error", name: "ReentrantCall", inputs: [] },
] as const;

export const contractAbi = punchcardAbi;
