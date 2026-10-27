import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "risk", "flags"],
  properties: {
    summary: { type: "string" },
    risk: { type: "string", enum: ["low", "medium", "high"] },
    flags: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["issue", "reason"],
        properties: { issue: { type: "string" }, reason: { type: "string" } },
      },
    },
  },
};

async function callModel(apiKey: string, prompt: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions:
        "You review payout withdrawal requests for a crypto-mining rewards platform. Summarize the request in 2-3 plain sentences and flag anything an admin should check (mismatched names, unusual amounts, many recent withdrawals, new accounts, missing or odd bank details, concerns in the admin's notes). Only flag real concerns; return an empty list if none.",
      input: prompt,
      text: { format: { type: "json_schema", name: "withdrawal_review", strict: true, schema: SCHEMA } },
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    let msg = `AI request failed (${res.status})`;
    try { msg = JSON.parse(body)?.error?.message ?? JSON.parse(body)?.message ?? msg; } catch { /* keep */ }
    if (res.status === 402) msg = "AI credits are used up. Add credits to keep using AI reviews.";
    if (res.status === 429) msg = "AI is busy right now. Try again in a minute.";
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
      try {
        const ev = JSON.parse(d);
        if (ev.type === "response.output_text.delta") text += ev.delta;
        if (ev.type === "response.failed" || ev.type === "error") throw new Error(ev.error?.message ?? "AI review failed");
        if (ev.type === "response.refusal.delta") throw new Error("The AI declined to review this request.");
      } catch (e) { if (e instanceof Error && !(e instanceof SyntaxError)) throw e; }
    }
  }
  const out = JSON.parse(text) as { summary: string; risk: string; flags: { issue: string; reason: string }[] };
  return out;
}

export const reviewWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), details: z.string().max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only");
    const { data: w, error } = await supabase.from("withdrawals").select("*").eq("id", data.id).single();
    if (error || !w) throw new Error("Withdrawal not found");
    const [{ data: profile }, { data: history }] = await Promise.all([
      supabase.from("profiles").select("email, display_name, created_at").eq("id", w.user_id).maybeSingle(),
      supabase.from("withdrawals").select("amount_usd, status, account_name, account_number, created_at").eq("user_id", w.user_id).neq("id", w.id).order("created_at", { ascending: false }).limit(10),
    ]);
    const prompt = JSON.stringify({
      request: { amount_usd: w.amount_usd, method: w.method, bank: w.bank_name, account_number: w.account_number, account_name: w.account_name, status: w.status, created_at: w.created_at },
      user: { display_name: profile?.display_name, email: profile?.email, joined: profile?.created_at },
      previous_withdrawals: history ?? [],
      admin_details: data.details || "(none provided)",
    });
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");
    const r = await callModel(apiKey, prompt);
    const { error: insErr } = await supabase.from("withdrawal_reviews").insert({
      withdrawal_id: w.id, admin_id: userId, admin_details: data.details || null, summary: r.summary, risk: r.risk, flags: r.flags,
    });
    if (insErr) throw new Error(insErr.message);
    return r;
  });
