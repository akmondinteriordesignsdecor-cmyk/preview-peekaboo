import { createFileRoute } from "@tanstack/react-router";
import { Logo } from "@/components/Brand";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Terms, Privacy & Risk — MiningVault Groups" },
      { name: "description", content: "MiningVault Groups terms of service, privacy policy, risk disclosure and support." },
      { property: "og:title", content: "Terms, Privacy & Risk — MiningVault Groups" },
      { property: "og:description", content: "Legal information for MiningVault Groups users." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Legal,
});

function Legal() {
  const S = ({ id, t, children }: { id: string; t: string; children: React.ReactNode }) => (
    <section id={id} className="panel p-6"><h2 className="text-xl font-semibold">{t}</h2><div className="mt-2 space-y-2 text-sm text-muted-foreground">{children}</div></section>
  );
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-5 py-8">
      <Logo />
      <S id="risk" t="Risk disclosure"><p>Cryptocurrency is volatile and high risk. MVG is not yet listed; mining rewards are pending internal balances until listing. Plan capacities are illustrative. No returns are guaranteed.</p></S>
      <S id="terms" t="Terms of service"><p>One account per person. Self-referrals and duplicate accounts are prohibited and may be cancelled. Referral rewards are paid at the published commission once the referred user pays for a plan and starts mining. Withdrawals are reviewed before payment.</p></S>
      <S id="privacy" t="Privacy policy"><p>We store your email, account activity, payments and payout details only to operate the service. Payments are processed by Paystack. We never sell your data.</p></S>
      <S id="support" t="Support"><p>Contact the MiningVault Groups team through our official channels for help with your account.</p></S>
    </div>
  );
}
