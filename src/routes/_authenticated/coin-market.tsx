import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Empty, StatusBadge } from "@/components/Brand";
import { MarketTabs } from "@/components/MarketTabs";
import { p2pListingsQ, p2pOrdersQ, profileQ } from "@/lib/data";
import { dt, mvt, usd } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/coin-market")({
  head: () => ({ meta: [{ title: "Coin market — MiningVault Groups" }, { name: "description", content: "Buy MVG coins listed by other members." }, { property: "og:title", content: "Coin market — MiningVault Groups" }, { property: "og:description", content: "Buy MVG coins listed by other members." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: CoinMarket,
});

function CoinMarket() {
  const qc = useQueryClient();
  const { data: me } = useQuery(profileQ);
  const { data: listings } = useQuery(p2pListingsQ);
  const { data: orders } = useQuery(p2pOrdersQ);
  const open = (listings?.filter((l) => l.status === "open" && l.source_account === "presale_mvt") ?? [])
    .sort((a, b) => Number(b.user_id === me?.id) - Number(a.user_id === me?.id));
  const mine = listings?.filter((l) => l.user_id === me?.id) ?? [];

  async function fill(id: string) {
    const { error } = await supabase.rpc("fill_p2p_order", { _listing: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Order filled — coins added to your balance");
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Coin market</h1>
        <MarketTabs active="coins" />
      </div>
      <p className="text-sm text-muted-foreground">MVG coins listed for sale by other members. To sell your own purchased coins, list them from the <Link to="/p2p" className="text-primary underline">P2P market</Link> — they will appear here.</p>

      <div className="panel p-5">
        <h2 className="font-semibold">Coins for sale</h2>
        <div className="mt-3 space-y-2">
          {open.length ? open.map((l) => (
            <div key={l.id} className="flex items-center justify-between border-t pt-2 text-sm">
              <div>
                <p className="num">{mvt(l.mvt_amount)} <span className="text-muted-foreground">for</span> {usd(l.price_usd)}</p>
                <p className="text-xs text-muted-foreground">{dt(l.created_at)} · ${(Number(l.price_usd) / Number(l.mvt_amount)).toFixed(4)}/MVG</p>
              </div>
              {l.user_id === me?.id
                ? <span className="text-xs text-muted-foreground">Your listing</span>
                : <Button size="sm" variant="gold" onClick={() => fill(l.id)}>Buy</Button>}
            </div>
          )) : <Empty text="No coins listed yet" />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="font-semibold">My listings</h2>
          <div className="mt-3 space-y-2">
            {mine.length ? mine.map((l) => (
              <div key={l.id} className="flex items-center justify-between border-t pt-2 text-sm">
                <div><p className="num">{mvt(l.mvt_amount)} · {usd(l.price_usd)}</p><p className="text-xs text-muted-foreground">{dt(l.created_at)}</p></div>
                <StatusBadge s={l.status} />
              </div>
            )) : <Empty text="You have no listings" />}
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="font-semibold">My orders</h2>
          <div className="mt-3 space-y-2">
            {orders?.length ? orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between border-t pt-2 text-sm">
                <div><p className="num">{mvt(o.mvt_amount)} · {usd(o.price_usd)}</p><p className="text-xs text-muted-foreground">{dt(o.created_at)}</p></div>
                <StatusBadge s={o.status} />
              </div>
            )) : <Empty text="No orders yet" />}
          </div>
        </div>
      </div>
    </div>
  );
}
