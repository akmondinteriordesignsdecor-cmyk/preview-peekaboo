import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { dt } from "@/lib/format";

export function CollaborationRequests({ admin = false }: { admin?: boolean }) {
  const qc = useQueryClient();
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const requests = useQuery({
    queryKey: ["collaboration-requests", admin],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from("collaboration_requests").select("*, collaboration_messages(*)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  async function reply(id: string) {
    const message = replies[id]?.trim();
    if (!message || busy) return;
    setBusy(id);
    try {
      const { error } = await supabase.from("collaboration_messages").insert({ request_id: id, message });
      if (error) throw error;
      setReplies((current) => ({ ...current, [id]: "" }));
      await qc.invalidateQueries({ queryKey: ["collaboration-requests"] });
      toast.success("Message sent");
    } catch { toast.error("Could not send your message. Please try again."); }
    finally { setBusy(null); }
  }
  return <section aria-label={admin ? "Collaboration requests" : "My collaboration requests"} className="space-y-4 border-t pt-6">
    <h2 className="text-xl font-semibold">{admin ? "Collaboration requests" : "My collaboration requests"}</h2>
    {requests.isPending && <p className="text-sm text-muted-foreground">Loading requests…</p>}
    {requests.isError && <p role="alert" className="text-sm text-destructive">Could not load requests.</p>}
    {requests.data?.length === 0 && <p className="text-sm text-muted-foreground">No collaboration requests yet.</p>}
    {requests.data?.map((request) => <article key={request.id} className="space-y-3 rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold break-words">{request.platform_name}</h3><span className="text-xs text-muted-foreground">{request.topic} · {dt(request.created_at)}</span></div>
      <div className="flex flex-wrap items-center gap-3 text-sm"><span className="break-all">{request.email}</span>{request.phone && <span className="break-all">{request.phone}</span>}{admin && <Button asChild variant="outline" size="sm"><a href={`mailto:${encodeURIComponent(request.email)}?subject=${encodeURIComponent("MiningVault Groups collaboration")}`}><Mail /> Reply by email</a></Button>}</div>
      <p className="whitespace-pre-wrap break-words text-sm">{request.message}</p>
      {request.collaboration_messages.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)).map((message) => <div key={message.id} className="border-l-2 border-primary pl-3 text-sm"><p className="mb-1 text-xs text-muted-foreground">{message.author_id === request.user_id ? "Member" : "Admin"} · {dt(message.created_at)}</p><p className="whitespace-pre-wrap break-words">{message.message}</p></div>)}
      <div className="space-y-2"><Label htmlFor={`reply-${request.id}`}>Reply</Label><Textarea id={`reply-${request.id}`} maxLength={5000} value={replies[request.id] ?? ""} onChange={(event) => setReplies((current) => ({ ...current, [request.id]: event.target.value }))} /><Button size="sm" variant="outline" disabled={busy !== null || !replies[request.id]?.trim()} onClick={() => reply(request.id)}><Send />{busy === request.id ? "Sending…" : "Send reply"}</Button></div>
    </article>)}
  </section>;
}