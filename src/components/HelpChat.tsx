import { useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { helpChat } from "@/lib/help-chat.functions";
import { SOCIALS } from "@/lib/social";

type M = { role: "user" | "assistant"; content: string };
const KEY = "mvg_help_chat";

export function HelpChat() {
  const [msgs, setMsgs] = useState<M[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { try { setMsgs(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch { /* empty */ } input.current?.focus(); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, busy]);

  function save(next: M[]) { setMsgs(next); localStorage.setItem(KEY, JSON.stringify(next)); }

  async function send() {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    save(next); setText(""); setErr(""); setBusy(true);
    try {
      const { reply } = await helpChat({ data: { messages: next.slice(-20) } });
      save([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); input.current?.focus(); }
  }

  return (
    <div className="space-y-2">
      <div className="h-64 space-y-3 overflow-y-auto rounded-md border p-3">
        {!msgs.length && <p className="text-sm text-muted-foreground">Hi! Ask me anything about mining plans, MVG coins or withdrawals.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-auto w-fit max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground" : "max-w-[95%] whitespace-pre-wrap text-sm"}>
            {m.content}
          </div>
        ))}
        {busy && <p className="animate-pulse text-sm text-muted-foreground">Typing…</p>}
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div ref={end} />
      </div>
      <div className="flex gap-2">
        <Textarea ref={input} rows={2} value={text} placeholder="Type your question…" onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <Button variant="gold" size="icon" className="shrink-0 self-end" onClick={send} disabled={busy || !text.trim()} aria-label="Send"><Send className="size-4" /></Button>
      </div>
      <div className="flex items-center justify-between">
        <Button variant="link" className="h-auto p-0 text-xs" asChild><a href={SOCIALS.telegram} target="_blank" rel="noopener">Talk to us on Telegram</a></Button>
        {msgs.length > 0 && <Button variant="ghost" size="sm" className="text-xs" onClick={() => save([])}><Trash2 className="size-3.5" /> Clear chat</Button>}
      </div>
    </div>
  );
}
