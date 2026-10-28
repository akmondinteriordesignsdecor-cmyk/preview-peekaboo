import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Bitcoin, Coins, Handshake, Image, Megaphone, Users, MessageCircle, Send, Gem, Briefcase } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CollaborationRequests } from "@/components/CollaborationRequests";
import { supabase } from "@/integrations/supabase/client";
import { SOCIALS } from "@/lib/social";
import miningNft from "@/assets/mining-nft.jpg";

export const Route = createFileRoute("/_authenticated/collaborations")({
  head: () => ({
    meta: [
      { title: "Collaborations — MiningVault Groups" },
      { name: "description", content: "Collaborate with MiningVault Groups on NFT collections, cryptocurrency sales, X promotion and community introductions." },
      { property: "og:title", content: "Collaborations — MiningVault Groups" },
      { property: "og:description", content: "Explore cryptocurrency, NFT and community partnerships with MiningVault Groups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Collaborations,
});

const opportunities = [
  { title: "NFT collaborations", icon: Image, tag: "COLLECTIONS", text: "Bring your NFT collection to MiningVault Groups. Discuss showcasing your NFTs and offering them for sale to our community." },
  { title: "Cryptocurrency sales", icon: Coins, tag: "COINS & TOKENS", text: "Partner with us to introduce your cryptocurrency and explore selling your coins on our website." },
  { title: "Grow your X community", icon: Megaphone, tag: "SOCIAL REACH", text: "Promote your platform’s X account and connect with people interested in cryptocurrency, mining and NFTs." },
  { title: "Introduce your platform", icon: Users, tag: "COMMUNITY PARTNERSHIPS", text: "Introduce our users to your cryptocurrency platform through awareness campaigns, community collaborations and joint promotions." },
  { title: "Buy our coin & become a partner", icon: Briefcase, tag: "COIN PARTNERSHIP", text: "Interested in buying MVG in larger quantities, such as 3,000, 5,000 or 10,000 coins? Contact the admin about a partnership. Partnership terms must be agreed separately from your coin purchase." },
  { title: "Platform shareholding", icon: Gem, tag: "SHARES · OFFER NOT YET AVAILABLE", text: "Coin or NFT-based shareholding is a separate opportunity from partnership. Eligibility, share rights and legal terms are being defined. Buying a coin or NFT does not currently grant platform shares." },
];

function Collaborations() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<"options" | "chat" | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ platform_name: "", email: "", phone: "", topic: "Collaboration", message: "" });
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("collaboration_requests").insert({ platform_name: form.platform_name.trim(), email: form.email.trim(), phone: form.phone.trim(), topic: form.topic, message: form.message.trim() });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["collaboration-requests"] });
      setForm({ platform_name: "", email: "", phone: "", topic: "Collaboration", message: "" });
      setDialog(null);
      toast.success("Your private request has been sent to the admin");
    } catch { toast.error("Could not send your request. Please check your details and try again."); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm"><Link to="/wallet"><ArrowLeft /> Wallet</Link></Button>
      <header className="max-w-3xl space-y-3">
        <div className="flex items-center gap-2 text-sm text-primary"><Handshake className="size-5" /> MiningVault Groups</div>
        <h1 className="text-3xl font-semibold">Collaborations</h1>
        <p className="text-muted-foreground">Connect your cryptocurrency platform with our community. From NFT collections and coin sales to X promotion, let’s explore a partnership together.</p>
      </header>
      <section aria-labelledby="opportunities-title" className="space-y-4">
        <h2 id="opportunities-title" className="text-xl font-semibold">Ways to collaborate</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {opportunities.map(({ title, icon: Icon, tag, text }, index) => (
            <article key={title} className="relative overflow-hidden rounded-lg border bg-card p-5">
              {index === 0 && <img src={miningNft} alt="MiningVault NFT collectible" className="absolute right-5 top-5 size-16 rounded-md object-cover" />}
              <Icon className="mb-4 size-6 text-primary" />
              <p className="mb-2 text-xs font-medium text-muted-foreground">{tag}</p>
              <h3 className="mb-2 text-lg font-semibold">{title}</h3>
              <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">{text}</p>
              {index === 4 && <div className="mt-4 flex flex-wrap gap-2"><Button asChild size="sm" variant="outline"><Link to="/presale"><Coins /> Buy MVG</Link></Button><Button size="sm" variant="ghost" onClick={() => { setForm((current) => ({ ...current, topic: "Coin partnership" })); setDialog("chat"); }}><MessageCircle /> Ask about partnership</Button></div>}
              {index === 5 && <Button className="mt-4" size="sm" variant="outline" onClick={() => { setForm((current) => ({ ...current, topic: "Shareholding" })); setDialog("chat"); }}><MessageCircle /> Shareholding enquiry</Button>}
            </article>
          ))}
        </div>
      </section>
      <section aria-labelledby="partner-title" className="space-y-4 border-t py-6">
        <h2 id="partner-title" className="text-xl font-semibold">Let’s discuss your partnership</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">Share your platform name, website, X account or other social links, and the collaboration you have in mind. For NFT or coin sales, include details about your collection or token.</p>
        <Button variant="gold" onClick={() => setDialog("options")}><Handshake /> Discuss a collaboration</Button>
        <p className="text-xs text-muted-foreground">All partnerships, promotions and listings are subject to review and agreement with the MiningVault Groups team.</p>
      </section>
      <CollaborationRequests />
      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open && !busy) setDialog(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{dialog === "chat" ? "Chat with admin" : "Discuss a collaboration"}</DialogTitle><DialogDescription>{dialog === "chat" ? "Send a private message. The admin can reply here or contact you by email." : "Connect with MiningVault Groups and speak with our team."}</DialogDescription></DialogHeader>
          {dialog === "options" ? <div className="grid gap-3">
            <Button asChild variant="outline" className="justify-between"><a href={SOCIALS.telegram} target="_blank" rel="noopener noreferrer"><span className="flex items-center gap-2"><Send /> Join our Telegram</span><ArrowUpRight /></a></Button>
            <Button asChild variant="outline" className="justify-between"><a href={SOCIALS.x} target="_blank" rel="noopener noreferrer"><span className="flex items-center gap-2"><Megaphone /> Join our X</span><ArrowUpRight /></a></Button>
            <Button variant="gold" className="justify-between" onClick={() => setDialog("chat")}><span className="flex items-center gap-2"><MessageCircle /> Chat with admin</span><ArrowUpRight /></Button>
          </div> : <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2"><Label htmlFor="collab-name">Your name or company</Label><Input id="collab-name" required maxLength={160} value={form.platform_name} onChange={(e) => setForm({ ...form, platform_name: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="collab-email">Contact email</Label><Input id="collab-email" required type="email" maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="collab-phone">Phone number (optional)</Label><Input id="collab-phone" type="tel" maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="collab-topic">Enquiry type</Label><Select value={form.topic} onValueChange={(topic) => setForm({ ...form, topic })}><SelectTrigger id="collab-topic"><SelectValue /></SelectTrigger><SelectContent>{["Collaboration", "Coin partnership", "Shareholding"].map((topic) => <SelectItem key={topic} value={topic}>{topic}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="collab-message">Message</Label><Textarea id="collab-message" required maxLength={5000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            <Button type="submit" variant="gold" disabled={busy || !form.platform_name.trim() || !form.message.trim()}><Send /> {busy ? "Sending…" : "Send to admin"}</Button>
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}