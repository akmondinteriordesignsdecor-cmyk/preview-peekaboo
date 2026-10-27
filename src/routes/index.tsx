import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Brand";
import { SponsorStrip } from "@/components/SponsorStrip";
import { MiningNetwork } from "@/components/MiningNetwork";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { plansQ } from "@/lib/data";
import { usd } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MiningVault Groups — Power Your Digital Future" },
      { name: "description", content: "Own a mining NFT, mine MVG and earn referral rewards." },
      { property: "og:title", content: "MiningVault Groups — Power Your Digital Future" },
      { property: "og:description", content: "Starter NFT, Pro NFT and Team NFT with transferable mining access." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FAQ: [string, string][] = [
  ["How do I earn?", "Invite friends with your referral link. When someone you invited pays for a plan and starts mining, you earn 50% of that plan's price. Referral earnings can be withdrawn from $5."],
  ["When do mining rewards become usable?", "Mining rewards are recorded as pending MVG and become available when the MVG coin is listed."],
  ["How long is a mining session?", "Each session lasts 12 hours. Start a new one after claiming."],
  ["How do I pay?", "Plans and coin purchases are paid securely with Paystack."],
  ["Are returns guaranteed?", "No. Crypto is risky and nothing on MiningVault Groups is a guaranteed return."],
];

function Landing() {
  const { data: plans } = useQuery(plansQ);
  const { data: stats } = useQuery({ queryKey: ["pstats"], queryFn: async () => (await supabase.rpc("platform_stats")).data as { members: number; sessions: number; whitelist: number } });
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex gap-2">
          <Button variant="ghost" asChild><Link to="/auth">Log in</Link></Button>
          <Button variant="gold" asChild><Link to="/auth" search={{ mode: "signup" }}>Create account</Link></Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-primary">MVG coin launching Q1 2027</p>
          <h1 className="mt-3 text-4xl font-bold md:text-6xl">Power Your <span className="text-gold">Digital Future.</span></h1>
          <p className="mt-5 max-w-md text-muted-foreground">Own a mining NFT, run 12-hour mining sessions, and earn withdrawable referral rewards while MVG gets ready to list.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="gold" size="lg" asChild><Link to="/auth" search={{ mode: "signup" }}>Create account</Link></Button>
            <Button variant="outline" size="lg" asChild><Link to="/auth">Log in</Link></Button>
            <Button variant="ghost" size="lg" asChild><a href="#plans">Explore mining</a></Button>
          </div>
        </div>
        <div className="panel p-6 shadow-glow"><MiningNetwork /></div>
      </section>

      <SponsorStrip />

      <section className="mx-auto grid max-w-6xl grid-cols-3 gap-4 px-5">
        {[["Members", stats?.members], ["Mining sessions", stats?.sessions], ["Whitelisted", stats?.whitelist]].map(([l, v]) => (
          <div key={String(l)} className="panel p-4 text-center">
            <p className="num text-2xl font-semibold text-gold">{v ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </section>

      <section id="plans" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-3xl font-semibold">NFT mining plans</h2>
        <p className="mt-2 text-sm text-muted-foreground">Capacity figures are illustrative, not delivered hashrate.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {plans?.map((p) => (
            <div key={p.id} className="panel p-6">
              <h3 className="font-semibold">{p.name}</h3>
              <p className="num mt-3 text-3xl font-bold text-gold">{usd(p.price_usd)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.capacity_ths} TH/s illustrative · {p.mvt_per_session} MVG per session</p>
              <p className="mt-3 text-sm">Your referrer earns {usd(Number(p.price_usd) / 2)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 md:grid-cols-3">
        {[["1. Activate a plan", "Pay once with Paystack to unlock mining."], ["2. Mine for 12 hours", "Start a session and claim MVG when it ends."], ["3. Invite & earn", "Earn 50% of every plan your referrals buy — withdraw from $5."]].map(([t, d]) => (
          <div key={t} className="panel p-6"><h3 className="font-semibold text-primary">{t}</h3><p className="mt-2 text-sm text-muted-foreground">{d}</p></div>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16">
        <h2 className="mb-4 text-3xl font-semibold">FAQ</h2>
        <Accordion type="single" collapsible>
          {FAQ.map(([q, a]) => (
            <AccordionItem key={q} value={q}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>
          ))}
        </Accordion>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-muted-foreground md:flex-row md:justify-between">
          <p>© MiningVault Groups · Created by Spidervarse</p>
          <div className="flex gap-4">
            <Link to="/legal" hash="risk">Risk disclosure</Link>
            <Link to="/legal" hash="terms">Terms</Link>
            <Link to="/legal" hash="privacy">Privacy</Link>
            <Link to="/legal" hash="support">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
