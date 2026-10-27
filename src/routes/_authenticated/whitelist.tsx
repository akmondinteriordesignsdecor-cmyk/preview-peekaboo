import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { balancesQ, settingsQ, whitelistQ } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/whitelist")({
  head: () => ({ meta: [{ title: "MVG Launch Whitelist — MiningVault Groups" }, { name: "description", content: "Join the MVG coin launch whitelist." }, { property: "og:title", content: "MVG Launch Whitelist — MiningVault Groups" }, { property: "og:description", content: "Join the MVG launch whitelist." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Whitelist,
});

function Whitelist() {
  const qc = useQueryClient();
  const { data: s } = useQuery(settingsQ);
  const { data: w } = useQuery(whitelistQ);
  const { data: b } = useQuery(balancesQ);
  const hasCoins = Number(b?.presale_mvt ?? 0) > 0;
  const [wallet, setWallet] = useState("");
  useEffect(() => { if (w?.wallet_address) setWallet(w.wallet_address); }, [w]);

  async function join() {
    const { error } = await supabase.rpc("join_whitelist", { _wallet: wallet });
    if (error) { toast.error(error.message); return; }
    toast.success("You're on the whitelist"); qc.invalidateQueries({ queryKey: ["whitelist"] });
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6 text-center">
      <p className="text-sm text-primary">MVG coin launch · {s?.launch_label}</p>
      <h1 className="text-4xl font-bold">Join the <span className="text-gold">launch whitelist</span></h1>
      <div className="panel p-6"><p className="text-xs text-muted-foreground">Expected listing</p><p className="num text-4xl font-bold text-gold">{s?.launch_label ?? "Q1 2027"}</p></div>
      <div className="panel space-y-3 p-6 text-left">
        {w ? <p className="text-sm text-success">✓ You're whitelisted since {new Date(w.created_at).toLocaleDateString()}</p> : !hasCoins ? <p className="text-sm text-muted-foreground">Buy MVG coins to be added to the whitelist. Whitelisted members get first access when MVG lists.</p> : <p className="text-sm text-muted-foreground">Whitelisted members get first access when MVG lists.</p>}
        {!w && !hasCoins ? (
          <Button asChild variant="gold" className="w-full"><Link to="/presale">Buy coin</Link></Button>
        ) : (<>
          <Input placeholder="Wallet address (optional, can add later)" value={wallet} onChange={(e) => setWallet(e.target.value)} />
          <Button variant="gold" className="w-full" onClick={join}>{w ? "Update wallet" : "Join whitelist"}</Button>
        </>)}
      </div>
    </div>
  );
}
