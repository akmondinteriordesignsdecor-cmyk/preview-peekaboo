import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Msg = z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) });

export const helpChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ messages: z.array(Msg).min(1).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Chat is not configured");
    const [{ data: settings }, { data: plans }] = await Promise.all([
      context.supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      context.supabase.from("plans").select("*"),
    ]);
    const facts = JSON.stringify({ settings, plans });
    const instructions = `You are the MiningVault Groups support assistant. Answer only questions about mining plans, MVG coins (presale, listing, P2P/Convert/Trade), referrals and withdrawals. Be short, friendly and clear. Use these live facts and never invent numbers: ${facts}.
Known rules: buy a plan, then start a 12-hour mining session on the Mining page and claim MVG when it ends; mined rewards stay pending until MVG lists (${settings?.launch_label ?? "Q1 2027"}); Users can only upgrade plans upward, paying the price difference; highest purchased plan is current for future sessions; purchased MVG coins can be listed on P2P now and buyers pay using withdrawable USD; owned NFTs can be resold for available MVG; open-market Trade opens after listing; buying MVG on the Buy MVG page unlocks the whitelist; users must follow all our social pages before buying; withdrawals of referral earnings are requested on the Referrals page and reviewed manually by an admin.
If you can't help, or the user wants a human, tell them to tap "Talk to us on Telegram". Never ask for passwords or card details.`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions,
        input: data.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      let msg = `Chat failed (${res.status})`;
      try { msg = JSON.parse(body)?.error?.message ?? JSON.parse(body)?.message ?? msg; } catch { /* keep */ }
      if (res.status === 402) msg = "The assistant is unavailable right now. Please message us on Telegram.";
      if (res.status === 429) msg = "The assistant is busy. Try again in a minute.";
      throw new Error(msg);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        let ev: { type?: string; delta?: string; error?: { message?: string } };
        try { ev = JSON.parse(d); } catch { continue; }
        if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
        if (ev.type === "response.failed" || ev.type === "error") throw new Error(ev.error?.message ?? "Chat failed");
      }
    }
    if (!text.trim()) throw new Error("The assistant couldn't answer that. Please message us on Telegram.");
    return { reply: text };
  });
