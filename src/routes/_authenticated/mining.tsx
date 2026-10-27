import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MiningNetwork } from "@/components/MiningNetwork";
import { MiningNftTimeline } from "@/components/MiningNftTimeline";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Empty, StatusBadge } from "@/components/Brand";
import { FollowPanel, useFollows } from "@/components/SocialGate";
import { plansQ, purchasesQ, sessionsQ, paymentsQ, myNftsQ } from "@/lib/data";
import { usePay } from "@/lib/usePay";
import { ownedMiningPurchase, upgradePrice } from "@/lib/commerce";
import nftStarter from "@/assets/nft-starter.png.asset.json";
import nftPro from "@/assets/nft-pro.png.asset.json";
import nftTeam from "@/assets/nft-team.png.asset.json";

const PLAN_IMAGES: Record<number, string> = { 1: nftStarter.url, 2: nftPro.url, 3: nftTeam.url };
import { dt, mvt, usd } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/mining")({
  head: () => ({ meta: [{ title: "NFT mining — MiningVault Groups" }, { name: "description", content: "Own a Starter NFT, Pro NFT or Team NFT to mine MVG." }, { property: "og:title", content: "NFT mining — MiningVault Groups" }, { property: "og:description", content: "Collect mining NFTs with transferable MVG mining access." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Mining,
});

function useNow() {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), 1000); return () => clearInterval(t); }, []);
  return n;
}

function Mining() {
  const qc = useQueryClient();
  const now = useNow();
  const { data: plans } = useQuery(plansQ);
  const { data: purchases } = useQuery(purchasesQ);
  const { data: mine } = useQuery(myNftsQ);
  const { data: payments } = useQuery(paymentsQ);
  const { data: sessions } = useQuery(sessionsQ);
  const { pay, busy: paying } = usePay();
  const { done: followed } = useFollows();
  const [busy, setBusy] = useState(false);

  const current = sessions?.find((s) => s.status === "active" || s.status === "completed");
  const running = current && new Date(current.ends_at).getTime() > now;
  const plan = ownedMiningPurchase(purchases, mine)?.plans;
  const totalPaid = payments?.filter((p) => p.kind === "plan" && p.status === "success").reduce((sum, p) => sum + Number(p.amount_usd), 0) ?? 0;
  const start = current ? new Date(current.started_at).getTime() : 0;
  const end = current ? new Date(current.ends_at).getTime() : 0;
  const pct = current ? Math.min(100, ((now - start) / (end - start)) * 100) : 0;
  const left = Math.max(0, end - now);
  const hms = [Math.floor(left / 3.6e6), Math.floor((left % 3.6e6) / 6e4), Math.floor((left % 6e4) / 1000)].map((x) => String(x).padStart(2, "0")).join(":");

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(ok); qc.invalidateQueries();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6"><MiningNetwork active={!!running} /></div>
        <div className="panel space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Mining power</h1>
            <StatusBadge s={running ? "active" : current ? "completed" : "idle"} />
          </div>
          <p className="text-sm text-muted-foreground">Plan: <span className="text-foreground">{plan ? `${plan.name} · ${plan.capacity_ths} TH/s (illustrative)` : "No plan active"}</span></p>
          <p className="text-sm text-muted-foreground">Verified hashrate: not connected to a mining provider yet.</p>
          {current && (
            <>
              <p className="num text-4xl font-bold text-gold">{hms}</p>
              <Progress value={pct} />
              <div className="grid grid-cols-2 text-xs text-muted-foreground"><span>Start {dt(current.started_at)}</span><span className="text-right">End {dt(current.ends_at)}</span></div>
              <p className="text-sm">Estimated reward: <span className="num">{mvt(purchases?.find((p) => p.id === current.purchase_id)?.plans?.mvt_per_session ?? plan?.mvt_per_session)}</span> <span className="text-xs text-muted-foreground">(estimate)</span></p>
            </>
          )}
          {!plan ? <p className="text-sm">Purchase a mining NFT below to start mining.</p>
            : current && !running ? <Button variant="gold" disabled={busy} onClick={() => run(() => supabase.rpc("claim_mining", { _session: current.id }), "Reward recorded")}>Claim reward</Button>
            : !running ? <Button variant="gold" disabled={busy} onClick={() => run(() => supabase.rpc("start_mining"), "Mining started")}>Start 12-hour session</Button>
            : <Button disabled>Mining in progress</Button>}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xl font-semibold">NFT mining plans</h2>
        <p className="mb-3 text-sm text-muted-foreground">Total paid for mining plans: <span className="num text-gold">{usd(totalPaid)}</span></p>
        {!followed && <div className="mb-4"><FollowPanel /></div>}
        <div className="grid gap-4 md:grid-cols-3">
          {plans?.map((p) => {
            const price = upgradePrice(Number(p.price_usd), Number(plan?.price_usd ?? 0));
            return (
            <div key={p.id} className="panel flex flex-col p-5">
              <img src={PLAN_IMAGES[p.sort] ?? nftTeam.url} alt={p.name} width={768} height={768} loading="lazy" className="mb-4 aspect-square w-full max-w-40 self-center rounded-md object-contain" />
              <h3 className="font-semibold">{p.name}</h3>
              <p className="num mt-2 text-3xl font-bold text-gold">{usd(price ?? p.price_usd)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.capacity_ths} TH/s illustrative · {mvt(p.mvt_per_session)} per 12h session</p>
              <Button variant="outline" className="mt-4" disabled={paying || !followed || price === null} title={followed ? undefined : "Follow all our social platforms first"} onClick={() => pay({ kind: "plan", planId: p.id })}>{price === null ? "Owned tier" : plan ? `Upgrade · ${usd(p.price_usd)}` : "Buy NFT mining plan"}</Button>
            </div>
          ); })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Each NFT costs its full price, including upgrades. Previous payments are not deducted. Rewards are not guaranteed and stay pending until MVG lists.</p>
      </div>

      <MiningNftTimeline />

      <div className="panel p-5">
        <h2 className="font-semibold">Session history</h2>
        <div className="mt-3 overflow-x-auto">
          {sessions?.length ? (
            <table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Started</th><th>Ends</th><th>Plan</th><th>Reward</th><th>Status</th></tr></thead>
              <tbody>{sessions.map((s) => (
                <tr key={s.id} className="border-t"><td className="py-2">{dt(s.started_at)}</td><td>{dt(s.ends_at)}</td><td>{s.plan_purchases?.plans?.name ?? plan?.name}</td><td className="num">{s.reward_mvt ? mvt(s.reward_mvt) : "—"}</td><td><StatusBadge s={s.status} /></td></tr>
              ))}</tbody></table>
          ) : <Empty text="No mining sessions yet" />}
        </div>
      </div>
    </div>
  );
}
