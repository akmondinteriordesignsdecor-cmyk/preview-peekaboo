import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Gem, Sparkles, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Empty, StatusBadge } from "@/components/Brand";
import { rolesQ, withdrawalsQ } from "@/lib/data";
import { dt, usd } from "@/lib/format";
import { reviewWithdrawal } from "@/lib/withdrawal-review.functions";
import { moderateMarket, setPurchaseDiscount } from "@/lib/marketplace.functions";
import { reviewCryptoRequest } from "@/lib/region.functions";
import { nftListingsQ, p2pListingsQ, settingsQ } from "@/lib/data";
import { createNft, updateNft } from "@/lib/nft-admin.functions";
import { NftTaskAdmin } from "@/components/NftTaskAdmin";
import { InfluencerAdmin } from "@/components/InfluencerAdmin";
import { CollaborationRequests } from "@/components/CollaborationRequests";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — MiningVault Groups" }, { name: "description", content: "Review MiningVault Groups withdrawals." }, { property: "og:title", content: "Admin — MiningVault Groups" }, { property: "og:description", content: "Admin panel." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Admin,
});

type Flag = { issue: string; reason: string };

function Admin() {
  const qc = useQueryClient();
  const { data: roles } = useQuery(rolesQ);
  const isAdmin = !!roles?.some((r) => r.role === "admin");
  const { data: wds } = useQuery(withdrawalsQ);
  const { data: reviews } = useQuery({ queryKey: ["withdrawal_reviews"], enabled: isAdmin, queryFn: async () => (await supabase.from("withdrawal_reviews").select("*").order("created_at", { ascending: false })).data ?? [] });
  const { data: audit } = useQuery({ queryKey: ["admin_audit_log"], enabled: isAdmin, queryFn: async () => (await supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [] });
  const review = useServerFn(reviewWithdrawal);
  const [open, setOpen] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  if (!isAdmin) return <Empty text="Admins only" />;

  async function set(id: string, status: string) {
    const note = status === "rejected" || status === "failed" ? prompt("Reason (shown to user)") ?? "" : null;
    const { error } = await supabase.rpc("admin_set_withdrawal", { _id: id, _status: status, _note: note as string });
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${status}`); qc.invalidateQueries();
  }
  async function runReview(id: string) {
    setBusy(true);
    try { await review({ data: { id, details } }); toast.success("AI review ready"); setDetails(""); qc.invalidateQueries({ queryKey: ["withdrawal_reviews"] }); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Withdrawal review</h1>
      <div className="space-y-3">
        {wds?.length ? wds.map((w) => {
          const isOpen = ["requested", "pending_review", "processing"].includes(w.status);
          const latest = reviews?.find((r) => r.withdrawal_id === w.id);
          const flags = (latest?.flags as Flag[] | undefined) ?? [];
          return (
            <div key={w.id} className="panel space-y-3 p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="num font-semibold">{usd(w.amount_usd)} <span className="ml-2 text-xs font-normal text-muted-foreground">{w.reference}</span></p>
                  <p className="text-xs text-muted-foreground">{dt(w.created_at)} · {w.account_name} · {w.bank_name} · {w.account_number}</p>
                </div>
                <StatusBadge s={w.status} />
              </div>
              {latest && (
                <div className="rounded-lg border p-3">
                  <p className="mb-1 flex items-center gap-1 text-xs font-medium"><Sparkles className="size-3.5 text-gold" /> AI summary · risk <span className={latest.risk === "high" ? "text-destructive" : latest.risk === "medium" ? "text-gold" : "text-primary"}>{latest.risk}</span></p>
                  <p>{latest.summary}</p>
                  {flags.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">{flags.map((f, i) => <li key={i}><span className="font-medium">{f.issue}</span> — {f.reason}</li>)}</ul>}
                  <p className="mt-2 text-[10px] text-muted-foreground">Reviewed {dt(latest.created_at)}. Suggestions only. Check before acting.</p>
                </div>
              )}
              {open === w.id && (
                <div className="space-y-2">
                  <Textarea placeholder="Add details for the AI, e.g. what the user told support or anything you noticed" value={details} onChange={(e) => setDetails(e.target.value)} />
                  <Button size="sm" variant="gold" disabled={busy} onClick={() => runReview(w.id)}><Sparkles /> {busy ? "Reviewing…" : "Run AI review"}</Button>
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" onClick={() => { setOpen(open === w.id ? null : w.id); setDetails(""); }}><Sparkles /> {latest ? "Review again" : "AI review"}</Button>
                {isOpen && <>
                  {w.status !== "processing" && <Button size="sm" variant="outline" onClick={() => set(w.id, "processing")}>Processing</Button>}
                  <Button size="sm" variant="gold" onClick={() => set(w.id, "completed")}>Paid</Button>
                  <Button size="sm" variant="ghost" onClick={() => set(w.id, "rejected")}>Reject</Button>
                </>}
              </div>
            </div>
          );
        }) : <div className="panel p-5"><Empty text="No withdrawals" /></div>}
      </div>

      <h2 className="text-xl font-semibold">Admin audit log</h2>
      <div className="panel overflow-x-auto p-5">
        {audit?.length ? (
          <table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">When</th><th>Change</th><th>User</th><th>Made by</th></tr></thead>
            <tbody>{audit.map((a) => (
              <tr key={a.id} className="border-t"><td className="py-2 whitespace-nowrap">{dt(a.created_at)}</td><td>{a.action === "role_granted" ? "Granted" : a.action === "role_removed" ? "Removed" : "Changed"} {a.role}</td><td className="text-xs">{a.target_email ?? a.target_user_id}</td><td className="text-xs">{a.actor_email}</td></tr>
            ))}</tbody></table>
        ) : <Empty text="No role changes recorded yet" />}
      </div>

      <h2 className="text-xl font-semibold">NFT manager</h2>
      <NftManager />
      <NftTaskAdmin />
      <InfluencerAdmin />
      <CollaborationRequests admin />
      <CryptoRequests />
      <MarketplaceAdmin />
    </div>
  );
}

function CryptoRequests() {
  const qc = useQueryClient();
  const { data: reqs } = useQuery({
    queryKey: ["crypto-requests"],
    queryFn: async () => (await supabase.from("crypto_access_requests").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const ids = reqs?.map((r) => r.user_id) ?? [];
  const { data: people } = useQuery({
    queryKey: ["crypto-request-profiles", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => (await supabase.from("profiles").select("id, email, display_name, country").in("id", ids)).data ?? [],
  });
  const review = useServerFn(reviewCryptoRequest);
  const [busy, setBusy] = useState(false);
  async function act(userId: string, approve: boolean) {
    setBusy(true);
    try { await review({ data: { userId, approve } }); toast.success(approve ? "Crypto access approved" : "Request declined"); qc.invalidateQueries({ queryKey: ["crypto-requests"] }); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Crypto withdrawal requests</h2>
      <div className="panel divide-y">
        {reqs?.length ? reqs.map((r) => {
          const p = people?.find((x) => x.id === r.user_id);
          return (
            <div key={r.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-medium">{p?.display_name || p?.email || r.user_id}</p>
                <p className="text-xs text-muted-foreground">Registered region: {p?.country ?? "unknown"} · requested {dt(r.created_at)}</p>
              </div>
              {r.status === "pending" ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="gold" disabled={busy} onClick={() => act(r.user_id, true)}>Approve</Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(r.user_id, false)}>Decline</Button>
                </div>
              ) : <StatusBadge s={r.status} />}
            </div>
          );
        }) : <div className="p-5"><Empty text="No crypto withdrawal requests" /></div>}
      </div>
    </section>
  );
}

function NftManager() {
  const qc = useQueryClient();
  const { data: nfts } = useQuery({
    queryKey: ["admin-nfts"],
    queryFn: async () => (await supabase.from("nfts").select("*").eq("history_hidden", false).order("sort")).data ?? [],
  });
  const create = useServerFn(createNft);
  const update = useServerFn(updateNft);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [discount, setDiscount] = useState("0");
  const moderate = useServerFn(moderateMarket);
  const [img, setImg] = useState<File | null>(null);
  const [model, setModel] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("nft-media").upload(path, file);
    if (error) throw new Error(error.message);
    return path;
  }

  async function submit() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setBusy(true);
    try {
      const image_url = img ? await upload(img) : undefined;
      const model_url = model ? await upload(model) : undefined;
      await create({ data: { name: name.trim(), description: desc.trim() || undefined, image_url, model_url, price_usd: price ? Number(price) : null, quantity: quantity ? Number(quantity) : null, discount_pct: Number(discount) } });
      toast.success("NFT created");
      setQuantity(""); setDiscount("0");
      setName(""); setDesc(""); setPrice(""); setImg(null); setModel(null);
      qc.invalidateQueries({ queryKey: ["admin-nfts"] });
      qc.invalidateQueries({ queryKey: ["nfts"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, active: boolean) {
    try {
      await update({ data: { id, active } });
      qc.invalidateQueries({ queryKey: ["admin-nfts"] });
      qc.invalidateQueries({ queryKey: ["nfts"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="panel space-y-4 p-5">
        <p className="text-sm text-muted-foreground">Upload an image and optionally a 3D model (.glb/.gltf). Leave the price empty to make it a reward-only NFT (given out for spin streaks).</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nft-name">Name</Label>
            <Input id="nft-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Golden Pickaxe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nft-price">Price in USD (empty = reward only)</Label>
            <Input id="nft-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="nft-quantity">Buyer quantity (optional)</Label><Input id="nft-quantity" type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Unlimited" /></div><div className="space-y-2"><Label htmlFor="nft-discount">Discount % (optional)</Label><Input id="nft-discount" type="number" min="0" max="99" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div></div>
        <div className="space-y-2">
          <Label htmlFor="nft-desc">Description</Label>
          <Textarea id="nft-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What makes this piece special" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nft-img">Image</Label>
            <Input id="nft-img" type="file" accept="image/*" onChange={(e) => setImg(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nft-model">3D model (optional)</Label>
            <Input id="nft-model" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={(e) => setModel(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <Button variant="gold" disabled={busy} onClick={submit}><Upload /> {busy ? "Uploading…" : "Create NFT"}</Button>
      </div>

      <div className="panel divide-y">
        {nfts?.length ? nfts.map((n) => (
          <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div className="flex items-center gap-3">
              <Gem className="size-4 text-gold" />
              <div>
                <p className="font-medium">{n.name} {n.model_url && <span className="ml-1 rounded-full border border-gold/40 px-1.5 text-[10px] text-gold">3D</span>}</p>
                <p className="text-xs text-muted-foreground">{n.price_usd != null ? usd(n.price_usd) : "Reward only"} · {dt(n.created_at)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={async () => { const value = prompt("Buyer quantity (empty for unlimited)", n.quantity?.toString() ?? ""); if (value === null) return; try { await update({ data: { id: n.id, quantity: value === "" ? null : Number(value) } }); qc.invalidateQueries(); } catch(e) { toast.error((e as Error).message); } }}>Quantity: {n.quantity ?? "Unlimited"}</Button><Button size="sm" variant="outline" onClick={async () => { const value = prompt("Discount percentage (0–99)", String(n.discount_pct)); if (value === null) return; try { await update({ data: { id: n.id, discount_pct: Number(value) } }); qc.invalidateQueries(); } catch(e) { toast.error((e as Error).message); } }}>Discount: {n.discount_pct}%</Button><Button size="sm" variant="destructive" onClick={async () => { if (!confirm("Remove this NFT and hide its listing history? Payment records will be retained.")) return; try { await moderate({ data: { kind: "nft_history", id: n.id } }); qc.invalidateQueries(); } catch(e) { toast.error((e as Error).message); } }}>Remove</Button>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Visible
              <Switch checked={n.active} onCheckedChange={(v) => toggle(n.id, v)} />
            </label></div>
          </div>
        )) : <div className="p-5"><Empty text="No NFTs created yet" /></div>}
      </div>
    </div>
  );
}

function MarketplaceAdmin() {
  const qc = useQueryClient();
  const { data: settings } = useQuery(settingsQ);
  const { data: listings } = useQuery(nftListingsQ);
  const { data: coinListings } = useQuery(p2pListingsQ);
  const { data: accounts } = useQuery({ queryKey: ["admin-market-accounts"], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("id, email, display_name, marketplace_blocked").order("created_at", { ascending: false }); if(error) throw new Error(error.message); return data; } });
  const discount = useServerFn(setPurchaseDiscount);
  const moderate = useServerFn(moderateMarket);
  const [percentage, setPercentage] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(kind: "account" | "listing" | "coin_listing", id: string, blocked = true) {
    setBusy(true); try { await moderate({ data: { kind, id, blocked } }); toast.success("Marketplace updated"); qc.invalidateQueries(); } catch(e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="space-y-5"><h2 className="text-xl font-semibold">Discounts & marketplace moderation</h2>
    <div className="flex max-w-md flex-wrap items-end gap-3"><div className="space-y-2"><Label htmlFor="purchase-discount">Purchase discount % (optional)</Label><Input id="purchase-discount" type="number" min="0" max="99" value={percentage} placeholder={String(settings?.purchase_discount_pct ?? 0)} onChange={(e) => setPercentage(e.target.value)} /></div><Button variant="gold" disabled={busy} onClick={async () => { setBusy(true); try { await discount({ data: { percentage: Number(percentage || 0) } }); toast.success("Discount saved"); qc.invalidateQueries(); } catch(e) { toast.error((e as Error).message); } finally { setBusy(false); } }}>Save</Button><p className="text-xs text-muted-foreground">Current: {settings?.purchase_discount_pct ?? 0}% · plans, coins and NFT drops</p></div>
    <h3 className="font-semibold">Accounts</h3><div className="divide-y">{accounts?.map((a) => <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p>{a.display_name}</p><p className="text-xs text-muted-foreground">{a.email}</p></div><Button size="sm" variant={a.marketplace_blocked ? "outline" : "destructive"} disabled={busy} onClick={() => act("account", a.id, !a.marketplace_blocked)}>{a.marketplace_blocked ? "Restore marketplace" : "Delist account"}</Button></div>)}</div>
    <h3 className="font-semibold">Member NFT listings</h3>{listings?.filter((l) => !l.history_hidden).map((l) => <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3 text-sm"><span>{l.nfts?.name} · {l.status} · {l.price_mvg} MVG</span><Button size="sm" variant="destructive" disabled={busy} onClick={() => act("listing", l.id)}>Remove listing & history</Button></div>)}
    <h3 className="font-semibold">Coin listings</h3>{coinListings?.filter((l) => l.status === "open").map((l) => <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3 text-sm"><span>{l.mvt_amount} MVG · {usd(l.price_usd)}</span><Button size="sm" variant="destructive" disabled={busy} onClick={() => act("coin_listing", l.id)}>Delist</Button></div>)}
  </section>;
}
