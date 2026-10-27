import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/Brand";
import { dt, usd } from "@/lib/format";
import { suggestedPay } from "@/lib/influencer";

type Sub = { id: string; user_id: string; channel_links: string; views: number; message: string; screenshots: string[]; status: string; award_usd: number | null; created_at: string; urls: string[] };

export function InfluencerAdmin() {
  const qc = useQueryClient();
  const { data: subs } = useQuery({
    queryKey: ["admin-influencer"],
    queryFn: async () => {
      const rows = (await supabase.from("influencer_submissions").select("*").order("created_at", { ascending: false })).data ?? [];
      return Promise.all(rows.map(async (r) => {
        const signed = r.screenshots.length ? (await supabase.storage.from("influencer-proofs").createSignedUrls(r.screenshots, 3600)).data ?? [] : [];
        return { ...r, urls: signed.map((x) => x.signedUrl).filter(Boolean) as string[] } as Sub;
      }));
    },
  });
  const { data: wds } = useQuery({ queryKey: ["admin-influencer-wds"], queryFn: async () => (await supabase.from("influencer_withdrawals").select("*").eq("status", "requested").order("created_at")).data ?? [] });
  const [amt, setAmt] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function run(p: PromiseLike<{ error: { message: string } | null }>, msg: string) {
    setBusy(true);
    const { error } = await p;
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["admin-influencer"] }); qc.invalidateQueries({ queryKey: ["admin-influencer-wds"] });
  }
  async function remove(s: Sub) {
    if (!confirm("Delete this request?")) return;
    if (s.screenshots.length) await supabase.storage.from("influencer-proofs").remove(s.screenshots);
    await run(supabase.from("influencer_submissions").delete().eq("id", s.id), "Request deleted");
  }

  return <section className="space-y-4 border-t pt-6" aria-label="Influencer requests">
    <h2 className="text-xl font-semibold">Influencer requests</h2>
    {!subs?.length && <p className="text-sm text-muted-foreground">No influencer requests.</p>}
    {subs?.map((s) => <article key={s.id} className="space-y-2 border-b pb-4">
      <div className="flex items-center justify-between gap-2"><p className="break-all text-xs text-muted-foreground">Member {s.user_id} · {dt(s.created_at)}</p><StatusBadge s={s.status} /></div>
      <p className="text-sm"><b>{s.views.toLocaleString()}</b> views claimed · suggested {usd(suggestedPay(s.views))}</p>
      <p className="whitespace-pre-wrap break-all text-sm text-primary">{s.channel_links}</p>
      {s.message && <p className="whitespace-pre-wrap text-sm">{s.message}</p>}
      <div className="flex flex-wrap gap-2">{s.urls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Screenshot" className="h-28 w-28 rounded-md border object-cover" /></a>)}</div>
      {s.status === "pending" ? <>
        <div className="flex gap-2"><Input type="number" min={0} placeholder="Amount to pay (USD)" value={amt[s.id] ?? ""} onChange={(e) => setAmt({ ...amt, [s.id]: e.target.value })} /></div>
        <Textarea placeholder="Note to influencer (optional)" value={note[s.id] ?? ""} onChange={(e) => setNote({ ...note, [s.id]: e.target.value })} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="gold" disabled={busy || !(Number(amt[s.id]) > 0)} onClick={() => run(supabase.rpc("review_influencer", { _id: s.id, _approve: true, _award: Number(amt[s.id]), _note: note[s.id] ?? "" }), "Approved")}><Check />Approve</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(supabase.rpc("review_influencer", { _id: s.id, _approve: false, _award: 0, _note: note[s.id] ?? "" }), "Rejected")}><X />Reject</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(s)}><Trash2 />Delete</Button>
        </div>
      </> : <div className="flex items-center gap-2 text-sm">{s.award_usd != null && <span>Paid award {usd(s.award_usd)}</span>}<Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(s)}><Trash2 />Delete</Button></div>}
    </article>)}
    <h3 className="font-semibold">Influencer withdrawals to pay</h3>
    {!wds?.length && <p className="text-sm text-muted-foreground">None waiting.</p>}
    {wds?.map((w) => <div key={w.id} className="space-y-1 border-b pb-3 text-sm">
      <p><b>{usd(w.amount_usd)}</b> · <span className="break-all text-xs text-muted-foreground">{w.user_id} · {dt(w.created_at)}</span></p>
      <p className="whitespace-pre-wrap">{w.payout_details}</p>
      <div className="flex gap-2"><Button size="sm" variant="gold" disabled={busy} onClick={() => run(supabase.rpc("admin_set_influencer_withdrawal", { _id: w.id, _status: "paid" }), "Marked paid")}>Mark paid</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(supabase.rpc("admin_set_influencer_withdrawal", { _id: w.id, _status: "rejected" }), "Declined")}>Decline</Button></div>
    </div>)}
  </section>;
}
