export function upgradePrice(target: number, current = 0, discount = 0) {
  if (target <= current) return null;
  // Mining NFTs always cost the full target price, regardless of prior payments or discounts.
  void discount;
  return Math.round(target * 100) / 100;
}

export function discountedPrice(price: number, discount = 0, globalDiscount = 0) {
  return Math.round(price * (1 - discount / 100) * (1 - globalDiscount / 100) * 100) / 100;
}

export function currentPurchase<T extends { plans: { price_usd: number } | null }>(purchases: T[] | undefined) {
  return purchases?.reduce<T | undefined>((best, item) => !best || Number(item.plans?.price_usd ?? 0) > Number(best.plans?.price_usd ?? 0) ? item : best, undefined);
}

export function ownedMiningPurchase<T extends { id: string; plans: { price_usd: number } | null }>(purchases: T[] | undefined, ownerships: { plan_purchase_id: string | null }[] | undefined) {
  const owned = new Set(ownerships?.map((o) => o.plan_purchase_id).filter((id) => id !== null));
  return currentPurchase(purchases?.filter((p) => owned.has(p.id)));
}