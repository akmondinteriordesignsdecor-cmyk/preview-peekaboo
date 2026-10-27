import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Plus, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { settingsQ, nftsQ } from "@/lib/data";
import { tasksQ, submissionsQ, taskRpc } from "@/lib/task-nfts";
import { dt } from "@/lib/format";

export function NftTaskAdmin() {
  const qc = useQueryClient();
  const { data: nfts } = useQuery(nftsQ);
  const { data: tasks } = useQuery(tasksQ);
  const { data: submissions } = useQuery(submissionsQ);
  const { data: settings } = useQuery(settingsQ);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [nft, setNft] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [rate, setRate] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try { await action(); toast.success(message); await qc.invalidateQueries(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="space-y-6 border-t pt-6" aria-label="NFT task administration">
    <h2 className="text-xl font-semibold">NFT tasks & sale rewards</h2>
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-2"><Label htmlFor="task-reward-rate">Mining MVG per $5 sold</Label><Input id="task-reward-rate" type="number" min="0" max="1000000" step="0.01" placeholder={String(settings?.task_sale_mvg_per_five_usd ?? 0)} value={rate} onChange={(e) => setRate(e.target.value)} /></div>
      <Button variant="gold" disabled={busy || rate === "" || !Number.isFinite(Number(rate)) || Number(rate) < 0} onClick={() => run(() => taskRpc(supabase.rpc("admin_set_task_reward", { _rate: Number(rate) })), "Sale reward rate saved")}><Save />Save reward rate</Button>
      <p className="text-sm text-muted-foreground">Current: {settings?.task_sale_mvg_per_five_usd ?? 0} MVG / $5 · locked mining balance</p>
    </div>
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void run(async () => {
      await taskRpc(supabase.rpc("admin_create_nft_task", { _title: title.trim(), _description: description.trim(), _nft: nft, _quantity: Number(quantity) }));
      setTitle(""); setDescription(""); setNft(""); setQuantity("1");
    }, "NFT task created"); }}>
      <h3 className="font-semibold">Create task</h3>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="task-title">Task title</Label><Input id="task-title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="task-award">Reward NFT</Label><Select value={nft} onValueChange={setNft}><SelectTrigger id="task-award"><SelectValue placeholder="Select a collectible NFT" /></SelectTrigger><SelectContent>{nfts?.map((n) => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}</SelectContent></Select></div></div>
      <div className="space-y-2"><Label htmlFor="task-description">Completion requirements</Label><Textarea id="task-description" required maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div className="flex flex-wrap items-end gap-3"><div className="space-y-2"><Label htmlFor="task-quantity">NFTs per approved completion</Label><Input id="task-quantity" type="number" required min="1" max="100" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div><Button type="submit" variant="gold" disabled={busy || !nft}><Plus />Create task</Button></div>
    </form>
    <div className="divide-y">{tasks?.map((t) => <div key={t.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium">{t.title}</p><p className="text-sm text-muted-foreground">{t.award_quantity} × {t.nfts?.name}</p></div><Label className="flex items-center gap-2">Active<Switch checked={t.active} disabled={busy} onCheckedChange={(active) => run(() => taskRpc(supabase.rpc("admin_toggle_nft_task", { _id: t.id, _active: active })), "Task updated")} /></Label></div>)}</div>
    <h3 className="font-semibold">Completion review</h3>
    {submissions?.filter((s) => s.status === "pending").map((s) => <article key={s.id} className="space-y-3 border-b pb-4">
      <p className="font-medium">{s.nft_tasks?.title}</p><p className="break-all text-xs text-muted-foreground">Member {s.user_id} · {dt(s.created_at)}</p><p className="whitespace-pre-wrap break-words text-sm">{s.evidence}</p>
      <Label htmlFor={`review-${s.id}`}>Review note</Label><Textarea id={`review-${s.id}`} maxLength={2000} value={notes[s.id] ?? ""} onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })} />
      <div className="flex gap-2"><Button variant="gold" size="sm" disabled={busy} onClick={() => run(() => taskRpc(supabase.rpc("review_nft_task", { _id: s.id, _approve: true, _note: notes[s.id] ?? "" })), "NFTs awarded")}><Check />Approve & award</Button><Button variant="outline" size="sm" disabled={busy || !notes[s.id]?.trim()} onClick={() => run(() => taskRpc(supabase.rpc("review_nft_task", { _id: s.id, _approve: false, _note: notes[s.id] ?? "" })), "Submission returned")}><X />Return for changes</Button></div>
    </article>)}
    {!submissions?.some((s) => s.status === "pending") && <p className="text-sm text-muted-foreground">No completions awaiting review.</p>}
  </section>;
}