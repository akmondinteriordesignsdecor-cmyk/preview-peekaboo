import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Empty, Stat, StatusBadge } from "@/components/Brand";
import { balancesQ, myCryptoRequestQ, profileQ, referralStatsQ, settingsQ, withdrawalsQ } from "@/lib/data";
import { dt, usd } from "@/lib/format";
import { useServerFn } from "@tanstack/react-start";
import { listBanks, requestPayout, resolveAccount } from "@/lib/paystack.functions";
import { detectRegion, requestCryptoAccess, requestCryptoPayout } from "@/lib/region.functions";
import { CRYPTO_NETWORKS } from "@/lib/region";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({ meta: [{ title: "Referrals & withdrawals — MiningVault Groups" }, { name: "description", content: "Share your link, earn 50% and withdraw." }, { property: "og:title", content: "Referrals — MiningVault Groups" }, { property: "og:description", content: "Earn 50% of every plan your referrals buy." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Referrals,
});

type Region = { country: string | null; isAfrican: boolean; cryptoStatus: string | null };

function Referrals() {
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQ);
  const { data: b } = useQuery(balancesQ);
  const { data: s } = useQuery(settingsQ);
  const { data: stats } = useQuery(referralStatsQ);
  const { data: wds } = useQuery(withdrawalsQ);
  const { data: cryptoReq } = useQuery(myCryptoRequestQ);
  const [f, setF] = useState({ amount: "", bank: "", code: "", acct: "", name: "" });
  const [cf, setCf] = useState({ network: CRYPTO_NETWORKS[0] as string, address: "" });
  const [method, setMethod] = useState<"bank" | "crypto">("bank");
  const [region, setRegion] = useState<Region | null>(null);
  const { data: banks } = useQuery({ queryKey: ["banks"], queryFn: () => listBanks(), staleTime: 864e5 });
  const resolve = useServerFn(resolveAccount);
  const payout = useServerFn(requestPayout);
  const cryptoPayout = useServerFn(requestCryptoPayout);
  const detect = useServerFn(detectRegion);
  const askCrypto = useServerFn(requestCryptoAccess);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    detect().then(setRegion).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setF((x) => ({ ...x, name: "" }));
    if (f.acct.length !== 10 || !f.code) return;
    resolve({ data: { acct: f.acct, bankCode: f.code } }).then((r) => setF((x) => ({ ...x, name: r.name }))).catch(() => toast.error("Could not verify account"));
  }, [f.acct, f.code]); // eslint-disable-line react-hooks/exhaustive-deps

  const [confirm, setConfirm] = useState(false);
  const link = profile ? `${typeof window !== "undefined" ? window.location.origin : ""}/auth?ref=${profile.referral_code}` : "";
  const avail = Number(b?.referral_available ?? 0);
  const min = Number(b?.min_withdrawal_usd ?? 5);
  const amt = Number(f.amount);
  const cryptoStatus = cryptoReq?.status ?? region?.cryptoStatus ?? null;
  const cryptoAllowed = region ? !region.isAfrican || cryptoStatus === "approved" : false;
  const valid = amt >= min && amt <= avail && !busy
    && (method === "bank" ? !!f.code && f.acct.length === 10 && f.name.length > 1 : cf.address.trim().length >= 10);

  async function submit() {
    setBusy(true);
    try {
      if (method === "crypto") {
        const r = await cryptoPayout({ data: { amount: amt, network: cf.network, address: cf.address.trim() } });
        toast.success(`Crypto withdrawal ${r.reference} requested — it will be reviewed and sent to your wallet`);
        setCf({ network: CRYPTO_NETWORKS[0], address: "" });
        setF((x) => ({ ...x, amount: "" }));
      } else {
        const r = await payout({ data: { amount: amt, acct: f.acct, bankCode: f.code, bankName: f.bank } });
        toast.success(r.status === "completed" ? `₦${r.ngn.toLocaleString()} sent to ${r.name}` : `₦${r.ngn.toLocaleString()} payout is on its way to ${r.name}`);
        setF({ amount: "", bank: "", code: "", acct: "", name: "" });
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); qc.invalidateQueries(); }
  }
  async function cancel(id: string) {
    const { error } = await supabase.rpc("cancel_withdrawal", { _id: id });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries();
  }
  async function requestCrypto() {
    setBusy(true);
    try {
      await askCrypto();
      toast.success("Request sent — an admin will review it");
      qc.invalidateQueries({ queryKey: ["my-crypto-request"] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6 shadow-glow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Invite friends, earn <span className="text-gold">{s?.referral_commission_pct ?? 50}%</span></h1>
          <Button asChild variant="outline" size="sm"><Link to="/influencer"><Megaphone /> Influencer</Link></Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">You earn when someone you invited pays for a plan and starts mining.</p>
        <div className="mt-4 flex gap-2">
          <Input readOnly value={link} className="num" />
          <Button variant="gold" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}><Copy /> Copy</Button>
        </div>
        <p className="mt-2 text-sm">Your code: <span className="num text-primary">{profile?.referral_code}</span></p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Available" value={usd(avail)} tone="gold" />
        <Stat label="Total earned" value={usd(b?.referral_total)} />
        <Stat label="Reserved" value={usd(b?.referral_reserved)} hint="Pending withdrawals" />
        <Stat label="Withdrawn" value={usd(b?.referral_withdrawn)} />
        <Stat label="Eligible referrals" value={String(stats?.eligible ?? 0)} />
        <Stat label="Pending referrals" value={String((stats?.total ?? 0) - (stats?.eligible ?? 0))} hint="Signed up, not mining yet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel space-y-3 p-5">
          <h2 className="font-semibold">Withdraw referral earnings</h2>
          {cryptoAllowed && (
            <div className="flex gap-2">
              <Button size="sm" variant={method === "bank" ? "gold" : "outline"} onClick={() => setMethod("bank")}>Bank (NGN)</Button>
              <Button size="sm" variant={method === "crypto" ? "gold" : "outline"} onClick={() => setMethod("crypto")}>Crypto</Button>
            </div>
          )}
          {method === "bank" ? (
            <>
              <p className="text-xs text-muted-foreground">Minimum {usd(min)} · available {usd(avail)}. Paid automatically to your Nigerian bank account in naira at today's rate.</p>
              <div><Label>Amount (USD)</Label><Input type="number" min={min} step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
              <div><Label>Bank</Label>
                <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value, bank: banks?.find((b) => b.code === e.target.value)?.name ?? "" })}>
                  <option value="">Select your bank</option>
                  {banks?.map((b) => <option key={b.code + b.name} value={b.code}>{b.name}</option>)}
                </select></div>
              <div><Label>Account number</Label><Input inputMode="numeric" maxLength={10} value={f.acct} onChange={(e) => setF({ ...f, acct: e.target.value.replace(/\D/g, "") })} /></div>
              {f.name && <p className="text-sm text-success">✓ {f.name}</p>}
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Minimum {usd(min)} · available {usd(avail)}. Sent to your crypto wallet after a quick review.</p>
              <div><Label>Amount (USD)</Label><Input type="number" min={min} step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
              <div><Label>Network</Label>
                <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={cf.network} onChange={(e) => setCf({ ...cf, network: e.target.value })}>
                  {CRYPTO_NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select></div>
              <div><Label>Wallet address</Label><Input value={cf.address} onChange={(e) => setCf({ ...cf, address: e.target.value })} placeholder="Your receiving address" /></div>
            </>
          )}
          {f.amount && amt < min && <p className="text-xs text-destructive">Minimum withdrawal is {usd(min)}</p>}
          {amt > avail && <p className="text-xs text-destructive">Amount exceeds your available balance</p>}
          <Button variant="gold" className="w-full" disabled={!valid} onClick={() => setConfirm(true)}>Request withdrawal</Button>
          {region?.isAfrican && cryptoStatus !== "approved" && (
            <div className="rounded-lg border p-3 text-xs text-muted-foreground">
              <p>Crypto withdrawals aren't available for accounts registered in Africa.</p>
              {cryptoStatus === "pending" ? (
                <p className="mt-1 text-gold">Your crypto access request is awaiting review.</p>
              ) : (
                <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={requestCrypto}>Request crypto withdrawals</Button>
              )}
            </div>
          )}
        </div>
        <div className="panel p-5">
          <h2 className="font-semibold">Your referrals</h2>
          <div className="mt-3 space-y-2">
            {stats?.list.length ? stats.list.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm"><div><p>{r.name}</p><p className="text-xs text-muted-foreground">{dt(r.joined)}</p></div><StatusBadge s={r.eligible ? "confirmed" : "pending"} /></div>
            )) : <Empty text="Nobody has joined with your link yet" />}
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="font-semibold">Withdrawal history</h2>
        <div className="mt-3 overflow-x-auto">
          {wds?.length ? (
            <table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Date</th><th>Reference</th><th>Method</th><th>Amount</th><th>Status</th><th /></tr></thead>
              <tbody>{wds.map((w) => (
                <tr key={w.id} className="border-t"><td className="py-2">{dt(w.created_at)}</td><td className="num text-xs">{w.reference}</td><td className="text-xs">{w.method === "crypto" ? `Crypto · ${w.bank_name}` : "Bank"}</td><td className="num">{usd(w.amount_usd)}</td><td><StatusBadge s={w.status} /></td>
                  <td>{["requested", "pending_review"].includes(w.status) && <Button size="sm" variant="ghost" onClick={() => cancel(w.id)}>Cancel</Button>}</td></tr>
              ))}</tbody></table>
          ) : <Empty text="No withdrawals yet" />}
        </div>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm withdrawal</AlertDialogTitle>
            <AlertDialogDescription>{method === "crypto"
              ? `${usd(amt)} in ${cf.network} to ${cf.address.trim()}. It will be sent to this wallet after review.`
              : `${usd(amt)} to ${f.name} · ${f.bank} ${f.acct}. It will be sent to this account right away.`}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Back</AlertDialogCancel><AlertDialogAction onClick={submit}>Confirm</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
