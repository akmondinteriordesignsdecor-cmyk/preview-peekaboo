export const usd = (n: number | string | null | undefined) =>
  `$${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const mvt = (n: number | string | null | undefined) =>
  `${Number(n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 4 })} MVG`;
export const dt = (s: string | null | undefined) => (s ? new Date(s).toLocaleString() : "—");
