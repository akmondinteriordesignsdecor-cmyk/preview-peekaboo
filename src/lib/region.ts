// ISO 3166-1 alpha-2 codes for African countries. Used to gate crypto withdrawals:
// accounts registered from an African IP use bank (NGN) payouts unless an admin
// approves a crypto access request.
export const AFRICAN_COUNTRIES = new Set([
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG", "CD", "CI",
  "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR",
  "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN",
  "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "ZM", "ZW", "EH",
]);

export function isAfricanCountry(code: string | null | undefined): boolean {
  return !!code && AFRICAN_COUNTRIES.has(code.toUpperCase());
}

export const CRYPTO_NETWORKS = ["USDT TRC20", "USDT ERC20", "BTC"] as const;
