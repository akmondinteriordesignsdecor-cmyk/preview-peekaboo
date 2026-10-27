import { useEffect, useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REQUIRED_FOLLOWS, allFollowed, getFollows, markFollowed } from "@/lib/social";

export function useFollows() {
  const [follows, setFollows] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const read = () => setFollows(getFollows());
    read();
    window.addEventListener("mvg_follows_changed", read);
    return () => window.removeEventListener("mvg_follows_changed", read);
  }, []);
  return { follows, done: REQUIRED_FOLLOWS.every((r) => follows[r.key]) };
}

export function FollowPanel({ compact }: { compact?: boolean }) {
  const { follows, done } = useFollows();
  if (done && compact) return null;
  return (
    <div className="panel space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Follow us to unlock purchases</h2>
        {done && <span className="rounded-full border px-2 py-0.5 text-xs text-success">Unlocked</span>}
      </div>
      <p className="text-sm text-muted-foreground">
        Follow all our social platforms and the founder before buying a mining NFT or MVG coins.
      </p>
      <div className="space-y-2">
        {REQUIRED_FOLLOWS.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-3 border-t pt-2 first:border-t-0 first:pt-0">
            <span className="text-sm">{s.label}</span>
            {follows[s.key] ? (
              <span className="flex items-center gap-1 text-xs text-success"><Check className="size-4" /> Following</span>
            ) : (
              <Button
                size="sm"
                variant="gold"
                onClick={() => {
                  window.open(s.url, "_blank", "noopener");
                  markFollowed(s.key);
                }}
              >
                Follow <ExternalLink className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {!done && <p className="text-xs text-muted-foreground">Tap each Follow button — it opens the page and counts your follow.</p>}
    </div>
  );
}

export { allFollowed };
