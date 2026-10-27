import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, Gem, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Empty } from "@/components/Brand";
import { MarketTabs } from "@/components/MarketTabs";
import { MiningNftTimeline } from "@/components/MiningNftTimeline";
import { myNftsQ, nftsQ, nftListingsQ, nftInventoryQ, profileQ, settingsQ } from "@/lib/data";
import { useNftMediaUrl } from "@/lib/nft-media";
import { usePay } from "@/lib/usePay";
import { nftMarketAction } from "@/lib/marketplace.functions";
import { dt, mvt, usd } from "@/lib/format";
import { filterNftListings, listingBoundsMvg, NFT_GROUPS, nftGroup, type ListingSort } from "@/lib/nft-market";
import type { Tables } from "@/integrations/supabase/types";
import miningNftImage from "@/assets/mining-nft.jpg";
import { CryptoNftCheckout } from "@/components/CryptoNftCheckout";

export const Route = createFileRoute("/_authenticated/nfts")({
  head: () => ({
    meta: [{ title: "NFT marketplace — MiningVault Groups" }, { name: "description", content: "Collect verified NFTs and trade owned pieces for MVG." }, { property: "og:title", content: "NFT marketplace — MiningVault Groups" }, { property: "og:description", content: "Verified NFT drops, rewards and member resale." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }],
    scripts: [{ src: "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js", type: "module" }],
  }),
  component: Nfts,
});

