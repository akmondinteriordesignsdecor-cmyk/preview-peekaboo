import { describe, expect, it } from "vitest";
import { miningSaleReward } from "@/lib/task-nfts";
import { validNftTransfer, BNB_USDT, NFT_RECEIVING_WALLET } from "@/lib/crypto-nft";

describe("Admin configured NFT mining rewards", () => {
  it("awards 30 for a $5 sale when the admin chooses 30", () => expect(miningSaleReward(5, 30)).toBe(30));
  it("awards 50 for a $5 sale when the admin chooses 50", () => expect(miningSaleReward(5, 50)).toBe(50));
  it("scales to the completed sale amount", () => expect(miningSaleReward(10, 30)).toBe(60));
  it("does not invent a reward before the admin configures it", () => expect(miningSaleReward(5, 0)).toBe(0));
});
const transfer = { token: BNB_USDT, from: "0x1111111111111111111111111111111111111111", wallet: "0x1111111111111111111111111111111111111111", to: NFT_RECEIVING_WALLET, amount: 5n * 10n ** 18n, expectedAmount: 5n * 10n ** 18n, blockTime: 2000, createdAt: 1000, expiresAt: 3000, confirmations: 15n };
describe("BNB Chain USDT NFT verification", () => {
  it("accepts the confirmed quoted USDT transfer", () => expect(validNftTransfer(transfer)).toBe(true));
  it("rejects another receiving wallet", () => expect(validNftTransfer({ ...transfer, to: transfer.wallet })).toBe(false));
  it("rejects another token", () => expect(validNftTransfer({ ...transfer, token: transfer.wallet })).toBe(false));
  it("rejects an incorrect amount", () => expect(validNftTransfer({ ...transfer, amount: 1n })).toBe(false));
  it("rejects a transfer from another wallet", () => expect(validNftTransfer({ ...transfer, from: NFT_RECEIVING_WALLET })).toBe(false));
  it("rejects historical payments", () => expect(validNftTransfer({ ...transfer, blockTime: 999 })).toBe(false));
  it("waits for 15 confirmations", () => expect(validNftTransfer({ ...transfer, confirmations: 14n })).toBe(false));
});