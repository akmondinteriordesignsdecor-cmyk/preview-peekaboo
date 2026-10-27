import { describe, expect, it } from "vitest";
import { isAfricanCountry } from "@/lib/region";
import { listingBoundsMvg } from "@/lib/nft-market";

describe("isAfricanCountry", () => {
  it("treats Nigeria and other African codes as African", () => {
    expect(isAfricanCountry("NG")).toBe(true);
    expect(isAfricanCountry("gh")).toBe(true);
    expect(isAfricanCountry("ZA")).toBe(true);
  });
  it("treats non-African, unknown and missing codes as not African", () => {
    expect(isAfricanCountry("US")).toBe(false);
    expect(isAfricanCountry("GB")).toBe(false);
    expect(isAfricanCountry(null)).toBe(false);
    expect(isAfricanCountry(undefined)).toBe(false);
    expect(isAfricanCountry("")).toBe(false);
  });
});

describe("listingBoundsMvg", () => {
  const rate = 50; // MVG per USD
  it("Starter ($2) lists between $2 and $100 worth of MVG", () => {
    expect(listingBoundsMvg(2, rate)).toEqual({ min: 100, max: 5000 });
  });
  it("Pro ($5) lists between $5 and $500 worth of MVG", () => {
    expect(listingBoundsMvg(5, rate)).toEqual({ min: 250, max: 25000 });
  });
  it("Team ($10) lists between $10 and $1,000 worth of MVG", () => {
    expect(listingBoundsMvg(10, rate)).toEqual({ min: 500, max: 50000 });
  });
  it("higher-priced mining NFTs cap at $1,000 worth of MVG", () => {
    expect(listingBoundsMvg(25, rate)).toEqual({ min: 1250, max: 50000 });
  });
  it("collectibles without a plan have no fixed bounds", () => {
    expect(listingBoundsMvg(null, rate)).toBeNull();
    expect(listingBoundsMvg(undefined, rate)).toBeNull();
  });
});
