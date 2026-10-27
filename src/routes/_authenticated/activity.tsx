import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Receipt } from "lucide-react";
import { Empty, StatusBadge } from "@/components/Brand";
import { PurchasesPanel } from "@/components/PurchasesPanel";
import { ledgerQ, paymentsQ } from "@/lib/data";
import { dt, mvt, usd } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({ meta: [{ title: "Activity & purchases — MiningVault Groups" }, { name: "description", content: "All your MiningVault Groups transactions and purchase history." }, { property: "og:title", content: "Activity & purchases — MiningVault Groups" }, { property: "og:description", content: "Transaction history and purchased plans in one place." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Activity,
});

type Row = { id: string; date: string; type: string; ref: string; amount: string; status: string; group: string };

const TABS = [{ v: "activity", l: "Activity", icon: History }, { v: "purchases", l: "Purchases", icon: Receipt }] as const;

function Activity() {
  const { data: ledger } = useQuery(ledgerQ);
  const { data: pays } = useQuery(paymentsQ);
  const [tab, setTab] = useState<(typeof TABS)[number]["v"]>("activity");
  const [filter, setFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const rows: Row[] = [
    ...(ledger ?? []).map((l) => ({ id: l.id, date: l.created_at, type: l.kind.replace(/_/g, " "), ref: l.reference, amount: l.account === "referral" ? usd(l.amount) : mvt(l.amount), status: l.status, group: l.account === "referral" ? "referral" : "mining" })),
    ...(pays ?? []).map((p) => ({ id: p.id, date: p.created_at, type: p.kind === "plan" ? "plan payment" : "coin purchase", ref: p.reference, amount: usd(p.amount_usd), status: p.status, group: "payments" })),
  ].filter((r) => (filter === "all" || r.group === filter) && (status === "all" || r.status === status)).sort((a, b) => b.date.localeCompare(a.date));
  const sel = "rounded-md border bg-card px-3 py-2 text-sm";
  const tabCls = (on: boolean) => `flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${on ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Activity</h1>
        <div className="flex gap-1 rounded-full border bg-card p-1">
          {TABS.map((t) => (
            <button key={t.v} className={tabCls(tab === t.v)} onClick={() => setTab(t.v)} aria-pressed={tab === t.v}>
              <t.icon className="size-3.5" /> {t.l}
            </button>
          ))}
        </div>
      </div>
      {tab === "purchases" ? (
        <PurchasesPanel />
      ) : (
        <>
          <div className="flex gap-2">
            <select className={sel} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All types</option><option value="referral">Referral & withdrawals</option><option value="mining">Mining</option><option value="payments">Payments</option></select>
            <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>{["all", "confirmed", "pending", "reserved", "released", "success", "failed"].map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <div className="panel overflow-x-auto p-5">
            {rows.length ? (
              <table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Date</th><th>Type</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>{rows.map((r) => <tr key={r.id} className="border-t"><td className="py-2">{dt(r.date)}</td><td className="capitalize">{r.type}</td><td className="num text-xs">{r.ref.slice(0, 20)}</td><td className="num">{r.amount}</td><td><StatusBadge s={r.status} /></td></tr>)}</tbody></table>
            ) : <Empty text="Nothing here yet" />}
          </div>
        </>
      )}
    </div>
  );
}
