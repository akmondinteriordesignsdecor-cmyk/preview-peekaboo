import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TaskNftMedia } from "@/components/TaskNftMedia";
import { MarketTabs } from "@/components/MarketTabs";
import { supabase } from "@/integrations/supabase/client";
import { tasksQ, submissionsQ, taskCollectionQ, taskListingsQ, taskOrdersQ, taskRpc, miningSaleReward } from "@/lib/task-nfts";
import { profileQ, settingsQ } from "@/lib/data";
import { usePay } from "@/lib/usePay";
import { usd, mvt, dt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/nft-tasks")({
  head: () => ({ meta: [{ title: "NFT tasks & earned collectibles — MiningVault Groups" }, { name: "description", content: "Complete approved tasks, collect multiple NFTs and receive mining MVG rewards on verified sales." }, { property: "og:title", content: "NFT tasks & earned collectibles — MiningVault Groups" }, { property: "og:description", content: "Admin-approved NFT tasks, collectible sales and mining rewards." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(tasksQ), context.queryClient.ensureQueryData(taskCollectionQ), context.queryClient.ensureQueryData(taskListingsQ)]); },
  component: TaskNfts,
});
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
function TaskNfts() {
  const qc = useQueryClient();
  const { data: tasks } = useSuspenseQuery(tasksQ);
  const { data: collection } = useSuspenseQuery(taskCollectionQ);
  const { data: listings } = useSuspenseQuery(taskListingsQ);
  const { data: submissions } = useQuery(submissionsQ);
  const { data: orders } = useQuery(taskOrdersQ);
  const { data: me } = useQuery(profileQ);
  const { data: settings } = useQuery(settingsQ);
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const { pay, busy: paying } = usePay();
  const rate = Number(settings?.task_sale_mvg_per_five_usd ?? 0);
  const sales = orders?.filter((o) => o.seller_id === me?.id && o.status === "success") ?? [];
  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true); try { await action(); toast.success(message); await qc.invalidateQueries(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">NFT tasks</h1><MarketTabs active="tasks" /></div>
    <div className="grid grid-cols-2 gap-4 border-y py-5 lg:grid-cols-4">
      <div><p className="text-xs text-muted-foreground">Task NFTs owned</p><p className="num mt-1 text-xl">{collection.length}</p></div>
      <div><p className="text-xs text-muted-foreground">Mining reward / $5 sold</p><p className="num mt-1 text-xl">{mvt(rate)}</p></div>
      <div><p className="text-xs text-muted-foreground">Sale proceeds earned</p><p className="num mt-1 text-xl">{usd(sales.reduce((v, o) => v + Number(o.amount_usd), 0))}</p></div>
      <div><p className="text-xs text-muted-foreground">Locked mining MVG earned</p><p className="num mt-1 text-xl">{mvt(sales.reduce((v, o) => v + Number(o.mining_mvg), 0))}</p></div>
    </div>
    {me?.marketplace_blocked && <p className="text-sm text-destructive">Your marketplace access is suspended.</p>}
    <Tabs defaultValue="tasks"><TabsList className="flex h-auto flex-wrap"><TabsTrigger value="tasks">Tasks</TabsTrigger><TabsTrigger value="collection">My task NFTs</TabsTrigger></TabsList>
      <TabsContent value="tasks" className="space-y-4 pt-3">{tasks.filter((t) => t.active || submissions?.some((s) => s.task_id === t.id && s.user_id === me?.id)).map((t) => {
        const submitted = submissions?.find((s) => s.task_id === t.id && s.user_id === me?.id);
        return <article key={t.id} className="space-y-3 rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-semibold">{t.title}</h2><span className="text-sm text-primary">{t.award_quantity} × {t.nfts?.name}</span></div><p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{t.description}</p>
          {submitted && <p className="text-sm">{submitted.status === "approved" ? "Approved · NFTs awarded" : submitted.status === "pending" ? "Awaiting admin approval" : "Changes requested"}{submitted.review_note && <span className="block mt-1 text-muted-foreground">{submitted.review_note}</span>}</p>}
          {t.active && (!submitted || submitted.status === "rejected") && <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void run(() => taskRpc(supabase.rpc("submit_nft_task", { _task: t.id, _evidence: evidence[t.id]?.trim() ?? "" })), "Completion submitted for review"); }}><Label htmlFor={`evidence-${t.id}`}>Completion evidence or link</Label><Textarea id={`evidence-${t.id}`} required maxLength={4000} value={evidence[t.id] ?? ""} onChange={(e) => setEvidence({ ...evidence, [t.id]: e.target.value })} /><Button size="sm" type="submit" variant="gold" disabled={busy || !evidence[t.id]?.trim()}><Send />Submit completion</Button></form>}
        </article>;
      })}{!tasks.length && <p className="py-8 text-sm text-muted-foreground">No NFT tasks available yet.</p>}</TabsContent>
      <TabsContent value="collection" className="pt-3"><div className={GRID}>{collection.map((o) => {
        const listing = listings.find((l) => l.instance_id === o.id && l.status === "open");
        const price = Number(prices[o.id]);
        return <article key={o.id} className="overflow-hidden rounded-lg border"><TaskNftMedia nft={o.nfts} /><div className="space-y-2 p-3"><h2 className="break-words text-sm font-semibold">{o.nfts?.name}</h2><p className="break-all text-[10px] text-muted-foreground">NFT ID · {o.id}</p>{!o.nfts?.active ? <p className="text-sm text-destructive">Delisted</p> : listing ? <Button size="sm" variant="outline" className="w-full" disabled={busy} onClick={() => run(() => taskRpc(supabase.rpc("task_nft_market_action", { _action: "cancel", _id: listing.id })), "Listing cancelled")}>Cancel · {usd(listing.price_usd)}</Button> : <><Label htmlFor={`task-price-${o.id}`}>Sale price (USD)</Label><Input id={`task-price-${o.id}`} type="number" min="0.01" max="100000" step="0.01" value={prices[o.id] ?? ""} onChange={(e) => setPrices({ ...prices, [o.id]: e.target.value })} /><p className="text-xs text-muted-foreground">Sale reward: {mvt(miningSaleReward(price, rate))} · locked</p><Button size="sm" variant="gold" className="w-full" disabled={busy || me?.marketplace_blocked || !(price >= 0.01 && price <= 100000)} onClick={() => run(() => taskRpc(supabase.rpc("task_nft_market_action", { _action: "list", _id: o.id, _price: price })), "Task NFT listed")}>List for sale</Button></>}</div></article>;
      })}</div>{!collection.length && <p className="py-8 text-sm text-muted-foreground">No task NFTs collected yet.</p>}</TabsContent>
      <TabsContent value="market" className="pt-3"><div className={GRID}>{listings.filter((l) => l.status === "open").sort((a, b) => Number(b.seller_id === me?.id) - Number(a.seller_id === me?.id)).map((l) => <article key={l.id} className="overflow-hidden rounded-lg border"><TaskNftMedia nft={l.nfts} /><div className="space-y-2 p-3"><h2 className="break-words text-sm font-semibold">{l.nfts?.name}</h2><p className="num text-primary">{usd(l.price_usd)}</p><p className="break-all text-[10px] text-muted-foreground">NFT ID · {l.instance_id}</p><Button size="sm" variant="gold" className="w-full" disabled={busy || paying || me?.marketplace_blocked || !l.nfts?.active} onClick={() => l.seller_id === me?.id ? run(() => taskRpc(supabase.rpc("task_nft_market_action", { _action: "cancel", _id: l.id })), "Listing cancelled") : pay({ kind: "task_nft", listingId: l.id })}>{l.seller_id === me?.id ? "Cancel your listing" : "Buy · Paystack"}</Button></div></article>)}</div>{!listings.some((l) => l.status === "open") && <p className="py-8 text-sm text-muted-foreground">No task NFTs listed yet.</p>}</TabsContent>
      <TabsContent value="history" className="space-y-3 pt-3"><Button asChild size="sm" variant="outline"><Link to="/referrals">Withdraw sale proceeds</Link></Button>{orders?.filter((o) => o.user_id === me?.id || o.seller_id === me?.id).map((o) => <article key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3 text-sm"><div><p>{o.seller_id === me?.id ? "Sale" : "Purchase"} · {o.status}</p><p className="text-xs text-muted-foreground">{dt(o.created_at)}</p></div><div className="text-right"><p className="num">{usd(o.amount_usd)}</p>{o.status === "success" && o.seller_id === me?.id && <p className="text-xs text-primary">+ {mvt(o.mining_mvg)} locked mining MVG</p>}</div>{o.user_id === me?.id && o.status === "pending" && <Button asChild variant="outline" size="sm"><Link to="/payment-callback" search={{ reference: o.reference }}>Check payment</Link></Button>}</article>)}{!orders?.length && <p className="py-8 text-sm text-muted-foreground">No task NFT transactions yet.</p>}</TabsContent>
    </Tabs>
  </div>;
}