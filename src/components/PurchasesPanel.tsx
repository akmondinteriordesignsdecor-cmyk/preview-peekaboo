import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Empty, Stat, StatusBadge } from "@/components/Brand";
import { paymentsQ } from "@/lib/data";
import { dt, mvt, usd } from "@/lib/format";

const KINDS = [{ v: "all", l: "All" }, { v: "plan", l: "Mining NFTs" }, { v: "presale", l: "MVG coin" }, { v: "nft", l: "NFTs" }] as const;
const STATUSES = ["all", "pending", "success", "failed"] as const;

export function PurchasesPanel() {
  const { data } = useQuery(paymentsQ);
  const [kind, setKind] = useState<(typeof KINDS)[number]["v"]>("all");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const all = data ?? [];
  const rows = all.filter((p) => (kind === "all" || p.kind === kind) && (status === "all" || p.status === status));
  const count = (s: string) => all.filter((p) => p.status === s).length;
  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs capitalize ${on ? "border-primary text-primary" : "text-muted-foreground"}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Successful" value={String(count("success"))} tone="gold" />
        <Stat label="Pending" value={String(count("pending"))} />
        <Stat label="Failed" value={String(count("failed"))} />
      </div>
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => <button key={k.v} className={chip(kind === k.v)} onClick={() => setKind(k.v)}>{k.l}</button>)}
        <span className="mx-1 w-px bg-border" />
        {STATUSES.map((s) => <button key={s} className={chip(status === s)} onClick={() => setStatus(s)}>{s === "success" ? "Successful" : s}</button>)}
      </div>
      <div className="panel p-5">
        <div className="space-y-2">
          {rows.length ? rows.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 border-t pt-2 text-sm first:border-t-0 first:pt-0">
              <div>
                <p className="font-medium">{p.kind === "plan" ? (p.upgrade_from ? "Mining NFT upgrade" : "Mining NFT") : p.kind === "nft" ? "NFT" : `MVG coin · ${mvt(p.mvt_amount)}`}</p>
                <p className="text-xs text-muted-foreground">{dt(p.created_at)} · {p.reference}</p>
              </div>
              <div className="text-right">
                <p className="num">{usd(p.amount_usd)}</p>
                <p className="text-xs text-muted-foreground">₦{Math.round(Number(p.amount_ngn_kobo) / 100).toLocaleString()}</p>
                <StatusBadge s={p.status} />
              </div>
            </div>
          )) : <Empty text="No purchases match these filters" />}
        </div>
      </div>
    </div>
  );
}
