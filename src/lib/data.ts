import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Balances = {
  mvt_confirmed: number; mvt_pending: number; referral_total: number; referral_available: number;
  referral_reserved: number; referral_withdrawn: number; presale_mvt: number; mvt_per_usd: number; min_withdrawal_usd: number;
};

const unwrap = <T,>(r: { data: T; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data as NonNullable<T>;
};

export const balancesQ = queryOptions({
  queryKey: ["balances"],
  queryFn: async () => (await supabase.rpc("get_balances")).data as unknown as Balances,
});
export const plansQ = queryOptions({
  queryKey: ["plans"],
  queryFn: async () => unwrap(await supabase.from("plans").select("*").eq("active", true).order("sort")),
});
export const settingsQ = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => unwrap(await supabase.from("settings").select("*").single()),
});
export const profileQ = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Sign in first");
    return unwrap(await supabase.from("profiles").select("*").eq("id", u.user.id).single());
  },
});
export const sessionsQ = queryOptions({
  queryKey: ["sessions"],
  queryFn: async () => unwrap(await supabase.from("mining_sessions").select("*, plan_purchases(plans(name, capacity_ths))").order("started_at", { ascending: false }).limit(50)),
});
export const purchasesQ = queryOptions({
  queryKey: ["purchases"],
  queryFn: async () => unwrap(await supabase.from("plan_purchases").select("*, plans(*)").order("created_at", { ascending: false })),
});
export const ledgerQ = queryOptions({
  queryKey: ["ledger"],
  queryFn: async () => unwrap(await supabase.from("ledger_entries").select("*").order("created_at", { ascending: false }).limit(200)),
});
export const withdrawalsQ = queryOptions({
  queryKey: ["withdrawals"],
  queryFn: async () => unwrap(await supabase.from("withdrawals").select("*").order("created_at", { ascending: false })),
});
export const paymentsQ = queryOptions({
  queryKey: ["payments"],
  queryFn: async () => unwrap(await supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(100)),
});
export const notificationsQ = queryOptions({
  queryKey: ["notifications"],
  queryFn: async () => unwrap(await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30)),
});
export const referralStatsQ = queryOptions({
  queryKey: ["referral-stats"],
  queryFn: async () => (await supabase.rpc("referral_stats")).data as unknown as { total: number; eligible: number; list: { name: string; joined: string; eligible: boolean }[] },
});
export const p2pListingsQ = queryOptions({
  queryKey: ["p2p-listings"],
  queryFn: async () => unwrap(await supabase.from("p2p_listings").select("*").order("created_at", { ascending: false }).limit(100)),
});
export const p2pOrdersQ = queryOptions({
  queryKey: ["p2p-orders"],
  queryFn: async () => unwrap(await supabase.from("p2p_orders").select("*, p2p_listings(side, user_id)").order("created_at", { ascending: false }).limit(50)),
});
export const tradableQ = queryOptions({
  queryKey: ["tradable"],
  queryFn: async () => {
    const rows = unwrap(await supabase.from("ledger_entries").select("account, amount").in("account", ["tradable_mvt", "p2p_escrow"]));
    const sum = (a: string) => rows.filter((r) => r.account === a).reduce((t, r) => t + Number(r.amount), 0);
    return { tradable: sum("tradable_mvt"), escrow: sum("p2p_escrow") };
  },
});
export const listingAlertQ = queryOptions({
  queryKey: ["listing-alert"],
  queryFn: async () => (await supabase.from("listing_alerts").select("*").maybeSingle()).data,
});
export const rolesQ = queryOptions({
  queryKey: ["roles"],
  queryFn: async () => unwrap(await supabase.from("user_roles").select("role")),
});
export const whitelistQ = queryOptions({
  queryKey: ["whitelist"],
  queryFn: async () => unwrap(await supabase.from("whitelist").select("*").maybeSingle()),
});
export const loginsQ = queryOptions({
  queryKey: ["logins"],
  queryFn: async () => unwrap(await supabase.from("login_events").select("*").order("created_at", { ascending: false }).limit(20)),
});
export const nftsQ = queryOptions({
  queryKey: ["nfts"],
  queryFn: async () => unwrap(await supabase.from("nfts").select("*").eq("active", true).is("mining_plan_id", null).order("sort")),
});
export const myNftsQ = queryOptions({
  queryKey: ["my-nfts"],
  queryFn: async () => unwrap(await supabase.from("nft_ownerships").select("*, nfts(*, plans(price_usd))").order("created_at", { ascending: false })),
});
export const myCryptoRequestQ = queryOptions({
  queryKey: ["my-crypto-request"],
  queryFn: async () => (await supabase.from("crypto_access_requests").select("*").maybeSingle()).data,
});

export const nftListingsQ = queryOptions({
  queryKey: ["nft-listings"],
  queryFn: async () => unwrap(await supabase.from("nft_listings").select("*, nfts(*, plans(name))").order("created_at", { ascending: false })),
});
export const nftInventoryQ = queryOptions({
  queryKey: ["nft-inventory"],
  queryFn: async () => unwrap(await supabase.rpc("nft_inventory")),
});

export type MiningNftTimeline = {
  ownership_id: string; name: string; created_at: string; owned: boolean; access: string;
  events: { id: string; kind: string; occurred_at: string | null; by_you: boolean; to_you: boolean;
    details: { amount_usd?: number; price_mvg?: number; previous_plan?: string; historical?: boolean } }[];
};
export const miningNftTimelineQ = queryOptions({
  queryKey: ["mining-nft-timeline"],
  queryFn: async () => unwrap(await supabase.rpc("my_mining_nft_timeline")) as unknown as MiningNftTimeline[],
});
