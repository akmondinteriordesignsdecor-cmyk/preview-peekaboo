import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, Stat, StatusBadge } from "@/components/Brand";
import { FollowPanel } from "@/components/SocialGate";
import { balancesQ, ledgerQ, purchasesQ, sessionsQ, withdrawalsQ, myNftsQ } from "@/lib/data";
import { ownedMiningPurchase } from "@/lib/commerce";
import { dt, mvt, usd } from "@/lib/format";
import { MiningActivityChart } from "@/components/MiningActivityChart";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Overview — MiningVault Groups" }, { name: "description", content: "Your MiningVault Groups portfolio, mining and referral earnings." }, { property: "og:title", content: "Overview — MiningVault Groups" }, { property: "og:description", content: "Your MiningVault Groups portfolio." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: b, isLoading } = useQuery(balancesQ);
  const { data: sessions, isLoading: sessionsLoading, isError: sessionsError } = useQuery({ ...sessionsQ, refetchInterval: 15_000 });
  const { data: purchases } = useQuery(purchasesQ);
  const { data: mine } = useQuery(myNftsQ);
  const { data: ledger } = useQuery(ledgerQ);
  const { data: wds } = useQuery(withdrawalsQ);
  if (isLoading || !b) return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  const rate = Number(b.mvt_per_usd);
  const minedUsd = (Number(b.mvt_confirmed) + Number(b.mvt_pending)) / rate;
  const portfolio = minedUsd + Number(b.referral_available);
  const active = sessions?.find((s) => s.status === "active" && new Date(s.ends_at) > new Date());
  const today = new Date().toDateString();
  const todayMvt = ledger?.filter((l) => l.account === "mvt" && new Date(l.created_at).toDateString() === today).reduce((a, l) => a + Number(l.amount), 0) ?? 0;
  const pendingWd = wds?.filter((w) => ["requested", "pending_review", "processing"].includes(w.status)).reduce((a, w) => a + Number(w.amount_usd), 0) ?? 0;

  return (
    <div className="space-y-6">
      <FollowPanel compact />
      <div className="panel flex flex-col justify-between gap-4 p-6 shadow-glow md:flex-row md:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Total portfolio balance</p>
          <p className="num mt-1 text-4xl font-bold text-gold">{usd(portfolio)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Mined MVG {usd(minedUsd)} (reference {rate} MVG = $1) + referral balance {usd(b.referral_available)}</p>
        </div>
        <Button variant="gold" asChild><Link to="/referrals">Invite & earn 50%</Link></Button>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Referral available" value={usd(b.referral_available)} tone="gold" hint={`Withdraw from ${usd(b.min_withdrawal_usd)}`} />
        <Stat label="Referral earned" value={usd(b.referral_total)} />
        <Stat label="Pending withdrawals" value={usd(pendingWd)} />
        <Stat label="Withdrawn" value={usd(b.referral_withdrawn)} />
        <Stat label="Available MVG" value={mvt(b.mvt_confirmed)} />
        <Stat label="Mining rewards (pending)" value={mvt(b.mvt_pending)} hint="Unlocks when MVG lists" />
        <Stat label="Rewards today" value={mvt(todayMvt)} />
        <Stat label="Mining" value={active ? "Running" : "Idle"} hint={active ? `Ends ${dt(active.ends_at)}` : ownedMiningPurchase(purchases, mine) ? "Ready to start" : "No mining NFT owned"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="font-semibold">Mining activity · 7 days</h2>
          <MiningActivityChart sessions={sessions ?? []} loading={sessionsLoading} error={sessionsError} />
          <p className="mt-3 text-xs text-muted-foreground">Active NFT: {ownedMiningPurchase(purchases, mine)?.plans?.name ?? "None"}</p>
        </div>
        <div className="panel p-5">
          <h2 className="font-semibold">Recent transactions</h2>
          <div className="mt-3 space-y-2">
            {ledger?.length ? ledger.slice(0, 6).map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <div><p className="capitalize">{l.kind.replace(/_/g, " ")}</p><p className="text-xs text-muted-foreground">{dt(l.created_at)}</p></div>
                <div className="text-right"><p className="num">{l.account === "referral" ? usd(l.amount) : mvt(l.amount)}</p><StatusBadge s={l.status} /></div>
              </div>
            )) : <Empty text="No transactions yet" />}
          </div>
        </div>
      </div>
    </div>
  );
}