type Nft = Tables<"nfts">;
function NftMedia({ nft }: { nft: Pick<Nft, "name" | "image_url" | "model_url" | "mining_plan_id"> }) {
  const img = useNftMediaUrl(nft.image_url);
  const model = useNftMediaUrl(nft.model_url);
  if (model) return <model-viewer src={model} poster={img ?? undefined} camera-controls auto-rotate className="block aspect-square w-full" />;
  if (img || nft.mining_plan_id) return <img src={img ?? miningNftImage} alt={nft.name} width={768} height={768} loading="lazy" className="aspect-square w-full object-contain" />;
  return <div className="grid aspect-square place-items-center bg-muted/40"><Gem className="size-6 text-muted-foreground" /></div>;
}
function Verified({ verified }: { verified: boolean }) {
  return verified ? <span className="absolute right-1.5 top-1.5 rounded-full bg-background p-1 text-primary" title="Verified admin collection"><BadgeCheck className="size-3.5" aria-label="Verified admin collection" /></span> : null;
}
const GRID = "grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";
function Nfts() {
  const qc = useQueryClient();
  const { data: nfts } = useQuery(nftsQ);
  const { data: mine } = useQuery(myNftsQ);
  const { data: listings } = useQuery(nftListingsQ);
  const { data: inventory } = useQuery(nftInventoryQ);
  const { data: me } = useQuery(profileQ);
  const { data: settings } = useQuery(settingsQ);
  const { pay, busy: paying } = usePay();
  const action = useServerFn(nftMarketAction);
  const [busy, setBusy] = useState(false);
  const [cryptoNft, setCryptoNft] = useState<{ id: string; name: string } | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ListingSort>("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const visibleListings = filterNftListings(listings ?? [], { userId: me?.id, search, sort, min: minPrice, max: maxPrice });
  const rangeInvalid = minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice);
  const owned = new Set(mine?.map((o) => o.nft_id));
  async function transact(kind: "list" | "buy" | "cancel", id: string) {
    setBusy(true);
    try {
      await action({ data: { action: kind, id, ...(kind === "list" ? { price: Number(prices[id]) } : {}) } });
      toast.success(kind === "buy" ? "NFT added to your collection" : kind === "list" ? "NFT listed" : "Listing cancelled");
      await qc.invalidateQueries();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">NFT marketplace</h1>
      <MarketTabs active="nfts" />
    </div>
    {me?.marketplace_blocked && <p className="text-sm text-destructive">Your marketplace access is suspended. Contact support.</p>}
    <section className="space-y-3"><h2 className="text-xl font-semibold">Verified drops</h2>
      <div className={GRID}>{nfts?.map((n) => {
        const stock = inventory?.find((i) => i.nft_id === n.id);
        const remaining = n.quantity === null ? null : Math.max(0, n.quantity - Number(stock?.sold ?? 0) - Number(stock?.reserved ?? 0));
        return <article key={n.id} className="panel overflow-hidden"><div className="relative"><NftMedia nft={n} /><Verified verified={n.verified} /></div>
          <div className="space-y-1.5 p-2"><h3 className="truncate text-xs font-semibold">{n.name}</h3>
            {remaining !== null && <p className="text-[10px] text-muted-foreground">{remaining} left</p>}
            {n.price_usd === null ? <span className="flex items-center gap-1 text-[10px] text-gold"><Sparkles className="size-3" /> Reward only</span> : <p className="num text-xs font-semibold text-gold">{usd(n.price_usd)}</p>}
            {owned.has(n.id) ? <span className="block text-[10px] text-primary">Owned</span> : n.price_usd !== null && <><Button size="sm" variant="gold" className="h-7 w-full px-2 text-[11px]" disabled={paying || remaining === 0 || me?.marketplace_blocked} onClick={() => pay({ kind: "nft", nftId: n.id })}>{remaining === 0 ? "Sold out" : "Buy · Paystack"}</Button><Button size="sm" variant="outline" className="h-7 w-full px-2 text-[11px]" disabled={paying || remaining === 0 || me?.marketplace_blocked} onClick={() => setCryptoNft({ id: n.id, name: n.name })}>Buy · USDT</Button></>}
          </div></article>;
      })}</div>{!nfts?.length && <Empty text="No NFT drops yet" />}
    </section>
    <CryptoNftCheckout nft={cryptoNft} onClose={() => setCryptoNft(null)} />
    <section className="space-y-5" aria-label="Member listings">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">Member listings</h2><span className="text-xs text-muted-foreground">{visibleListings.length} listings</span></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_110px_110px]">
        <div className="space-y-1.5"><Label htmlFor="nft-search">Search NFTs</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input id="nft-search" className="pl-9" placeholder="Name or NFT ID" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
        <div className="space-y-1.5"><Label htmlFor="nft-sort">Sort by</Label><Select value={sort} onValueChange={(value) => { if (value === "newest" || value === "low" || value === "high") setSort(value); }}><SelectTrigger id="nft-sort"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest first</SelectItem><SelectItem value="low">Price: low to high</SelectItem><SelectItem value="high">Price: high to low</SelectItem></SelectContent></Select></div>
        <div className="space-y-1.5"><Label htmlFor="nft-min">Min MVG</Label><Input id="nft-min" type="number" min="0" step="0.01" placeholder="Any" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="nft-max">Max MVG</Label><Input id="nft-max" type="number" min="0" step="0.01" placeholder="Any" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} aria-invalid={rangeInvalid} /></div>
      </div>
      {rangeInvalid && <p className="text-sm text-destructive">Maximum price must be at least the minimum price.</p>}
      {(search || minPrice || maxPrice || sort !== "newest") && <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setMinPrice(""); setMaxPrice(""); setSort("newest"); }}>Reset filters</Button>}
      {NFT_GROUPS.map((group) => {
        const rows = visibleListings.filter((listing) => nftGroup(listing.nfts) === group.id);
        if (!rows.length && (group.id === "mining" || group.id === "collectibles")) return null;
        return <section key={group.id} aria-label={group.label} className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-2"><h3 className="text-base font-semibold">{group.label}</h3><span className="text-xs text-muted-foreground">{rows.length}</span></div>
          <div className={GRID}>{rows.map((l) => <article key={l.id} data-nft-id={l.ownership_id} className="panel overflow-hidden">{l.nfts && <div className="relative"><NftMedia nft={l.nfts} /><Verified verified={l.nfts.verified} /></div>}<div className="space-y-1.5 p-2">
            <h4 className="truncate text-xs font-semibold" title={l.nfts?.name}>{l.nfts?.name}</h4>
            {l.seller_id === me?.id && <span className="block text-[10px] font-medium text-primary">Your listing</span>}
            <p className="text-[10px] text-muted-foreground">NFT ID</p><p className="break-all font-mono text-[10px] leading-relaxed text-muted-foreground">{l.ownership_id}</p>
            <p className="num text-xs text-gold">{mvt(l.price_mvg)}</p><Button size="sm" variant="gold" className="h-7 w-full px-2 text-[11px]" disabled={busy || me?.marketplace_blocked || owned.has(l.nft_id) && l.seller_id !== me?.id} onClick={() => transact(l.seller_id === me?.id ? "cancel" : "buy", l.id)}>{l.seller_id === me?.id ? "Cancel" : "Buy"}</Button>
          </div></article>)}</div>
          {!rows.length && <p className="py-3 text-sm text-muted-foreground">{search || minPrice || maxPrice ? "No matching NFTs" : "No listings yet"}</p>}
        </section>;
      })}
      {listings === undefined && <p role="status" className="text-sm text-muted-foreground">Loading listings…</p>}
    </section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">My collection</h2><div className={GRID}>{mine?.map((o) => {
      const listed = listings?.find((l) => l.ownership_id === o.id && l.status === "open");
      const bounds = listingBoundsMvg(o.nfts?.plans?.price_usd, Number(settings?.mvt_per_usd ?? 50));
      const entered = Number(prices[o.id]);
      const outOfBounds = bounds && entered > 0 && (entered < bounds.min || entered > bounds.max);
      return <article key={o.id} className="panel overflow-hidden">{o.nfts && <div className="relative"><NftMedia nft={o.nfts} /><Verified verified={o.nfts.verified} /></div>}<div className="space-y-1.5 p-2"><h3 className="truncate text-xs font-semibold">{o.nfts?.name}</h3><p className="text-[10px] text-muted-foreground">{o.source === "reward" ? "Reward" : "Purchased"} · {dt(o.created_at)}</p>{!o.nfts?.active ? <p className="text-[10px] text-destructive">Delisted</p> : listed ? <Button size="sm" variant="outline" className="h-7 w-full px-2 text-[11px]" disabled={busy} onClick={() => transact("cancel", listed.id)}>Cancel · {mvt(listed.price_mvg)}</Button> : <><Label htmlFor={`price-${o.id}`} className="text-[10px]">Resale price (MVG)</Label><Input id={`price-${o.id}`} type="number" min="0.01" step="0.01" className="h-7 text-xs" value={prices[o.id] ?? ""} onChange={(e) => setPrices({ ...prices, [o.id]: e.target.value })} aria-invalid={!!outOfBounds} />{bounds && <p className={`text-[10px] ${outOfBounds ? "text-destructive" : "text-muted-foreground"}`}>Allowed: {mvt(bounds.min)} – {mvt(bounds.max)}</p>}<Button size="sm" variant="outline" className="h-7 w-full px-2 text-[11px]" disabled={busy || me?.marketplace_blocked || !(entered > 0) || !!outOfBounds} onClick={() => transact("list", o.id)}>List for sale</Button></>}</div></article>;
    })}</div>{!mine?.length && <Empty text="No NFTs collected yet" />}</section>
    <MiningNftTimeline />
    <section className="space-y-3"><h2 className="text-xl font-semibold">My resale history</h2>{listings?.filter((l) => !l.history_hidden && l.status !== "open" && (l.seller_id === me?.id || l.buyer_id === me?.id)).map((l) => <div key={l.id} className="flex justify-between gap-3 border-b py-3 text-sm"><span>{l.nfts?.name} · {l.status}</span><span className="num">{mvt(l.price_mvg)}</span></div>)}</section>
  </div>;
}
