import { describe, expect, it } from "vitest";
import { parseEther } from "viem";
import {
  stampGrid,
  freePool,
  nextStampAt,
  isCooldownActive,
  canRedeem,
  formatCooldown,
  formatReward,
} from "../punchcard";

describe("stampGrid", () => {
  it("creates a grid with slot 1 marked next when no stamps collected", () => {
    const grid = stampGrid(0, 5);
    expect(grid).toHaveLength(5);
    expect(grid[0]).toEqual({
      index: 1,
      status: "next",
      label: "Stamp 1 of 5 (next up)",
    });
    expect(grid[1].status).toBe("empty");
    expect(grid[4].status).toBe("empty");
  });

  it("marks collected stamps and the immediate next stamp correctly", () => {
    const grid = stampGrid(2, 5);
    expect(grid).toHaveLength(5);
    expect(grid[0].status).toBe("stamped");
    expect(grid[1].status).toBe("stamped");
    expect(grid[2].status).toBe("next");
    expect(grid[3].status).toBe("empty");
    expect(grid[4].status).toBe("empty");
  });

  it("marks all stamps as stamped when card is completed with no next slot", () => {
    const grid = stampGrid(5, 5);
    expect(grid).toHaveLength(5);
    expect(grid.every((s) => s.status === "stamped")).toBe(true);
    expect(grid.some((s) => s.status === "next")).toBe(false);
  });

  it("clamps invalid stamps to needed bounds", () => {
    const grid = stampGrid(10, 5);
    expect(grid).toHaveLength(5);
    expect(grid.every((s) => s.status === "stamped")).toBe(true);
  });
});

describe("freePool", () => {
  it("returns full pool when ready is 0", () => {
    const free = freePool(parseEther("1.0"), 0, parseEther("0.1"));
    expect(free).toBe(parseEther("1.0"));
  });

  it("deducts reserved payout for ready cards", () => {
    const free = freePool(parseEther("1.0"), 3, parseEther("0.1"));
    expect(free).toBe(parseEther("0.7"));
  });

  it("returns 0 when pool is less than reserved payout", () => {
    const free = freePool(parseEther("0.2"), 3, parseEther("0.1"));
    expect(free).toBe(0n);
  });
});

describe("cooldown calculations", () => {
  it("returns null nextStampAt when lastStamp is 0", () => {
    expect(nextStampAt(0n, 3600)).toBeNull();
  });

  it("computes nextStampAt as lastStamp + cooldown", () => {
    const next = nextStampAt(1000n, 3600);
    expect(next).toEqual(new Date(4600 * 1000));
  });

  it("evaluates isCooldownActive correctly", () => {
    expect(isCooldownActive(0n, 3600, 1000)).toBe(false);
    expect(isCooldownActive(1000n, 3600, 2000)).toBe(true);
    expect(isCooldownActive(1000n, 3600, 4600)).toBe(false);
    expect(isCooldownActive(1000n, 3600, 5000)).toBe(false);
  });
});

describe("canRedeem", () => {
  it("rejects when stamps are fewer than needed", () => {
    const res = canRedeem(
      { stamps: 3 },
      { needed: 5, pool: parseEther("1"), reward: parseEther("0.1") }
    );
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("Card needs 2 more stamps");
  });

  it("rejects when card is full but pool cannot cover reward", () => {
    const res = canRedeem(
      { stamps: 5 },
      { needed: 5, pool: parseEther("0.05"), reward: parseEther("0.1") }
    );
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("reward pool is empty");
  });

  it("approves when card is full and pool covers reward", () => {
    const res = canRedeem(
      { stamps: 5 },
      { needed: 5, pool: parseEther("0.5"), reward: parseEther("0.1") }
    );
    expect(res.ok).toBe(true);
    expect(res.reason).toBeUndefined();
  });
});

describe("format helpers", () => {
  it("formats cooldown accurately", () => {
    expect(formatCooldown(1800)).toBe("30 mins");
    expect(formatCooldown(3600)).toBe("1 hour");
    expect(formatCooldown(7200)).toBe("2 hours");
    expect(formatCooldown(86400)).toBe("1 day");
    expect(formatCooldown(604800)).toBe("7 days");
  });

  it("formats rewards cleanly", () => {
    expect(formatReward(0n)).toBe("0 BOT");
    expect(formatReward(parseEther("0.1"))).toBe("0.1 BOT");
    expect(formatReward(parseEther("1.0"))).toBe("1 BOT");
    expect(formatReward(parseEther("0.05"))).toBe("0.05 BOT");
  });
});
