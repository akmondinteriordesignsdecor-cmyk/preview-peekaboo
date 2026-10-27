export const WALLETCONNECT_PROJECT_ID = "3ad221de776108c1be9c918dea414578";
export const NFT_RECEIVING_WALLET = "0x037E09668C9474EfAC5dfDB1190eD193920Ea2F5" as const;
export const BNB_USDT = "0x55d398326f99059fF775485246999027B3197955" as const;
export const BNB_RPC = "https://bsc-dataseed.bnbchain.org";
export const REQUIRED_CONFIRMATIONS = 15n;

export function validNftTransfer(input: { token: string; from: string; to: string; amount: bigint; expectedAmount: bigint; wallet: string; blockTime: number; createdAt: number; expiresAt: number; confirmations: bigint }) {
  return input.token.toLowerCase() === BNB_USDT.toLowerCase()
    && input.from.toLowerCase() === input.wallet.toLowerCase()
    && input.to.toLowerCase() === NFT_RECEIVING_WALLET.toLowerCase()
    && input.amount === input.expectedAmount
    && input.blockTime >= input.createdAt && input.blockTime <= input.expiresAt
    && input.confirmations >= REQUIRED_CONFIRMATIONS;
}