import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stat } from "@/components/Brand";
import { ListingAlertToggle } from "@/components/ListingAlert";
import { balancesQ, settingsQ, tradableQ } from "@/lib/data";
import { mvt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/convert")({
  head: () => ({ meta: [{ title: "Convert MVG — MiningVault Groups" }, { name: "description", content: "Convert mined MVG into tradable coins." }, { property: "og:title", content: "Convert MVG — MiningVault Groups" }, { property: "og:description", content: "Convert mined MVG into tradable coins." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Convert,
});

function Convert() {
  const qc = useQueryClient();
  const { data: b } = useQuery(balancesQ);
  const { data: s } = useQuery(settingsQ);
  const { data: t } = useQuery(tradableQ);
  const [amt, setAmt] = useState("");
  const [busy, setBusy] = useState(false);
  const confirmed = Number(b?.mvt_confirmed ?? 0);
  const n = Number(amt);

  async function convert() {
    setBusy(true);
    const { error } = await supabase.rpc("convert_mvt", { _mvt: n });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${mvt(n)} is now tradable`);
    setAmt("");
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Convert mined MVG</h1>
      <p className="text-sm text-muted-foreground">Turn your confirmed mining rewards into tradable MVG you can sell on P2P or trade at listing ({s?.launch_label ?? "Q1 2027"}).</p>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Confirmed mined" value={mvt(confirmed)} />
        <Stat label="Tradable MVG" value={mvt(t?.tradable)} tone="gold" />
        <Stat label="In P2P escrow" value={mvt(t?.escrow)} />
      </div>
      <div className="panel max-w-md space-y-3 p-5">
        <label className="text-sm">Amount to convert</label>
        <Input type="number" min={1} value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0" />
        <div className="flex gap-2">
          {[25, 50, 100].map((p) => (
            <Button key={p} size="sm" variant="outline" onClick={() => setAmt(String(Math.floor((confirmed * p) / 100)))}>{p}%</Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => setAmt(String(Math.floor(confirmed)))}>Max</Button>
        </div>
        <Button variant="gold" className="w-full" disabled={busy || !(n > 0) || n > confirmed} onClick={convert}>
          <ArrowLeftRight /> Convert to tradable
        </Button>
        <p className="text-xs text-muted-foreground">1 mined MVG = 1 tradable MVG. Only confirmed (claimed) mining rewards can be converted.</p>
      </div>
      <div className="max-w-md"><ListingAlertToggle /></div>
    </div>
  );
}
