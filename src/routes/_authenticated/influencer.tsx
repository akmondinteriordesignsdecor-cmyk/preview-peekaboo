import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Empty, Stat, StatusBadge } from "@/components/Brand";
import { dt, usd } from "@/lib/format";
import { INFLUENCER_TIERS } from "@/lib/influencer";

export const Route = createFileRoute("/_authenticated/influencer")({
  head: () => ({ meta: [{ title: "Influencer program — MiningVault Groups" }, { name: "description", content: "Post about MiningVault and earn up to $300 per post." }, { property: "og:title", content: "Influencer program — MiningVault Groups" }, { property: "og:description", content: "Get paid for views when you post about MiningVault." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Influencer,
});

function Influencer() {
  const qc = useQueryClient();
  const { data: bal } = useQuery({ queryKey: ["influencer-balance"], queryFn: async () => (await supabase.rpc("influencer_balance")).data as unknown as { earned: number; withdrawn: number; reserved: number } });
  const { data: subs } = useQuery({ queryKey: ["influencer-subs"], queryFn: async () => (await supabase.from("influencer_submissions").select("*").order("created_at", { ascending: false })).data ?? [] });
  const { data: wds } = useQuery({ queryKey: ["influencer-wds"], queryFn: async () => (await supabase.from("influencer_withdrawals").select("*").order("created_at", { ascending: false })).data ?? [] });
  const [f, setF] = useState({ links: "", views: "", message: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [w, setW] = useState({ amount: "", details: "" });
  const [busy, setBusy] = useState(false);
  const earned = Number(bal?.earned ?? 0), withdrawn = Number(bal?.withdrawn ?? 0), reserved = Number(bal?.reserved ?? 0);
  const avail = earned - withdrawn - reserved;

  async function submit() {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const paths: string[] = [];
      for (const file of files) {
        const path = `${u.user!.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("influencer-proofs").upload(path, file);
        if (error) throw error;
        paths.push(path);
      }
      const { error } = await supabase.from("influencer_submissions").insert({ channel_links: f.links.trim(), views: Number(f.views), message: f.message.trim(), screenshots: paths });
      if (error) throw error;
      toast.success("Sent to admin for review");
      setF({ links: "", views: "", message: "" }); setFiles([]);
      qc.invalidateQueries({ queryKey: ["influencer-subs"] });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function withdraw() {
    setBusy(true);
    const { error } = await supabase.rpc("request_influencer_withdrawal", { _amount: Number(w.amount), _details: w.details });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Withdrawal requested — admin will pay you");
    setW({ amount: "", details: "" });
    qc.invalidateQueries({ queryKey: ["influencer-balance"] }); qc.invalidateQueries({ queryKey: ["influencer-wds"] });
  }

  return (
    <div className="space-y-6">
      <Link to="/referrals" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Referrals</Link>
      <div className="panel p-6 shadow-glow">
        <h1 className="text-2xl font-semibold">Influencer program</h1>
        <p className="mt-1 text-sm text-muted-foreground">Talk about the app on your channels, share your referral link, then send your links and screenshots. Admin verifies your views and referrals before paying.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {INFLUENCER_TIERS.map((t) => <div key={t.min} className="rounded-lg border p-3 text-center"><p className="num text-lg text-gold">{usd(t.usd)}</p><p className="text-xs text-muted-foreground">{t.min.toLocaleString()}–{t.max.toLocaleString()} views</p></div>)}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Available" value={usd(avail)} tone="gold" />
        <Stat label="Total earned" value={usd(earned)} />
        <Stat label="Withdrawn" value={usd(withdrawn)} {...(reserved ? { hint: `${usd(reserved)} pending` } : {})} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel space-y-3 p-5">
          <h2 className="font-semibold">Submit your post</h2>
          <div><Label>Your channel / post links</Label><Textarea value={f.links} onChange={(e) => setF({ ...f, links: e.target.value })} placeholder="One link per line" maxLength={3000} /></div>
          <div><Label>Views</Label><Input type="number" min={0} value={f.views} onChange={(e) => setF({ ...f, views: e.target.value })} /></div>
          <div><Label>Message to admin</Label><Textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="What you did" maxLength={3000} /></div>
          <div><Label>Screenshots</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground"><Upload className="size-4" />{files.length ? `${files.length} file(s) selected` : "Choose images"}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6))} /></label></div>
          <Button variant="gold" className="w-full" disabled={busy || f.links.trim().length < 5 || !f.views || !files.length} onClick={submit}>Send to admin</Button>
        </div>
        <div className="panel space-y-3 p-5">
          <h2 className="font-semibold">Withdraw influencer earnings</h2>
          <p className="text-xs text-muted-foreground">Available {usd(avail)}. Admin pays you directly.</p>
          <div><Label>Amount (USD)</Label><Input type="number" min={0} step="0.01" value={w.amount} onChange={(e) => setW({ ...w, amount: e.target.value })} /></div>
          <div><Label>Payout details</Label><Textarea value={w.details} onChange={(e) => setW({ ...w, details: e.target.value })} placeholder="Bank name, account number and name — or wallet address" maxLength={1000} /></div>
          <Button variant="gold" className="w-full" disabled={busy || !(Number(w.amount) > 0) || Number(w.amount) > avail || w.details.trim().length < 5} onClick={withdraw}>Request withdrawal</Button>
          {wds?.map((x) => <div key={x.id} className="flex justify-between border-t pt-2 text-sm"><span>{dt(x.created_at)}</span><span className="num">{usd(x.amount_usd)}</span><StatusBadge s={x.status} /></div>)}
        </div>
      </div>
      <div className="panel p-5">
        <h2 className="font-semibold">Your requests</h2>
        <div className="mt-3 space-y-3">
          {subs?.length ? subs.map((s) => (
            <div key={s.id} className="border-b pb-3 text-sm last:border-0">
              <div className="flex items-center justify-between"><span>{dt(s.created_at)} · {s.views.toLocaleString()} views</span><StatusBadge s={s.status} /></div>
              {s.status === "approved" && <p className="mt-1 text-success">Admin approved your influencing and gifted you {usd(s.award_usd)}</p>}
              {s.admin_note && <p className="mt-1 text-xs text-muted-foreground">Admin: {s.admin_note}</p>}
            </div>
          )) : <Empty text="No requests yet" />}
        </div>
      </div>
    </div>
  );
}
