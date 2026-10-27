import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { startPayment } from "@/lib/paystack.functions";

export function usePay() {
  const fn = useServerFn(startPayment);
  const [busy, setBusy] = useState(false);
  async function pay(input: { kind: "plan" | "presale" | "nft" | "task_nft"; planId?: string; nftId?: string; listingId?: string; usd?: number }) {
    setBusy(true);
    try {
      const r = await fn({ data: { ...input, origin: window.location.origin } });
      window.location.href = r.url;
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }
  return { pay, busy };
}
