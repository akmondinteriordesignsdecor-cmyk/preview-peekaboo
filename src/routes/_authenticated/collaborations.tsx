import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Coins, Handshake, Image, Megaphone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
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
];

function Collaborations() {
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
            </article>
          ))}
        </div>
      </section>
      <section aria-labelledby="partner-title" className="space-y-4 border-t py-6">
        <h2 id="partner-title" className="text-xl font-semibold">Let’s discuss your partnership</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">Share your platform name, website, X account or other social links, and the collaboration you have in mind. For NFT or coin sales, include details about your collection or token.</p>
        <Button asChild variant="gold"><a href={SOCIALS.telegram} target="_blank" rel="noopener noreferrer">Discuss a collaboration <ArrowUpRight /></a></Button>
        <p className="text-xs text-muted-foreground">All partnerships, promotions and listings are subject to review and agreement with the MiningVault Groups team.</p>
      </section>
    </div>
  );
}