import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, History, KeyRound, ShoppingBag, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty } from "@/components/Brand";
import { miningNftTimelineQ, type MiningNftTimeline as Timeline } from "@/lib/data";
import { dt, mvt, usd } from "@/lib/format";
import miningNftImage from "@/assets/mining-nft.jpg";

const labels: Record<string, string> = {
  purchase: "NFT purchased", upgrade: "NFT upgrade purchased", access_granted: "Mining access granted",
  listed: "Listed for sale", listing_cancelled: "Listing cancelled", listing_removed: "Listing removed",
  transfer: "Ownership transfer completed", access_transferred: "Mining access transferred",
};

function Event({ event }: { event: Timeline["events"][number] }) {
  const Icon = event.kind.includes("access") ? KeyRound : event.kind === "transfer" ? ArrowRightLeft : event.kind.includes("list") ? Tag : ShoppingBag;
  return <li className="relative flex gap-3 pb-5 last:pb-0">
    <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full border bg-background text-primary"><Icon className="size-4" /></span>
    <div className="min-w-0 space-y-1 pt-1">
      <p className="text-sm font-medium">{labels[event.kind] ?? event.kind.replaceAll("_", " ")}</p>
      <p className="text-xs text-muted-foreground">{event.occurred_at ? dt(event.occurred_at) : "Earlier event · exact date unavailable"}</p>
      {event.details.previous_plan && <p className="text-xs text-muted-foreground">From {event.details.previous_plan}</p>}
      {event.details.amount_usd != null && <p className="num text-sm text-gold">{usd(event.details.amount_usd)} paid</p>}
      {event.details.price_mvg != null && <p className="num text-sm">{mvt(event.details.price_mvg)}</p>}
      {event.kind === "listed" && <p className="text-xs text-muted-foreground">Mining access stays with the owner until sold.</p>}
      {(event.kind === "transfer" || event.kind === "access_transferred") && <p className="text-xs text-muted-foreground">{event.to_you ? "Received by you" : event.by_you ? "Transferred by you to the buyer" : "Transferred between previous owners"}{event.kind === "transfer" && event.details.historical ? " · mining access transferred with this NFT" : ""}</p>}
    </div>
  </li>;
}

export function MiningNftTimeline({ ownershipId, compact = false }: { ownershipId?: string; compact?: boolean }) {
  const { data, isPending, error, refetch } = useQuery(miningNftTimelineQ);
  const [selected, setSelected] = useState<string | null>(null);
  const item = data?.find((n) => n.ownership_id === (selected ?? ownershipId));
  const dialog = <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
    <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>{item?.name ?? "Mining NFT"} timeline</DialogTitle><DialogDescription>{item?.access ?? "Ownership and mining access"} · NFT #{item?.ownership_id.slice(0, 8)}</DialogDescription></DialogHeader>
      {item && <ol className="relative before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-border">{item.events.map((event) => <Event key={event.id} event={event} />)}</ol>}
    </DialogContent>
  </Dialog>;
  if (compact && ownershipId) return <>{data?.some((n) => n.ownership_id === ownershipId) && <Button size="sm" variant="ghost" className="h-7 w-full px-2 text-[11px]" onClick={() => setSelected(ownershipId)}><History className="size-3" />Timeline</Button>}{dialog}</>;
  return <section className="space-y-3">
    <h2 className="text-xl font-semibold">Mining NFT ownership &amp; access</h2>
    {isPending ? <p className="text-sm text-muted-foreground">Loading NFT history…</p> : error ? <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-destructive">NFT history could not be loaded.</p><Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button></div> : !data?.length ? <Empty text="No mining NFTs yet" /> :
      <div className="grid gap-3 md:grid-cols-3">{data.map((n) => <article key={n.ownership_id} className="panel flex items-start gap-3 p-4">
        <img src={miningNftImage} alt={n.name} width={64} height={64} className="size-16 shrink-0 rounded-md object-contain" />
        <div className="min-w-0 space-y-1"><h3 className="text-sm font-semibold">{n.name}</h3><p className="text-xs text-muted-foreground">NFT #{n.ownership_id.slice(0, 8)}</p><p className={n.owned ? "text-xs text-primary" : "text-xs text-muted-foreground"}>{n.access}</p><Button variant="ghost" size="sm" className="h-8 px-0" onClick={() => setSelected(n.ownership_id)}><History className="size-4" />View timeline</Button></div>
      </article>)}</div>}
    {dialog}
  </section>;
}