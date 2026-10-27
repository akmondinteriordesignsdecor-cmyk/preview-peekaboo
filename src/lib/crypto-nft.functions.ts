import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient, http, parseUnits, decodeEventLog, erc20Abi } from "viem";
import { bsc } from "viem/chains";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BNB_RPC, REQUIRED_CONFIRMATIONS, validNftTransfer } from "@/lib/crypto-nft";

export const prepareCryptoNft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ nftId: z.string().uuid(), wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: quote, error } = await supabaseAdmin.rpc("prepare_crypto_nft_checkout", { _user: context.userId, _nft: data.nftId, _wallet: data.wallet });
    if (error) throw new Error(error.message);
    return quote as unknown as { id: string; amount: number; expires_at: string };
  });

export const verifyCryptoNft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: checkout, error } = await context.supabase.from("crypto_nft_checkouts").select("*, payments(quote_expires_at)").eq("id", data.id).eq("user_id", context.userId).single();
    if (error || !checkout) throw new Error("Checkout not found");
    if (checkout.status === "success") {
      if (checkout.tx_hash !== data.hash.toLowerCase()) throw new Error("Checkout already settled");
      return { status: "success" };
    }
    const client = createPublicClient({ chain: bsc, transport: http(BNB_RPC, { timeout: 12000, retryCount: 1 }) });
    const hash = data.hash as `0x${string}`;
    let receipt;
    try { receipt = await client.getTransactionReceipt({ hash }); }
    catch { return { status: "pending" }; }
    if (receipt.status !== "success") throw new Error("Wallet transaction failed");
    const [block, latest] = await Promise.all([client.getBlock({ blockNumber: receipt.blockNumber }), client.getBlockNumber()]);
    const confirmations = latest - receipt.blockNumber + 1n;
    if (confirmations < REQUIRED_CONFIRMATIONS) return { status: "pending" };
    const expires = checkout.payments?.quote_expires_at;
    if (!expires) throw new Error("Invalid checkout expiry");
    const valid = receipt.logs.some((log) => {
      try {
        const event = decodeEventLog({ abi: erc20Abi, data: log.data, topics: log.topics, eventName: "Transfer" });
        return validNftTransfer({ token: log.address, from: event.args.from, to: event.args.to, amount: event.args.value,
          expectedAmount: parseUnits(String(checkout.amount_usdt), 18), wallet: checkout.wallet_address,
          blockTime: Number(block.timestamp) * 1000, createdAt: Date.parse(checkout.created_at), expiresAt: Date.parse(expires), confirmations });
      } catch { return false; }
    });
    if (!valid) throw new Error("Transaction does not match this USDT checkout");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: status, error: settlementError } = await supabaseAdmin.rpc("settle_crypto_nft_verified", { _id: data.id, _user: context.userId, _hash: data.hash });
    if (settlementError) throw new Error(settlementError.message);
    return { status: status === "ok" || status === "already" ? "success" : String(status) };
  });