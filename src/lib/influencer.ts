export const INFLUENCER_TIERS = [
  { min: 5_000, max: 10_000, usd: 100 },
  { min: 10_000, max: 20_000, usd: 150 },
  { min: 20_000, max: 50_000, usd: 200 },
  { min: 50_000, max: 300_000, usd: 300 },
] as const;

/** Suggested pay for a view count (admin sets the final amount). Boundary views go to the higher tier. */
export function suggestedPay(views: number): number {
  let pay = 0;
  for (const t of INFLUENCER_TIERS) if (views >= t.min && views <= t.max) pay = t.usd;
  return pay;
}
