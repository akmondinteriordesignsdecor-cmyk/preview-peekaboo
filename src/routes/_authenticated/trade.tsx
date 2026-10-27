import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/Brand";
import { ListingAlertToggle } from "@/components/ListingAlert";
import { settingsQ, tradableQ } from "@/lib/data";
import { mvt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/trade")({
  head: () => ({ meta: [{ title: "Trade MVG — MiningVault Groups" }, { name: "description", content: "Trade MVG on the open market after listing." }, { property: "og:title", content: "Trade MVG — MiningVault Groups" }, { property: "og:description", content: "Trade MVG on the open market after listing." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Trade,
});

function Trade() {
  const { data: s } = useQuery(settingsQ);
  const { data: t } = useQuery(tradableQ);
  const launch = s?.launch_date ? new Date(s.launch_date) : null;
  const live = launch ? launch.getTime() <= Date.now() : false;
  const days = launch ? Math.max(0, Math.ceil((launch.getTime() - Date.now()) / 864e5)) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Trade MVG</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Your tradable MVG" value={mvt(t?.tradable)} tone="gold" />
        <Stat label="Listing" value={s?.launch_label ?? "Q1 2027"} />
        <Stat label="Countdown" value={live ? "Live" : days !== null ? `${days} days` : "—"} />
      </div>

      {live ? (
        <div className="panel p-5">
          <h2 className="font-semibold">Market</h2>
          <p className="mt-2 text-sm text-muted-foreground">MVG is live. Market trading pairs will appear here.</p>
        </div>
      ) : (
        <div className="panel space-y-3 p-6 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-gold" />
          <h2 className="font-semibold">Trading opens at listing — {s?.launch_label ?? "Q1 2027"}</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Open-market trading starts when MVG lists. Until then you can buy coins in the presale, convert mined coins, and use the P2P market.
          </p>
          <div className="mx-auto flex max-w-xs flex-col gap-2">
            <Link to="/presale"><Button variant="gold" className="w-full">Buy coin</Button></Link>
            <Link to="/p2p"><Button variant="outline" className="w-full">Go to P2P market</Button></Link>
          </div>
        </div>
      )}
      <div className="max-w-md"><ListingAlertToggle /></div>
    </div>
  );
}
