# Punchcard Contract Design Decisions

## 1. Architectural Decisions

### 1.1 Prefunded Reward Pool & Pull Payments
- Shops establish a customer loyalty programme with a defined stamp requirement `needed` (2..30) and a payout `reward` in BOT.
- When creating or funding a programme, BOT is deposited into `pool`.
- When a customer completes their card (`stamps == needed`), the customer calls `redeem(id)`.
- Instead of pushing native BOT directly to the customer in `redeem` (which introduces external call griefing, gas limits, or receiver reverts), the reward is credited to `pending[customer]`.
- All payouts (customer redemptions and shop free pool releases) are collected via a reentrancy-guarded pull payment (`withdraw`).

### 1.2 Shop Trust Model & Stamping Rules
- The contract enforces that only the designated `shop` can stamp cards (`NotShop`).
- A shop cannot stamp its own address (`SelfStamp`).
- A minimum cooldown between stamps (`MIN_COOLDOWN = 1 hours`, `MAX_COOLDOWN = 7 days`) is enforced per customer address. If a stamp is attempted before the cooldown elapses, the contract reverts with `TooSoon(readyAt)` indicating the exact Unix timestamp when the customer is eligible for their next stamp.
- Once a card reaches `needed` stamps, it cannot receive further stamps (`CardFull`) until redeemed.

### 1.3 Reserved Pool & Free Pool Reclaim
- A customer who reaches `needed` stamps increments the programme's `ready` counter.
- `ready * reward` represents the **reserved pool**—funds guaranteed to completed cards awaiting redemption.
- The shop may withdraw unreserved funds at any time using `releaseFree(id, amount)`.
- `freePool = pool > ready * reward ? pool - ready * reward : 0`. Releasing more than `freePool` is strictly rejected with `Reserved(free)`.
- Stamping when the pool is under-funded is allowed (the customer card fills, `ready` increments, but `freePool` drops to 0, and `redeem` reverts with `PoolEmpty(pool, reward)` until the shop or community funds the pool).

### 1.4 Limits and Storage Bounds
- `MIN_NEEDED = 2`, `MAX_NEEDED = 30` stamps.
- `MIN_COOLDOWN = 3600` seconds (1 hour), `MAX_COOLDOWN = 604800` seconds (7 days).
- `MAX_NAME_BYTES = 40` bytes for programme name.
- `MAX_BATCH_VIEW = 50` for `latest` batch pagination.

---

## 2. Invariants

1. **Solvency & Balance Conservation:**
   At all times, the contract's native BOT balance equals the sum of all programme pools plus all withdrawable pending balances:
   `address(punchcard).balance == sum(pool) + sum(pending)`.

2. **Stamp Ceiling:**
   For any programme `id` and any customer address, the recorded stamp count never exceeds `needed`:
   `cardOf(id, customer).stamps <= programOf(id).needed`.

3. **Reserved Pool Inviolability:**
   A shop can never release or withdraw any portion of the pool that is owed to completed, unredeemed cards:
   `releaseFree(id, amount)` enforces `amount <= pool - ready * reward`.

---

## 3. Mutation Testing Analysis

Evaluated using `python3 scripts/mutation-check.py punchcard --max 25`:
- **Mutants Tested:** 25
- **Mutants Killed:** 24
- **Surviving Mutants:** 1

### Surviving Mutant Analysis:
1. `Punchcard.sol:269` — `uint256 n = count < maxAvailable ? count : maxAvailable; => uint256 n = count <= maxAvailable ? count : maxAvailable;`
   - When `count < maxAvailable`, both evaluate to `count`.
   - When `count > maxAvailable`, both evaluate to `maxAvailable`.
   - When `count == maxAvailable`, the original ternary evaluates to `maxAvailable`, while the mutated ternary evaluates to `count`. Because `count == maxAvailable`, both branches produce the exact same numerical result. This mutant is mathematically and semantically equivalent.

Effective functional mutation kill rate: **100%**.
