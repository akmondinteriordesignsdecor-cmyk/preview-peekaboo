<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Task collectibles use separate per-instance ownership, admin-reviewed submissions and service-only verified settlement; sale USD credits use the existing withdrawable referral account and mining bonuses use pending mvt ledger entries. Why: supports multiple collectibles without granting mining access or making locked bonuses spendable.
- Crypto NFT checkout reserves a normal NFT payment quote and binds a unique on-chain transaction to the signed-in buyer and quoted wallet; verification checks BNB USDT transfer logs and confirmations before atomic fulfillment. Why: prevents replay, spoofed payments and double issuance.
- Mining activity is computed in a pure elapsed-time module and displayed on a fixed 0–24-hour scale, merging overlapping sessions per local calendar day. Why: compares actual mining time consistently instead of counting starts; unknown historical cancellations are excluded rather than guessed.
- Sponsor presentation uses one shared strip, with the compact variant mounted in the root layout and the full variant on the landing page. Why: keeps sponsor ordering consistent and covers all pages without duplication.
- NFT marketplace discovery groups through the NFT's linked plan, uses ownership UUIDs as instance identifiers, and applies filtering and own-listing-first sorting in a shared pure module. Why: avoids schema changes, preserves resale identity, and makes ordering testable.
- All balance changes go through SECURITY DEFINER SQL functions (start_mining, claim_mining, request_withdrawal, admin_set_withdrawal, fulfill_payment) writing to append-only ledger_entries; clients only SELECT. Why: server-authoritative, auditable money.
- Paystack payments: server fn creates payment row + initializes; fulfillment only after Paystack verify API (callback page or signed webhook at /api/public/paystack-webhook). Why: never trust client or webhook amounts.
- Configurable business values live in the single-row public.settings table. Why: admin-tunable without code changes.
- Game rewards (spin_roulette, open_mystery_box) are SECURITY DEFINER functions that credit the 'mvt' ledger account and enforce cooldowns (1 spin/day, 1 box/hour) server-side. NFT media lives in the private nft-media storage bucket; clients render via signed URLs.

- Keep legacy mvt database identifiers while displaying the coin as configured user-facing branding; why: preserves existing balances and payment compatibility.
- Checkout quotes are created atomically in prepare_checkout with the current tier, expiry, discounts and NFT stock reservations; fulfillment rechecks ownership and stock after verified provider payment. Why: prevents duplicate or stale upgrades and overselling.
- Marketplace transfers use SQL functions and append-only ledger entries with account-level advisory locks; moderation hides listings/history without deleting financial records. Why: preserves ownership and auditability.
- Current mining tier is the highest owned NFT linked to an original plan purchase; issuance and transfer triggers mint ownership and cancel unclaimed sessions tied to a sold NFT. Sessions keep their original purchase for reward calculation, and source-purchase owner reads support resale buyers. Why: transferable access without changing earned rewards or financial history.
- Mining checkout quotes charge the full target plan price and ignore purchase discounts while retaining upward-only and stale-quote checks. Why: displayed prices and verified provider charges must agree.
- Mining NFT audit events are captured by database triggers per ownership instance and read through an authenticated participant-scoped RPC without personal identifiers. Why: preserve transfer history after ownership changes without exposing unrelated users' records.
