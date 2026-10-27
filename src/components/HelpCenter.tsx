import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SOCIALS } from "@/lib/social";
import { HelpChat } from "@/components/HelpChat";

const FAQ = [
  {
    cat: "Mining plans",
    items: [
      { q: "How do mining plans work?", a: "Buy a Starter NFT, Pro NFT or Team NFT. It joins your collection and unlocks mining. Selling it transfers its mining access to the buyer and cancels sessions tied to it." },
      { q: "When do I get my mining rewards?", a: "Rewards show as pending MVG right after you claim. They unlock and become tradable when MVG lists, planned for Q1 2027." },
      { q: "Can I have more than one plan?", a: "Upgrades cost the price difference and keep your earlier NFTs. Your highest owned mining NFT powers new sessions. If you sell it, any lower mining NFT you still own remains available." },
    ],
  },
  {
    cat: "MVG coins",
    items: [
      { q: "How do I buy MVG coins?", a: "Go to Buy MVG, enter an amount in USD, and pay. Purchased coins are kept separately and delivered at listing. Buying coins also unlocks the launch whitelist." },
      { q: "What is the presale price?", a: "The current rate is shown on the Buy MVG page (for example 50 MVG = $1). You are charged in naira at today's exchange rate." },
      { q: "When can I trade or convert my coins?", a: "You can list purchased coins on P2P now. Open-market trading opens at listing." },
    ],
  },
  {
    cat: "Withdrawals",
    items: [
      { q: "How do I withdraw my referral earnings?", a: "Go to Referrals, enter your bank details and the amount, then submit. An admin reviews each request before it is paid." },
      { q: "What is the minimum withdrawal?", a: "The minimum is shown on the Referrals and Overview pages (currently $5)." },
      { q: "How long does a withdrawal take?", a: "Requests are reviewed manually. You can track the status on the Referrals page: pending review, processing, paid, or rejected." },
    ],
  },
];

export function HelpCenter() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><MessageCircle className="size-4" /> Help</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Help Center</DialogTitle></DialogHeader>
        <HelpChat />
        <p className="text-sm text-muted-foreground">Prefer a person? Message us directly:</p>
        <div className="flex gap-2">
          <Button variant="gold" className="flex-1" asChild>
            <a href={SOCIALS.telegram} target="_blank" rel="noopener">Telegram support</a>
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <a href={SOCIALS.whatsappCommunity} target="_blank" rel="noopener">WhatsApp community</a>
          </Button>
        </div>
        <p className="text-sm font-medium">Common questions</p>
        <Accordion type="multiple" className="w-full">
          {FAQ.map((c) => (
            <AccordionItem key={c.cat} value={c.cat}>
              <AccordionTrigger>{c.cat}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {c.items.map((i) => (
                    <div key={i.q}>
                      <p className="text-sm font-medium">{i.q}</p>
                      <p className="text-sm text-muted-foreground">{i.a}</p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}
