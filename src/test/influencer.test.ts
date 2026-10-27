import { describe, expect, it } from "vitest";
import { suggestedPay } from "@/lib/influencer";

describe("influencer pay tiers", () => {
  it("under 5,000 views earns nothing", () => expect(suggestedPay(4_999)).toBe(0));
  it("5,000–10,000 views earns $100", () => expect(suggestedPay(7_000)).toBe(100));
  it("10,000–20,000 views earns $150", () => expect(suggestedPay(15_000)).toBe(150));
  it("20,000–50,000 views earns $200", () => expect(suggestedPay(30_000)).toBe(200));
  it("50,000–300,000 views earns $300", () => expect(suggestedPay(300_000)).toBe(300));
});
