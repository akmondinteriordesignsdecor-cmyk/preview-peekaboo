import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { verifyPayment } from "@/lib/paystack.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/payment-callback")({
  validateSearch: z.object({ reference: z.string().optional(), trxref: z.string().optional() }),
  head: () => ({ meta: [{ title: "Confirming payment — MiningVault Groups" }, { name: "description", content: "Verifying your Paystack payment." }, { property: "og:title", content: "Confirming payment — MiningVault Groups" }, { property: "og:description", content: "Verifying your Paystack payment." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Callback,
});

function Callback() {
  const { reference, trxref } = Route.useSearch();
  const ref = reference ?? trxref;
  const verify = useServerFn(verifyPayment);
  const qc = useQueryClient();
  const [state, setState] = useState<{ status: string; kind?: string } | null>(null);
  useEffect(() => {
    if (!ref) return setState({ status: "missing" });
    verify({ data: { reference: ref } }).then((r) => { setState(r); qc.invalidateQueries(); }).catch((e) => setState({ status: (e as Error).message }));
  }, [ref]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="panel mx-auto max-w-md p-8 text-center">
      {!state ? <p>Confirming your payment with Paystack…</p> : state.status === "success" ? (
        <>
          <h1 className="text-2xl font-semibold text-gold">Payment confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">{state.kind === "task_nft" ? "Your task NFT is in your collection. The seller's proceeds and mining reward have been credited." : state.kind === "plan" ? "Your mining NFT is in your collection. Its mining access is ready." : state.kind === "nft" ? "Your NFT is now in your collection." : "MVG has been added to your coin purchase balance."}</p>
          <Button variant="gold" className="mt-6" asChild><Link to={state.kind === "task_nft" ? "/nft-tasks" : state.kind === "plan" ? "/mining" : state.kind === "nft" ? "/nfts" : "/presale"}>Continue</Link></Button>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">Payment not confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">{state.status === "needs_review" ? "Your payment was received, but needs an admin review before activation. Please contact support." : `Status: ${state.status}. If charged, please contact support with your payment reference.`}</p>
          <Button variant="outline" className="mt-6" asChild><Link to="/dashboard">Back to overview</Link></Button>
        </>
      )}
    </div>
  );
}
