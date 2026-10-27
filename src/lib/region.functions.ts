import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CRYPTO_NETWORKS, isAfricanCountry } from "./region";

// Detects the caller's country once from the request IP headers and stores it on
// the profile. The database trigger makes the stored value immutable afterwards.
export const detectRegion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("country").eq("id", context.userId).single();
    let country = profile?.country ?? null;
    if (!country) {
      const raw = getRequestHeader("cf-ipcountry") ?? getRequestHeader("x-vercel-ip-country") ?? null;
      const code = raw?.trim().toUpperCase() ?? null;
      if (code && /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1") {
        country = code;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("profiles").update({ country }).eq("id", context.userId).is("country", null);
      }
    }
    const { data: req } = await context.supabase.from("crypto_access_requests").select("status").eq("user_id", context.userId).maybeSingle();
    return { country, isAfrican: isAfricanCountry(country), cryptoStatus: req?.status ?? null };
  });

export const requestCryptoAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: existing } = await context.supabase.from("crypto_access_requests").select("status").eq("user_id", context.userId).maybeSingle();
    if (existing?.status === "pending" || existing?.status === "approved") return { status: existing.status };
    if (existing?.status === "rejected") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("crypto_access_requests").update({ status: "pending", reviewed_at: null }).eq("user_id", context.userId);
      if (error) throw new Error(error.message);
      return { status: "pending" };
    }
    const { error } = await context.supabase.from("crypto_access_requests").insert({ user_id: context.userId });
    if (error) throw new Error(error.message);
    return { status: "pending" };
  });

// Crypto payouts are not auto-sent like bank transfers; the withdrawal is reserved
// and an admin marks it paid after sending the crypto manually.
export const requestCryptoPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    amount: z.number().positive(),
    network: z.enum(CRYPTO_NETWORKS),
    address: z.string().trim().min(10).max(120),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("display_name, email").eq("id", context.userId).single();
    const { data: w, error } = await context.supabase.rpc("request_withdrawal", {
      _amount: data.amount, _method: "crypto", _bank: data.network, _acct: data.address,
      _name: profile?.display_name || profile?.email || "Crypto payout",
    });
    if (error) throw new Error(error.message);
    return { reference: (w as unknown as { reference: string }).reference };
  });

export const reviewCryptoRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("review_crypto_request", { _user: data.userId, _approve: data.approve });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
