import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Empty, Stat, StatusBadge } from "@/components/Brand";
import { balancesQ, ledgerQ } from "@/lib/data";
import { dt, mvt, usd } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "MVG Wallet — MiningVault Groups" }, { name: "description", content: "Your MiningVault Groups Token balances and history." }, { property: "og:title", content: "MVG Wallet — MiningVault Groups" }, { property: "og:description", content: "Your MVG balances." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Wallet,
});

function Wallet() {
  const { data: b } = useQuery(balancesQ);
  const { data: ledger } = useQuery(ledgerQ);
  const rate = Number(b?.mvt_per_usd ?? 50);
  const rows = ledger?.filter((l) => l.account === "mvt") ?? [];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">MVG Wallet</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total mined MVG" value={mvt(Number(b?.mvt_confirmed ?? 0) + Number(b?.mvt_pending ?? 0))} tone="gold" hint={usd((Number(b?.mvt_confirmed ?? 0) + Number(b?.mvt_pending ?? 0)) / rate)} />
        <Stat label="Available" value={mvt(b?.mvt_confirmed)} />
        <Stat label="Locked mining MVG" value={mvt(b?.mvt_pending)} hint="Not available to trade" />
        <Stat label="Reference rate" value={`${rate} MVG = $1`} hint="Not a live market price" />
      </div>
      <div className="panel p-5 text-sm text-muted-foreground">
        MVG is currently an internal platform balance. Sending and withdrawing MVG opens when the coin lists. Coins you buy are shown on the Buy MVG page.
      </div>
      <div className="panel p-5">
        <h2 className="font-semibold">MVG history</h2>
        <div className="mt-3 overflow-x-auto">
          {rows.length ? (
            <table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Date</th><th>Type</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>{rows.map((l) => (
                <tr key={l.id} className="border-t"><td className="py-2">{dt(l.created_at)}</td><td className="capitalize">{l.kind.replace(/_/g, " ")}</td><td className="num text-xs">{l.reference.slice(0, 18)}</td><td className="num">{mvt(l.amount)}</td><td><StatusBadge s={l.status} /></td></tr>
              ))}</tbody></table>
          ) : <Empty text="No MVG yet — start a mining session" />}
        </div>
      </div>
    </div>
  );
}
