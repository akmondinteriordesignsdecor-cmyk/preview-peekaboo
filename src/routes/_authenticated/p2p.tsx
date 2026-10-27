import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Empty, Stat, StatusBadge } from "@/components/Brand";
import { ListingAlertToggle } from "@/components/ListingAlert";
import { p2pListingsQ, p2pOrdersQ, profileQ, tradableQ, balancesQ } from "@/lib/data";
import { dt, mvt, usd } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/p2p")({
  head: () => ({ meta: [{ title: "P2P market — MiningVault Groups" }, { name: "description", content: "Buy and sell MVG directly with other members." }, { property: "og:title", content: "P2P market — MiningVault Groups" }, { property: "og:description", content: "Buy and sell MVG directly with other members." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: P2P,
});

function P2P() {
  const qc = useQueryClient();
  const { data: me } = useQuery(profileQ);
  const { data: listings } = useQuery(p2pListingsQ);
  const { data: orders } = useQuery(p2pOrdersQ);
  const { data: t } = useQuery(tradableQ);
  const { data: balances } = useQuery(balancesQ);
  const [source, setSource] = useState("presale_mvt");
  const [f, setF] = useState({ mvt: "", price: "" });
  const [busy, setBusy] = useState(false);
  const open = listings?.filter((l) => l.status === "open") ?? [];
  const mine = listings?.filter((l) => l.user_id === me?.id) ?? [];

  async function create() {
    setBusy(true);
    const { error } = source === "presale_mvt" ? await supabase.rpc("list_purchased_coins", { _amount: Number(f.mvt), _price: Number(f.price) }) : await supabase.rpc("create_p2p_listing", { _side: "sell", _mvt: Number(f.mvt), _price: Number(f.price) });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Listing posted");
    setF({ mvt: "", price: "" });
    qc.invalidateQueries();
  }
  async function fill(id: string) {
    const { error } = await supabase.rpc("fill_p2p_order", { _listing: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Order filled — coins added to your balance");
    qc.invalidateQueries();
  }
  async function cancel(id: string) {
    const { error } = await supabase.rpc("cancel_p2p_listing", { _id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Listing cancelled, coins returned");
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">P2P market</h1>
      <p className="text-sm text-muted-foreground">Buy and sell purchased or tradable MVG. Purchases use your withdrawable USD balance.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Stat label="Your tradable MVG" value={mvt(t?.tradable)} tone="gold" />
        <Stat label="In escrow" value={mvt(t?.escrow)} hint="Locked in your open listings" />
      </div>

      <div className="panel max-w-md space-y-3 p-5">
        <h2 className="font-semibold">Sell MVG</h2>
        <div className="flex gap-2"><Button size="sm" variant={source === "presale_mvt" ? "gold" : "outline"} onClick={() => setSource("presale_mvt")}>Purchased</Button><Button size="sm" variant={source === "tradable_mvt" ? "gold" : "outline"} onClick={() => setSource("tradable_mvt")}>Tradable</Button></div>
        <p className="text-sm text-muted-foreground">Available: {mvt(source === "presale_mvt" ? balances?.presale_mvt : t?.tradable)}</p>
        <div><Label>Amount (MVG)</Label><Input type="number" min={1} value={f.mvt} onChange={(e) => setF({ ...f, mvt: e.target.value })} /></div>
        <div><Label>Total price (USD)</Label><Input type="number" min={0.01} step="0.01" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
        {Number(f.mvt) > 0 && Number(f.price) > 0 && <p className="text-xs text-muted-foreground">≈ ${(Number(f.price) / Number(f.mvt)).toFixed(4)} per MVG</p>}
        <Button variant="gold" className="w-full" disabled={busy || !(Number(f.mvt) > 0) || !(Number(f.price) > 0)} onClick={create}>Post sell listing</Button>
        <p className="text-xs text-muted-foreground">Your coins are held in escrow until the listing fills or you cancel.</p>
      </div>

      <div className="panel p-5">
        <h2 className="font-semibold">Open listings</h2>
        <div className="mt-3 space-y-2">
          {open.length ? open.map((l) => (
            <div key={l.id} className="flex items-center justify-between border-t pt-2 text-sm">
              <div>
                <p className="num">{mvt(l.mvt_amount)} <span className="text-muted-foreground">for</span> {usd(l.price_usd)}</p>
                <p className="text-xs text-muted-foreground">{dt(l.created_at)} · ${(Number(l.price_usd) / Number(l.mvt_amount)).toFixed(4)}/MVG</p>
              </div>
              {l.user_id === me?.id
                ? <Button size="sm" variant="ghost" onClick={() => cancel(l.id)}>Cancel</Button>
                : <Button size="sm" variant="gold" onClick={() => fill(l.id)}>Buy</Button>}
            </div>
          )) : <Empty text="No open listings yet — be the first to sell" />}
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
      <div className="max-w-md"><ListingAlertToggle /></div>
    </div>
  );
}
