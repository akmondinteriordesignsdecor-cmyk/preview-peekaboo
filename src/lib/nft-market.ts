export const NFT_GROUPS = [
  { id: "starter", label: "Starter NFTs" },
  { id: "pro", label: "Pro NFTs" },
  { id: "team", label: "Team NFTs" },
  { id: "mining", label: "Other mining NFTs" },
  { id: "collectibles", label: "Collectible NFTs" },
] as const;

// Resale bounds per mining tier, in USD, converted to MVG at the current rate.
// Mirrors the server-side check in nft_market_action — keep both in sync.
export function listingBoundsMvg(planPriceUsd: number | null | undefined, mvtPerUsd: number): { min: number; max: number } | null {
  if (!planPriceUsd) return null;
  const maxUsd = planPriceUsd <= 2 ? 100 : planPriceUsd <= 5 ? 500 : 1000;
  return { min: planPriceUsd * mvtPerUsd, max: maxUsd * mvtPerUsd };
}

export type NftGroup = (typeof NFT_GROUPS)[number]["id"];
export type ListingSort = "newest" | "low" | "high";
export type MarketListing = {
  id: string; nft_id: string; ownership_id: string; seller_id: string;
  price_mvg: number; status: string; created_at: string;
  nfts: { name: string; active: boolean; mining_plan_id: string | null;
    plans: { name: string } | null } | null;
};

export function nftGroup(nft: MarketListing["nfts"]): NftGroup {
  if (!nft?.mining_plan_id) return "collectibles";
  const name = nft.plans?.name.trim().toLowerCase() ?? "";
  if (/^starter(?:\s|$)/.test(name)) return "starter";
  if (/^pro(?:\s|$)/.test(name)) return "pro";
  if (/^team(?:\s|$)/.test(name)) return "team";
  return "mining";
}

export function filterNftListings<T extends MarketListing>(listings: T[], filters: {
  userId: string | undefined; search: string; sort: ListingSort; min: string; max: string;
}): T[] {
  const term = filters.search.trim().replace(/^#/, "").toLowerCase();
  return listings.filter((listing) => {
    if (listing.status !== "open" || !listing.nfts?.active) return false;
    if (filters.min.trim() && Number(listing.price_mvg) < Number(filters.min)) return false;
    if (filters.max.trim() && Number(listing.price_mvg) > Number(filters.max)) return false;
    return !term || [listing.nfts.name, listing.nfts.plans?.name ?? "", listing.ownership_id, listing.nft_id, listing.id]
      .some((value) => value.toLowerCase().includes(term));
  }).sort((a, b) => {
    const ownOrder = Number(b.seller_id === filters.userId) - Number(a.seller_id === filters.userId);
    if (ownOrder) return ownOrder;
    const priceOrder = filters.sort === "low" ? Number(a.price_mvg) - Number(b.price_mvg)
      : filters.sort === "high" ? Number(b.price_mvg) - Number(a.price_mvg) : 0;
    return priceOrder || b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id);
  });
}