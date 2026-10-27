import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Wallet, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { prepareCryptoNft, verifyCryptoNft } from "@/lib/crypto-nft.functions";
import { WALLETCONNECT_PROJECT_ID, NFT_RECEIVING_WALLET, BNB_USDT, BNB_RPC } from "@/lib/crypto-nft";

type WalletProvider = Awaited<ReturnType<typeof import("@walletconnect/ethereum-provider")["EthereumProvider"]["init"]>>;
export function CryptoNftCheckout({ nft, onClose }: { nft: { id: string; name: string } | null; onClose: () => void }) {
  const provider = useRef<WalletProvider | null>(null);
  const qc = useQueryClient();
  const prepare = useServerFn(prepareCryptoNft);
  const verify = useServerFn(verifyCryptoNft);
  const [wallet, setWallet] = useState("");
  const accountChanged = useRef((accounts: string[]) => setWallet(accounts[0] ?? ""));
  const disconnected = useRef(() => setWallet(""));
  const [busy, setBusy] = useState(false);
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const { data: checkouts } = useQuery({ queryKey: ["crypto-nft-checkouts"], queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return [];
    const { data, error } = await supabase.from("crypto_nft_checkouts").select("*, payments(nft_id, quote_expires_at)").eq("user_id", auth.user.id).in("status", ["pending", "needs_review"]).order("created_at", { ascending: false });
    if (error) throw new Error(error.message); return data;
  } });
  useEffect(() => { return () => {
    provider.current?.removeListener("accountsChanged", accountChanged.current);
    provider.current?.removeListener("disconnect", disconnected.current);
  }; }, []);
  async function connect() {
    if (!provider.current) {
      const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
      provider.current = await EthereumProvider.init({ projectId: WALLETCONNECT_PROJECT_ID, chains: [56], showQrModal: true, rpcMap: { 56: BNB_RPC }, metadata: { name: "MiningVault Groups", description: "NFT purchases", url: window.location.origin, icons: [`${window.location.origin}/favicon.ico`] } });
      provider.current.on("accountsChanged", accountChanged.current);
      provider.current.on("disconnect", disconnected.current);
    }
    const p = provider.current;
    if (!p.connected) await p.connect();
    const address = p.accounts[0];
    if (!address) throw new Error("Select a wallet account");
    setWallet(address); return { provider: p, wallet: address };
  }
  async function purchase() {
    if (!nft) return;
    setBusy(true);
    try {
      const connected = await connect();
      await connected.provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] });
      const quote = await prepare({ data: { nftId: nft.id, wallet: connected.wallet } });
      await qc.invalidateQueries({ queryKey: ["crypto-nft-checkouts"] });
      const { encodeFunctionData, erc20Abi, parseUnits } = await import("viem");
      const hash = await connected.provider.request<string>({ method: "eth_sendTransaction", params: [{ from: connected.wallet, to: BNB_USDT, data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [NFT_RECEIVING_WALLET, parseUnits(String(quote.amount), 18)] }) }] });
      const { error } = await supabase.auth.getUser();
      if (error) throw new Error("Sign in again to check your payment");
      setHashes((h) => ({ ...h, [quote.id]: hash }));
      toast.success("Transaction sent. Waiting for BNB Chain confirmations.");
      await check(quote.id, hash);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function check(id: string, hash: string) {
    setBusy(true);
    try {
      const result = await verify({ data: { id, hash } });
      if (result.status === "success") { toast.success("USDT payment confirmed · NFT added"); await qc.invalidateQueries(); onClose(); }
      else if (result.status === "pending") toast.info("Waiting for 15 BNB Chain confirmations. Check again shortly.");
      else { toast.error("Payment needs admin review. Keep your transaction hash."); await qc.invalidateQueries(); }
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const pending = checkouts?.filter((c) => c.status === "pending" && c.payments?.quote_expires_at && Date.parse(c.payments.quote_expires_at) > Date.now()) ?? [];
  return <>
    <Dialog open={!!nft} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Buy {nft?.name} with USDT</DialogTitle><DialogDescription>BNB Chain · USDT (BEP-20). BNB is required for network fees.</DialogDescription></DialogHeader>
      <p className="break-all text-xs text-muted-foreground">Receiving wallet: {NFT_RECEIVING_WALLET}</p>
      {wallet && <p className="break-all text-sm">Connected: {wallet}</p>}
      <Button variant="gold" disabled={busy || pending.length > 0} onClick={purchase}><Wallet />{busy ? "Waiting for wallet…" : "Connect wallet & pay"}</Button>
      {pending.length > 0 && <p className="text-sm text-muted-foreground">A wallet checkout is pending. Check its transaction below or wait for it to expire.</p>}
    </DialogContent></Dialog>
    {!!checkouts?.length && <section className="space-y-3 border-t pt-4"><h2 className="font-semibold">Wallet NFT payments</h2>{checkouts.map((c) => <article key={c.id} className="space-y-2 border-b pb-3"><p className="text-sm">{c.amount_usdt} USDT · {c.status} · {c.payments?.quote_expires_at && Date.parse(c.payments.quote_expires_at) <= Date.now() ? "Quote expired" : "BNB Chain"}</p><Label htmlFor={`tx-${c.id}`}>Transaction hash</Label><Input id={`tx-${c.id}`} placeholder="0x…" value={hashes[c.id] ?? c.tx_hash ?? ""} onChange={(e) => setHashes({ ...hashes, [c.id]: e.target.value })} /><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy || !/^0x[0-9a-fA-F]{64}$/.test(hashes[c.id] ?? c.tx_hash ?? "")} onClick={() => check(c.id, hashes[c.id] ?? c.tx_hash ?? "")}><RefreshCw />Check payment</Button>{(hashes[c.id] ?? c.tx_hash) && <Button asChild variant="ghost" size="sm"><a href={`https://bscscan.com/tx/${hashes[c.id] ?? c.tx_hash}`} target="_blank" rel="noopener noreferrer"><ExternalLink />Explorer</a></Button>}</div></article>)}</section>}
  </>;
}