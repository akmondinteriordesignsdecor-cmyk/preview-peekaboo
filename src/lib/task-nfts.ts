import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function result<T>(response: { data: T; error: { message: string } | null }) {
  if (response.error) throw new Error(response.error.message);
  return response.data;
}
export const tasksQ = queryOptions({ queryKey: ["nft-tasks"], queryFn: async () => result(await supabase.from("nft_tasks").select("*, nfts(*)").order("created_at", { ascending: false })) ?? [] });
export const submissionsQ = queryOptions({ queryKey: ["nft-task-submissions"], queryFn: async () => result(await supabase.from("nft_task_submissions").select("*, nft_tasks(title, award_quantity, nfts(name))").order("created_at", { ascending: false })) ?? [] });
export const taskCollectionQ = queryOptions({ queryKey: ["task-nft-collection"], queryFn: async () => {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in first");
  return result(await supabase.from("task_nft_instances").select("*, nfts(*)").eq("user_id", auth.user.id).order("created_at", { ascending: false })) ?? [];
} });
export const taskListingsQ = queryOptions({ queryKey: ["task-nft-listings"], queryFn: async () => result(await supabase.from("task_nft_listings").select("*, nfts(*)").order("created_at", { ascending: false })) ?? [] });
export const taskOrdersQ = queryOptions({ queryKey: ["task-nft-orders"], queryFn: async () => result(await supabase.from("task_nft_orders").select("*").order("created_at", { ascending: false })) ?? [] });

export function miningSaleReward(usd: number, ratePerFive: number) {
  if (!Number.isFinite(usd) || !Number.isFinite(ratePerFive) || usd < 0 || ratePerFive < 0) return 0;
  return Math.round(usd / 5 * ratePerFive * 1e8) / 1e8;
}

export async function taskRpc<T>(request: PromiseLike<{ data: T; error: { message: string } | null }>) {
  return result(await request);
}