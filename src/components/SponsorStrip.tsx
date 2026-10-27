const SPONSORS = ["Binance", "Phantom Wallet", "Spider Wave", "CoinMarketCap", "Bybit", "OpenSea"];

export function SponsorStrip({ compact = false }: { compact?: boolean }) {
  return (
    <section aria-label={compact ? "Sponsors" : "Supported and sponsored by"} className={`border-y bg-sidebar/60 ${compact ? "border-b-0" : "mb-8"}`}>
      <div className={`mx-auto max-w-6xl px-5 ${compact ? "py-4" : "py-7 md:py-8"}`}>
        <p className={`text-center font-medium uppercase text-muted-foreground ${compact ? "text-[10px] tracking-wider" : "text-xs tracking-widest"}`}>Supported &amp; Sponsored By</p>
        <ul className={`mt-3 flex flex-wrap items-center justify-center ${compact ? "gap-x-5 gap-y-2" : "gap-x-8 gap-y-5 md:mt-5 md:justify-between"}`}>
          {SPONSORS.map((name) => (
            <li key={name} className={`flex flex-wrap items-center justify-center gap-1.5 ${compact ? "text-xs text-muted-foreground" : "font-display text-sm font-semibold text-foreground md:text-base"}`}>
              <span>{name}</span>
              {name === "OpenSea" && <span className={`${compact ? "text-[10px]" : "text-[10px] font-sans font-medium"} text-muted-foreground`}>· NFT Partner</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}