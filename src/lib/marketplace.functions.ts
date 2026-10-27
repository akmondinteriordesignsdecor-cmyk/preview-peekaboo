import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const nftMarketAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ action: z.enum(["list", "buy", "cancel"]), id: z.string().uuid(), price: z.number().positive().max(100000000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("nft_market_action", { _action: data.action, _id: data.id, _price: data.price ?? null as unknown as number });
    if (error) throw new Error(error.message);
    return result;
  });

export const moderateMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kind: z.enum(["account", "nft", "nft_history", "listing", "coin_listing"]), id: z.string().uuid(), blocked: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Admins only");
    const { error } = data.kind === "coin_listing"
      ? await context.supabase.rpc("moderate_coin_listing", { _id: data.id })
      : await context.supabase.rpc("moderate_market", { _kind: data.kind, _id: data.id, _blocked: data.blocked ?? true });
    if (error) throw new Error(error.message);
    if (data.kind === "account" && data.blocked !== false) {
      const { data: listings } = await context.supabase.from("p2p_listings").select("id").eq("user_id", data.id).eq("status", "open");
      for (const listing of listings ?? []) {
        const { error: cancelError } = await context.supabase.rpc("moderate_coin_listing", { _id: listing.id });
        if (cancelError) throw new Error(cancelError.message);
      }
    }
    return { ok: true };
  });

export const setPurchaseDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ percentage: z.number().min(0).max(99) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Admins only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("settings").update({ purchase_discount_pct: data.percentage }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });