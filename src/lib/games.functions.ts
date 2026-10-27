import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RecentReward = { kind: "spin" | "box"; reward: number; jackpot: boolean; created_at: string };

export type GameStatus = {
  can_spin: boolean;
  streak: number;
  last_reward: number | null;
  can_box: boolean;
  next_box_at: string | null;
  spin_min: number;
  spin_max: number;
  box_min: number;
  box_max: number;
  streak_days: number;
  total_spins: number;
  jackpot_amount: number;
  jackpot_every: number;
  recent: RecentReward[];
};

export type SpinResult = { reward: number; streak: number; nft: string | null; jackpot: boolean; total_spins: number };

export const gameStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("game_status");
    if (error) throw new Error(error.message);
    return data as unknown as GameStatus;
  });

export const spinNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("spin_roulette");
    if (error) throw new Error(error.message);
    return data as unknown as SpinResult;
  });

export const openBox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("open_mystery_box");
    if (error) throw new Error(error.message);
    return data as unknown as { reward: number; next_at: string };
  });
