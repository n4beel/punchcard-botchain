/**
 * Contract limits for Punchcard.
 * Kept strictly in sync with contracts/src/Punchcard.sol.
 */
export const MIN_NEEDED = 2;
export const MAX_NEEDED = 30;
export const MIN_COOLDOWN = 3600;   // 1 hour in seconds
export const MAX_COOLDOWN = 604800; // 7 days in seconds
export const MAX_NAME_BYTES = 40;
export const MAX_BATCH_VIEW = 50;
