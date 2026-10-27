import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function MarketTabs({ active }: { active: "nfts" | "coins" | "tasks" }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant={active === "tasks" ? "gold" : "outline"} asChild={active !== "tasks"} disabled={active === "tasks"}>
        {active === "tasks" ? "NFT tasks" : <Link to="/nft-tasks">NFT tasks</Link>}
      </Button>
      <Button size="sm" variant={active === "nfts" ? "gold" : "outline"} asChild={active !== "nfts"} disabled={active === "nfts"}>
        {active === "nfts" ? "NFT market" : <Link to="/nfts">NFT market</Link>}
      </Button>
      <Button size="sm" variant={active === "coins" ? "gold" : "outline"} asChild={active !== "coins"} disabled={active === "coins"}>
        {active === "coins" ? "Coin market" : <Link to="/coin-market">Coin market</Link>}
      </Button>
    </div>
  );
}
