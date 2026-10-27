import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Empty, Stat, StatusBadge } from "@/components/Brand";
import { FollowPanel, useFollows } from "@/components/SocialGate";
import { balancesQ, paymentsQ, settingsQ, whitelistQ } from "@/lib/data";
import { usePay } from "@/lib/usePay";
import { getRate } from "@/lib/paystack.functions";
import { dt, mvt, usd } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/presale")({
  head: () => ({ meta: [{ title: "Buy MVG — MiningVault Groups" }, { name: "description", content: "Buy MVG coin ahead of the Q1 2027 launch." }, { property: "og:title", content: "Buy MVG — MiningVault Groups" }, { property: "og:description", content: "Buy MVG before listing." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Presale,
});

function Presale() {
  const qc = useQueryClient();
  const { data: b } = useQuery(balancesQ);
  const { data: s } = useQuery(settingsQ);
  const { data: pays } = useQuery(paymentsQ);
  const { data: w } = useQuery(whitelistQ);
  const { data: fx } = useQuery({ queryKey: ["fx"], queryFn: () => getRate(), refetchInterval: 300000 });
  const { pay, busy } = usePay();
  const { done: followed } = useFollows();
  const [amt, setAmt] = useState("5");
  const [wallet, setWallet] = useState("");
  useEffect(() => { if (w?.wallet_address) setWallet(w.wallet_address); }, [w]);
  const hasCoins = Number(b?.presale_mvt ?? 0) > 0;
  async function joinWhitelist() {
    const { error } = await supabase.rpc("join_whitelist", { _wallet: wallet });
    if (error) { toast.error(error.message); return; }
    toast.success("You're on the whitelist"); qc.invalidateQueries({ queryKey: ["whitelist"] });
  }
  const rate = Number(s?.mvt_per_usd ?? 50);
  const n = Number(amt);
  const rows = pays?.filter((p) => p.kind === "presale") ?? [];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Buy MVG coin</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Coins purchased" value={mvt(b?.presale_mvt)} tone="gold" hint={usd(Number(b?.presale_mvt ?? 0) / rate)} />
        <Stat label="Presale price" value={`${rate} MVG = $1`} />
        <Stat label="Launch" value={s?.launch_label ?? "Q1 2027"} />
      </div>
      {!followed && <div className="max-w-md"><FollowPanel /></div>}
      <div className="panel max-w-md space-y-3 p-5">
        <label className="text-sm">Amount in USD</label>
        <Input type="number" min={1} step="1" value={amt} onChange={(e) => setAmt(e.target.value)} />
        <p className="text-sm">You get <span className="num text-gold">{mvt(n * rate)}</span> · charged in NGN at today's rate ₦{(fx?.rate ?? Number(s?.usd_to_ngn ?? 0)).toLocaleString()}/$ (≈ ₦{Math.round(n * (1 - Number(s?.purchase_discount_pct ?? 0) / 100) * (fx?.rate ?? 0)).toLocaleString()})</p>
        {Number(s?.purchase_discount_pct ?? 0) > 0 && <p className="text-sm text-gold">{s?.purchase_discount_pct}% discount · Pay {usd(n * (1 - Number(s?.purchase_discount_pct) / 100))}</p>}
        <Button variant="gold" className="w-full" disabled={busy || !(n >= 1) || !followed} title={followed ? undefined : "Follow all our social platforms first"} onClick={() => pay({ kind: "presale", usd: n })}>Buy coin</Button>
        <p className="text-xs text-muted-foreground">Purchased coins are kept separate from your portfolio and delivered at listing. Buying coins also unlocks the launch whitelist.</p>
      </div>
      <div className="panel max-w-md space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Launch whitelist</h2>
          {w && <span className="rounded-full border px-2 py-0.5 text-xs text-success">Whitelisted</span>}
        </div>
        {w ? (
          <p className="text-sm text-success">✓ You're whitelisted since {new Date(w.created_at).toLocaleDateString()}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Buy MVG coins to join the whitelist. Whitelisted members get first access when MVG lists ({s?.launch_label ?? "Q1 2027"}).</p>
        )}
        {hasCoins && (
          <>
            <Input placeholder="Wallet address (optional, can add later)" value={wallet} onChange={(e) => setWallet(e.target.value)} />
            <Button variant="gold" className="w-full" onClick={joinWhitelist}>{w ? "Update wallet" : "Join whitelist"}</Button>
          </>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { t: "P2P", to: "/p2p", d: "Buy and sell MVG directly with other members.", cta: "Open P2P market" },
          { t: "Convert", to: "/convert", d: `Convert your mined MVG (${mvt(b?.mvt_pending)} pending) into tradable coins.`, cta: "Convert coins" },
          { t: "Trade", to: "/trade", d: "Trade MVG on the open market.", cta: "View trading" },
        ].map((x) => (
          <div key={x.t} className="panel space-y-2 p-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold">{x.t}</h2><span className="rounded-full border px-2 py-0.5 text-xs text-primary">Live</span></div>
            <p className="text-sm text-muted-foreground">{x.d}</p>
            <Link to={x.to}><Button variant="outline" className="w-full">{x.cta}</Button></Link>
          </div>
        ))}
      </div>
      <div className="panel p-5">
        <h2 className="font-semibold">Purchase history</h2>
        <div className="mt-3 space-y-2">
          {rows.length ? rows.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-t pt-2 text-sm"><div><p className="num">{mvt(p.mvt_amount)}</p><p className="text-xs text-muted-foreground">{dt(p.created_at)} · {p.reference}</p></div><div className="text-right"><p className="num">{usd(p.amount_usd)}</p><StatusBadge s={p.status} /></div></div>
          )) : <Empty text="No purchases yet" />}
        </div>
      </div>
    </div>
  );
}
