// Live USD→NGN rate with fallback to the admin setting.
export async function getUsdNgn(fallback: number): Promise<{ rate: number; live: boolean }> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(4000) });
    const j = (await res.json()) as { result?: string; rates?: Record<string, number> };
    const r = j.rates?.['NGN'];
    if (j.result === "success" && r && r > 100) return { rate: Math.round(r * 100) / 100, live: true };
  } catch { /* fall through */ }
  return { rate: fallback, live: false };
}

export async function paystack<T = unknown>(path: string, init?: { method?: string; body?: unknown }) {
  const secret = (process.env["PAYSTACK_SECRET_KEY"] ?? process.env["STRIPE_TEST_API_KEY"]);
  if (!secret) throw new Error("Payments are not configured yet");
  const res = await fetch(`https://api.paystack.co${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : null,
  });
  return (await res.json()) as { status: boolean; message: string; data?: T };
}
