import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getUsdNgn, paystack } from "./fx.server";

const initSchema = z.object({
  kind: z.enum(["plan", "presale", "nft", "task_nft"]),
  listingId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  nftId: z.string().uuid().optional(),
  usd: z.number().min(1).max(10000).optional(),
  origin: z.string().url(),
});

export const getRate = createServerFn({ method: "GET" }).handler(async () => getUsdNgn(1600));

export const startPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => initSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: s } = await supabase.from("settings").select("*").single();
    if (!s) throw new Error("Settings missing");
    const { rate } = await getUsdNgn(Number(s.usd_to_ngn));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.kind === "task_nft" && !data.listingId) throw new Error("Choose an NFT listing");
    const { data: quote, error } = data.kind === "task_nft" ? await supabaseAdmin.rpc("prepare_task_nft_checkout", {
      _user: userId, _listing: data.listingId ?? "", _rate: rate,
    }) : await supabaseAdmin.rpc("prepare_checkout_for_user", {
      _user: userId, _kind: data.kind, _target: (data.kind === "plan" ? data.planId : data.nftId) ?? null as unknown as string,
      _usd: data.usd ?? null as unknown as number, _rate: rate,
    });
    if (error) throw new Error(error.message);
    const { reference, kobo } = quote as unknown as { reference: string; kobo: number; usd: number };
    let json;
    try {
      json = await paystack<{ authorization_url: string }>("/transaction/initialize", {
      method: "POST",
      body: {
        email: claims.email, amount: kobo, reference, currency: "NGN",
        callback_url: `${new URL(data.origin).origin}/payment-callback`,
        metadata: { kind: data.kind, user_id: userId, usd_ngn_rate: rate },
      },
    });
    if (!json.status || !json.data) throw new Error(json.message || "Could not start payment");
    } catch (error) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (data.kind === "task_nft") await supabaseAdmin.from("task_nft_orders").update({ status: "failed" }).eq("reference", reference).eq("status", "pending");
      else await supabaseAdmin.from("payments").update({ status: "failed" }).eq("reference", reference).eq("status", "pending");
      throw error;
    }
    return { url: json.data.authorization_url, reference };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ reference: z.string().min(4).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.reference.startsWith("TASK-")) {
      const { data: order, error } = await context.supabase.from("task_nft_orders").select("*").eq("reference", data.reference).eq("user_id", context.userId).single();
      if (error || !order) throw new Error("Payment not found");
      if (order.status === "success") return { status: "success", kind: "task_nft" };
      return { status: await confirmWithPaystack(data.reference), kind: "task_nft" };
    }
    const { data: p } = await context.supabase.from("payments").select("*").eq("reference", data.reference).single();
    if (!p) throw new Error("Payment not found");
    if (p.status === "success") return { status: "success", kind: p.kind };
    const result = await confirmWithPaystack(data.reference);
    return { status: result, kind: p.kind };
  });

export async function confirmWithPaystack(reference: string) {
  const json = await paystack<{ status: string; amount: number; currency: string }>(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (!json.status || json.data?.status !== "success") return json.data?.status ?? "pending";
  if (json.data.currency !== "NGN") return "currency_mismatch";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: r, error } = await supabaseAdmin.rpc(reference.startsWith("TASK-") ? "settle_task_nft_verified" : "fulfill_payment", { _reference: reference, _paid_kobo: json.data.amount });
  if (error) throw new Error(error.message);
  return r === "ok" || r === "already" ? "success" : String(r);
}

// ---------- Bank payouts (Paystack Transfers) ----------

export const listBanks = createServerFn({ method: "GET" }).handler(async () => {
  const j = await paystack<{ name: string; code: string }[]>("/bank?country=nigeria&perPage=200");
  return (j.data ?? []).map((b) => ({ name: b.name, code: b.code }));
});

export const resolveAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ acct: z.string().regex(/^\d{10}$/), bankCode: z.string().min(2).max(10) }).parse(d))
  .handler(async ({ data }) => {
    const j = await paystack<{ account_name: string }>(`/bank/resolve?account_number=${data.acct}&bank_code=${encodeURIComponent(data.bankCode)}`);
    if (!j.status || !j.data) throw new Error("Could not verify this account");
    return { name: j.data.account_name };
  });

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ amount: z.number().positive(), acct: z.string().regex(/^\d{10}$/), bankCode: z.string().min(2).max(10), bankName: z.string().min(2).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const resolved = await paystack<{ account_name: string }>(`/bank/resolve?account_number=${data.acct}&bank_code=${encodeURIComponent(data.bankCode)}`);
    if (!resolved.status || !resolved.data) throw new Error("Could not verify this bank account");
    const name = resolved.data.account_name;
    // Reserve funds atomically (validates minimum + balance).
    const { data: w, error } = await context.supabase.rpc("request_withdrawal", { _amount: data.amount, _method: "bank_transfer", _bank: data.bankName, _acct: data.acct, _name: name });
    if (error) throw new Error(error.message);
    const wd = w as unknown as { id: string; amount_usd: number };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin.from("settings").select("usd_to_ngn").single();
    const { rate } = await getUsdNgn(Number(s?.usd_to_ngn ?? 1600));
    const kobo = Math.floor(Number(wd.amount_usd) * rate * 100);
    const transferRef = `wd_${wd.id.replace(/-/g, "")}`;
    await supabaseAdmin.from("withdrawals").update({ bank_code: data.bankCode, transfer_ref: transferRef, amount_ngn_kobo: kobo }).eq("id", wd.id);
    const fail = async (msg: string) => { await supabaseAdmin.rpc("system_set_withdrawal", { _id: wd.id, _status: "failed", _note: msg }); throw new Error(`Payout failed: ${msg}. Your balance was restored.`); };
    const rec = await paystack<{ recipient_code: string }>("/transferrecipient", { method: "POST", body: { type: "nuban", name, account_number: data.acct, bank_code: data.bankCode, currency: "NGN" } });
    if (!rec.status || !rec.data) return fail(rec.message || "recipient error");
    const tr = await paystack<{ status: string; transfer_code: string }>("/transfer", { method: "POST", body: { source: "balance", amount: kobo, recipient: rec.data.recipient_code, reference: transferRef, reason: "MiningVault Groups referral payout" } });
    if (!tr.status || !tr.data) return fail(tr.message || "transfer error");
    await supabaseAdmin.from("withdrawals").update({ transfer_code: tr.data.transfer_code }).eq("id", wd.id);
    const st = tr.data.status === "success" ? "completed" : "processing";
    await supabaseAdmin.rpc("system_set_withdrawal", { _id: wd.id, _status: st, _note: `₦${(kobo / 100).toLocaleString()} to ${name}` });
    return { status: st, name, ngn: kobo / 100 };
  });

export async function settleTransfer(reference: string) {
  const j = await paystack<{ status: string }>(`/transfer/verify/${encodeURIComponent(reference)}`);
  const status = j.data?.status;
  const map: Record<string, string> = { success: "completed", failed: "failed", reversed: "failed" };
  if (!status || !map[status]) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: w } = await supabaseAdmin.from("withdrawals").select("id").eq("transfer_ref", reference).maybeSingle();
  if (w) await supabaseAdmin.rpc("system_set_withdrawal", { _id: w.id, _status: map[status], _note: status === "success" ? null as unknown as string : `Transfer ${status}` });
}

// ---------- Login history ----------

export const recordLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ method: z.string().max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const ua = getRequestHeader("user-agent")?.slice(0, 300) ?? null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("login_events").insert({ user_id: context.userId, ip, user_agent: ua, method: data.method });
    return { ok: true };
  });
