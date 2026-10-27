import { describe, expect, it } from "vitest";
import { miningActivity } from "@/lib/mining-activity";
const now = new Date(2026, 9, 24, 12);
const session = (day: number, start: number, end: number, status = "claimed") => ({ started_at: new Date(2026, 9, day, start).toISOString(), ends_at: new Date(2026, 9, day, end).toISOString(), status });
describe("Elapsed mining activity", () => {
  it("12 hours is half of a full 24-hour day", () => {
    const rows = miningActivity([session(22, 0, 12), session(23, 0, 12), session(23, 12, 24)], now);
    expect(rows[4]?.hours).toBe(12);
    expect(rows[5]?.hours).toBe(24);
  });
  it("splits a 12-hour overnight session across calendar days", () => {
    const rows = miningActivity([session(22, 18, 30)], now);
    expect(rows[4]?.hours).toBe(6);
    expect(rows[5]?.hours).toBe(6);
  });
  it("rises from the start using elapsed time, not scheduled time", () => {
    expect(miningActivity([session(24, 6, 18, "active")], now)[6]?.hours).toBe(6);
    expect(miningActivity([session(24, 6, 18, "active")], new Date(2026, 9, 24, 13))[6]?.hours).toBe(7);
  });
  it("stops counting at the scheduled end", () => {
    expect(miningActivity([session(24, 0, 6, "active")], now)[6]?.hours).toBe(6);
  });
  it("does not double-count overlapping sessions", () => {
    expect(miningActivity([session(23, 0, 12), session(23, 6, 18)], now)[5]?.hours).toBe(18);
  });
  it("omits cancelled sessions with no known cancellation time", () => {
    expect(miningActivity([session(23, 0, 12, "cancelled")], now)[5]?.hours).toBe(0);
  });
  it("counts only time before a recorded cancellation", () => {
    expect(miningActivity([{ ...session(23, 0, 12, "cancelled"), cancelled_at: new Date(2026, 9, 23, 3).toISOString() }], now)[5]?.hours).toBe(3);
  });
});