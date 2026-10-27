import { describe, expect, it } from "vitest";
import { currentPurchase, ownedMiningPurchase, discountedPrice, upgradePrice } from "@/lib/commerce";

describe("Commerce rules", () => {
  it("charges Starter $2", () => { expect(upgradePrice(2)).toBe(2); });
  it("charges Pro $5", () => { expect(upgradePrice(5)).toBe(5); });
  it("charges Team $10", () => { expect(upgradePrice(10)).toBe(10); });
  it("charges Starter to Pro the full $5", () => { expect(upgradePrice(5, 2)).toBe(5); });
  it("charges Pro to Team the full $10", () => { expect(upgradePrice(10, 5)).toBe(10); });
  it("charges Starter to Team the full $10", () => { expect(upgradePrice(10, 2)).toBe(10); });
  it("refuses a downgrade", () => { expect(upgradePrice(2, 5)).toBeNull(); });
  it("refuses buying the current tier again", () => { expect(upgradePrice(5, 5)).toBeNull(); });
  it("uses the highest purchased tier regardless of order", () => { expect(currentPurchase([{ plans: { price_usd: 10 } }, { plans: { price_usd: 2 } }])?.plans?.price_usd).toBe(10); });
  it("leaves optional discounts at zero", () => { expect(discountedPrice(25)).toBe(25); });
  it("does not discount mining upgrades", () => { expect(upgradePrice(5, 2, 10)).toBe(5); });
  it("retains Starter and Pro NFTs after an upgrade, mining with Pro", () => {
    const purchases = [{ id: "starter", plans: { price_usd: 2 } }, { id: "pro", plans: { price_usd: 5 } }];
    const owned = [{ plan_purchase_id: "starter" }, { plan_purchase_id: "pro" }];
    expect(ownedMiningPurchase(purchases, owned)?.id).toBe("pro");
    expect(ownedMiningPurchase(purchases, owned.filter((o) => o.plan_purchase_id !== "pro"))?.id).toBe("starter");
  });
  it("stops mining access when the last mining NFT is sold", () => {
    expect(ownedMiningPurchase([{ id: "starter", plans: { price_usd: 2 } }], [])).toBeUndefined();
  });
  it("grants the resale buyer mining access without their own plan purchase", () => {
    expect(ownedMiningPurchase([{ id: "seller-purchase", plans: { price_usd: 5 } }], [{ plan_purchase_id: "seller-purchase" }])?.plans?.price_usd).toBe(5);
  });
  it("ordinary collectible NFTs do not unlock mining", () => {
    expect(ownedMiningPurchase([{ id: "starter", plans: { price_usd: 2 } }], [{ plan_purchase_id: null }])).toBeUndefined();
  });
});