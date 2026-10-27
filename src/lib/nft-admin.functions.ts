import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

const nftSchema = z.object({
  quantity: z.number().int().min(0).nullable().optional(),
  discount_pct: z.number().min(0).max(99).optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  image_url: z.string().max(500).optional(),
  model_url: z.string().max(500).optional(),
  price_usd: z.number().positive().max(100000).nullable().optional(),
  sort: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const createNft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => nftSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row: TablesInsert<"nfts"> = {
      quantity: data.quantity ?? null,
      discount_pct: data.discount_pct ?? 0,
      verified: true,
      name: data.name,
      description: data.description ?? null,
      image_url: data.image_url ?? null,
      model_url: data.model_url ?? null,
      price_usd: data.price_usd ?? null,
      sort: data.sort ?? 0,
      active: data.active ?? true,
    };
    const { error } = await supabaseAdmin.from("nfts").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateNft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => nftSchema.partial().extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...fields } = data;
    const row: TablesUpdate<"nfts"> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) (row as Record<string, unknown>)[k] = v;
    }
    const { error } = await supabaseAdmin.from("nfts").update(row).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
