import { describe, expect, it } from "vitest";
import { filterNftListings, nftGroup, type MarketListing } from "@/lib/nft-market";

const listing = (id: string, plan: string | null, price = 1, seller = "other"): MarketListing => ({
  id, nft_id: `collection-${id}`, ownership_id: `instance-${id}`, seller_id: seller,
  price_mvg: price, status: "open", created_at: "2026-10-24T00:00:00Z",
  nfts: { name: "Mining NFT", active: true, mining_plan_id: plan ? `plan-${plan}` : null,
    plans: plan ? { name: plan } : null },
});
const defaults = { userId: "me", search: "", sort: "newest" as const, min: "", max: "" };

describe("NFT marketplace discovery", () => {
  for (const [plan, group] of [["Starter", "starter"], ["Pro", "pro"], ["Team", "team"]] as const) {
    it(`puts ${plan} listings in the ${group} group regardless of resale price`, () => {
      expect(nftGroup(listing("a", plan, 99).nfts)).toBe(group);
    });
  }
  it("keeps non-mining collectibles separate", () => {
    expect(nftGroup(listing("a", null).nfts)).toBe("collectibles");
  });
  it("does not misclassify an unknown mining plan as a collectible", () => {
    expect(nftGroup(listing("a", "Legacy").nfts)).toBe("mining");
  });
  for (const sort of ["newest", "low", "high"] as const) {
    it(`puts the user's NFT first in each plan group with ${sort} sorting`, () => {
      for (const plan of ["Starter", "Pro", "Team"]) {
        const rows = [listing("cheap", plan, 1), listing("own", plan, 5, "me"), listing("expensive", plan, 10)];
        expect(filterNftListings(rows, { ...defaults, sort })[0]?.id).toBe("own");
      }
    });
  }
  it("sorts other members' listings cheapest first", () => {
    expect(filterNftListings([listing("b", "Pro", 10), listing("a", "Pro", 2)], { ...defaults, sort: "low" }).map((l) => l.id)).toEqual(["a", "b"]);
  });
  it("sorts other members' listings most expensive first", () => {
    expect(filterNftListings([listing("a", "Pro", 2), listing("b", "Pro", 10)], { ...defaults, sort: "high" }).map((l) => l.id)).toEqual(["b", "a"]);
  });
  it("finds an individual NFT by its ownership ID", () => {
    expect(filterNftListings([listing("a", "Starter"), listing("b", "Starter")], { ...defaults, search: "#INSTANCE-B" }).map((l) => l.id)).toEqual(["b"]);
  });
  it("finds a listing or collection ID and a plan name", () => {
    const rows = [listing("a", "Pro"), listing("b", "Team")];
    for (const search of ["collection-b", "b", "Team"]) expect(filterNftListings(rows, { ...defaults, search }).map((l) => l.id)).toEqual(["b"]);
  });
  it("restricts results to the inclusive MVG price range", () => {
    expect(filterNftListings([listing("a", "Pro", 1), listing("b", "Pro", 5), listing("c", "Pro", 10)], { ...defaults, min: "5", max: "10" }).map((l) => l.id)).toEqual(["b", "c"]);
  });
  it("excludes cancelled and inactive listings", () => {
    const cancelled = { ...listing("a", "Pro"), status: "cancelled" };
    const inactive = listing("b", "Pro");
    if (inactive.nfts) inactive.nfts.active = false;
    expect(filterNftListings([cancelled, inactive], defaults)).toEqual([]);
  });
});