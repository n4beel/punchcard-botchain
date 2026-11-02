# Punchcard

> Collect stamps. Get paid on the last one.

A customer loyalty card application that pays out in real BOT tokens. Built for the BOT Chain ecosystem under **Archetype Z · Card stack**.

## What it is

A shop creates a **loyalty programme** (specifying stamps needed between 2 and 30, payout reward per card in BOT, cooldown duration from 1 hour to 7 days, and an optional opening reward pool). When a customer buys something, the shop applies a stamp to the customer's wallet address.

When the customer reaches the required stamp count, they cash in their full card directly on-chain, resetting their card and receiving the reward into their pending balance via secure pull payments.

## Archetype Z · Card stack

- **Ground**: Cream `#FFF0D6`
- **Ink**: Deep brown `#3B2314`
- **Accent**: Tomato stamp `#E4572E`
- **Wallet Menu**: `--menu-bg #FFFAF0` · `--menu-fg #3B2314` · `--menu-muted #6E4A33` · `--menu-border #D8BFA0` · `--menu-hover-bg #FCE6C4` · `--menu-danger #B3261E`
- **Typography**: Baloo 2 (headings), Spline Sans Mono (stamps, numbers, codes), system UI for body text.

## Features

- **Wallet of Cards**: Vertical stack of loyalty cards where tops peek like a physical phone wallet. Tapping any card lifts it forward to reveal its accessible stamp grid.
- **3D Card Flip**: Shops see their programmes with an interactive 3D back side (200ms flip transition, instant under reduced motion) showing pool balance, reserved pool for unredeemed full cards, free pool available to withdraw, and total cards cashed in.
- **Accessible Stamp Grid**: Every stamp slot has screen-reader aria labels (`aria-label="Stamp 1 of 5: collected"`). Stamped slots are tomato-filled with a checkmark; the next slot pulses.
- **Stamping Counter**: Shop-only workstation with customer address input, quick-select customer chips, live customer card progress, and active cooldown protection.
- **Solvency Invariants**: A shop can never release what completed cards are owed (`pool >= ready * reward`).

## Contract Architecture (`contracts/src/Punchcard.sol`)

### Protocol Limits (from contract constants)
- `MIN_NEEDED`: 2 stamps
- `MAX_NEEDED`: 30 stamps
- `MIN_COOLDOWN`: 3,600 seconds (1 hour)
- `MAX_COOLDOWN`: 604,800 seconds (7 days)
- `MAX_NAME_BYTES`: 40 bytes
- `MAX_BATCH_VIEW`: 50 programmes per page

### Core Methods
- `create(name, needed, reward, cooldown) payable`: Creates a programme.
- `fund(id) payable`: Adds BOT to reward pool.
- `stamp(id, customer)`: Shop stamps customer address if cooldown expired and card not full.
- `redeem(id)`: Customer cashes in full card; resets stamps, credits reward to pending balance.
- `releaseFree(id, amount)`: Shop releases unreserved pool funds to their pending balance.
- `withdraw()`: Pull-payment withdrawal (zero-then-transfer, nonReentrant).
- Views: `programOf`, `cardOf`, `freePool`, `byShop`, `latest`.

## Verification & Testing

- **Foundry**: 18 unit/boundary/fuzz tests + 3 stateful invariant tests (32,768 calls each).
- **Integration**: 4 ABI contract matching tests + 29 on-chain integration tests covering all flows and custom errors against Anvil.
- **Mutation Testing**: 24/25 mutants killed (1 surviving mutant mathematically equivalent).
- **Browser Pass**: Automated Headless Chrome CDP walkthrough at 1280px and 360px verifying all routes, footer links, dropdown contrast, and full on-chain execution with 0 console errors.
