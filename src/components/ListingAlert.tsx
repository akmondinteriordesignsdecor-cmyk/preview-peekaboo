import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { listingAlertQ } from "@/lib/data";

export function ListingAlertToggle() {
  const qc = useQueryClient();
  const { data } = useQuery(listingAlertQ);
  const on = data?.enabled ?? false;
  async function toggle(v: boolean) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("listing_alerts").upsert({ user_id: u.user!.id, enabled: v, updated_at: new Date().toISOString() });
    if (error) { toast.error(error.message); return; }
    toast.success(v ? "We'll alert you when MVG lists" : "Listing alert turned off");
    qc.invalidateQueries({ queryKey: ["listing-alert"] });
  }
  return (
    <div className="panel flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-2">
        {on ? <Bell className="h-4 w-4 text-gold" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
        <div>
          <p className="text-sm font-medium">Alert me at listing</p>
          <p className="text-xs text-muted-foreground">Get notified the moment MVG goes live for trading.</p>
        </div>
      </div>
      <Switch checked={on} onCheckedChange={toggle} />
    </div>
  );
}
