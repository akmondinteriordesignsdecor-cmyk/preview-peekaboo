import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Crown, Dices, Flame, Gift, Lock, Sparkles, Timer, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { gameStatus, openBox, spinNow, type SpinResult } from "@/lib/games.functions";
import { dt, mvt } from "@/lib/format";
import mysteryBox from "@/assets/mystery-box.png";
import chestOpen from "@/assets/chest-open.png";

export const Route = createFileRoute("/_authenticated/games")({
  head: () => ({ meta: [{ title: "Rewards — MiningVault Groups" }, { name: "description", content: "Daily roulette with a 10 MVG jackpot and an hourly mystery box." }, { property: "og:title", content: "Rewards — MiningVault Groups" }, { property: "og:description", content: "Spin daily for 0.5–1 MVG or the 10 MVG jackpot, and open a mystery box every hour." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Games,
});

// Wheel layout (clockwise from the top pointer)
const SEGS: (number | "J")[] = [0.5, 0.8, 0.6, 1.0, 0.7, 0.9, 0.5, 0.8, 0.6, 1.0, 0.7, "J"];
const COLORS = ["--wheel-1", "--wheel-2", "--wheel-3", "--wheel-4", "--wheel-5", "--wheel-6"];
const SEG_DEG = 360 / SEGS.length;

function segmentFor(r: SpinResult) {
  if (r.jackpot) return SEGS.indexOf("J");
  const v = Math.min(1, Math.max(0.5, Math.round(r.reward * 10) / 10));
  const matches = SEGS.map((s, i) => (s === v ? i : -1)).filter((i) => i >= 0);
  return matches[Math.floor(Math.random() * matches.length)] ?? 0;
}

function arc(i: number) {
  const a0 = ((i * SEG_DEG - 90) * Math.PI) / 180;
  const a1 = (((i + 1) * SEG_DEG - 90) * Math.PI) / 180;
  return `M100 100 L${100 + 95 * Math.cos(a0)} ${100 + 95 * Math.sin(a0)} A95 95 0 0 1 ${100 + 95 * Math.cos(a1)} ${100 + 95 * Math.sin(a1)} Z`;
}

function countdown(target: string | null | undefined, now: number) {
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return null;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Wheel({ rotation, spinning }: { rotation: number; spinning: boolean }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-72">
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full drop-shadow-xl">
        <circle cx="100" cy="100" r="99" fill="var(--wheel-2)" />
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "100px 100px", transition: spinning ? "transform 4.2s cubic-bezier(.12,.67,.12,1)" : "none" }}>
          {SEGS.map((s, i) => {
            const mid = i * SEG_DEG + SEG_DEG / 2;
            return (
              <g key={i}>
                <path d={arc(i)} fill={`var(${s === "J" ? "--wheel-jackpot" : COLORS[i % COLORS.length]})`} stroke="var(--wheel-2)" strokeWidth="0.8" />
                <text x="100" y="30" transform={`rotate(${mid} 100 100)`} textAnchor="middle" fill={s === "J" ? "var(--wheel-2)" : "var(--wheel-ink)"} fontWeight="800" fontSize={s === "J" ? 9 : 11} fontFamily="Sora, sans-serif">
                  {s === "J" ? "10 MVG" : s.toFixed(1)}
                </text>
                {s === "J" && <text x="100" y="42" transform={`rotate(${mid} 100 100)`} textAnchor="middle" fill="var(--wheel-2)" fontWeight="700" fontSize="5.5">JACKPOT</text>}
              </g>
            );
          })}
        </g>
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i * 22.5 * Math.PI) / 180;
          return <circle key={i} cx={100 + 97 * Math.cos(a)} cy={100 + 97 * Math.sin(a)} r="2.2" fill="var(--wheel-ink)" className={spinning && i % 2 ? "animate-bulb" : ""} />;
        })}
        <circle cx="100" cy="100" r="18" fill="var(--wheel-2)" stroke="var(--wheel-6)" strokeWidth="3" />
        <text x="100" y="104" textAnchor="middle" fontSize="10" fontWeight="800" fill="var(--wheel-jackpot)">MVG</text>
      </svg>
      <svg viewBox="0 0 30 34" className="absolute left-1/2 top-0 z-10 w-8 -translate-x-1/2 -translate-y-3 drop-shadow-lg">
        <path d="M2 2 H28 L15 32 Z" fill="var(--wheel-1)" stroke="var(--wheel-ink)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Games() {
  const qc = useQueryClient();
  const { data: st, isLoading } = useQuery({ queryKey: ["game-status"], queryFn: () => gameStatus() });
  const spin = useServerFn(spinNow);
  const box = useServerFn(openBox);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [boxStage, setBoxStage] = useState<"idle" | "shaking" | "open">("idle");
  const [boxResult, setBoxResult] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (isLoading || !st) return <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-96" />)}</div>;

  const boxCountdown = countdown(st.next_box_at, now);
  const boxReady = st.can_box || !boxCountdown;
  const every = st.jackpot_every || 10;
  const nextSpinNo = st.total_spins + 1;
  const spinsToJackpot = (every - (nextSpinNo % every)) % every;

  async function doSpin() {
    setSpinning(true);
    setResult(null);
    // start a visible spin immediately while the server decides
    setRotation((r) => r + 720);
    try {
      const r = await spin();
      const seg = segmentFor(r);
      setRotation((rot) => {
        const base = Math.ceil(rot / 360) * 360 + 360 * 6;
        return base + (360 - (seg * SEG_DEG + SEG_DEG / 2));
      });
      await new Promise((res) => setTimeout(res, 4300));
      setResult(r);
      if (r.jackpot) toast.success(`JACKPOT! You won ${mvt(r.reward)}`);
      qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSpinning(false);
    }
  }

  async function doBox() {
    if (boxStage === "open") { setBoxStage("idle"); setBoxResult(null); return; }
    setBoxStage("shaking");
    try {
      const [r] = await Promise.all([box(), new Promise((res) => setTimeout(res, 1400))]);
      setBoxResult(r.reward);
      setBoxStage("open");
      qc.invalidateQueries();
    } catch (e) {
      setBoxStage("idle");
      toast.error((e as Error).message);
    }
  }

  const upcoming = [
    { icon: Crown, title: `${mvt(st.jackpot_amount)} jackpot chance`, hint: spinsToJackpot === 0 ? "Your next spin is a jackpot spin!" : `In ${spinsToJackpot} spin${spinsToJackpot === 1 ? "" : "s"} (every ${every}th spin)`, pct: ((every - spinsToJackpot) % every || every) / every },
    { icon: Trophy, title: "Streak NFT", hint: `${st.streak}/${st.streak_days} days in a row`, pct: (st.streak % st.streak_days) / st.streak_days },
    { icon: Gift, title: "Next mystery box", hint: boxReady ? "Ready to open now" : `Opens in ${boxCountdown}`, pct: boxReady ? 1 : 1 - (new Date(st.next_box_at!).getTime() - now) / 3600000 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Rewards</h1>
        <p className="text-sm text-muted-foreground">Free MVG every day — spin the roulette and open the mystery box.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex items-center gap-2"><Dices className="size-5 text-gold" /><h2 className="font-semibold">Daily roulette</h2></div>
          <p className="text-xs text-muted-foreground">One free spin a day wins {mvt(st.spin_min)}–{mvt(st.spin_max)}. Every {every}th spin has a rare shot at the <span className="font-semibold text-gold">{mvt(st.jackpot_amount)} jackpot</span>.</p>
          <Wheel rotation={rotation} spinning={spinning} />
          {result && (
            <div className={`animate-pop-in rounded-lg border px-4 py-2 text-sm ${result.jackpot ? "border-gold bg-gold/20 shadow-glow" : "border-gold/30 bg-gold/10"}`}>
              {result.jackpot && <p className="font-display text-lg font-bold text-gold">JACKPOT!</p>}
              You won <span className="num font-semibold text-gold">{mvt(result.reward)}</span> · streak {result.streak} day{result.streak === 1 ? "" : "s"}
              {result.nft && <p className="mt-1 text-xs text-gold">Streak bonus: you earned the NFT “{result.nft}”!</p>}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Flame className="size-4 text-ember" /> Current streak: {st.streak} day{st.streak === 1 ? "" : "s"}</div>
          <Button variant="gold" disabled={!st.can_spin || spinning} onClick={doSpin} className="w-full max-w-xs">
            {spinning ? "Spinning…" : st.can_spin ? "Spin now" : "Come back tomorrow"}
          </Button>
        </div>

        <div className="panel flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex items-center gap-2"><Gift className="size-5 text-gold" /><h2 className="font-semibold">Hourly mystery box</h2></div>
          <p className="text-xs text-muted-foreground">Open a free mystery box every hour for {mvt(st.box_min)}–{mvt(st.box_max)}.</p>
          <button type="button" onClick={doBox} disabled={(!boxReady && boxStage !== "open") || boxStage === "shaking"} aria-label="Open mystery box" className="relative grid aspect-square w-full max-w-64 place-items-center">
            <div className="absolute inset-8 rounded-full bg-gold/20 blur-3xl" />
            {boxStage === "open" ? (
              <div className="relative">
                <img src={chestOpen} alt="Open treasure chest" width={1024} height={1024} className="animate-pop-in w-56" />
                <div className="animate-rise-prize absolute inset-x-0 top-6 flex flex-col items-center">
                  <Sparkles className="size-6 text-gold" />
                  <span className="num rounded-full border border-gold bg-background/90 px-4 py-1 text-xl font-bold text-gold shadow-glow">+{mvt(boxResult ?? 0)}</span>
                </div>
              </div>
            ) : (
              <img src={mysteryBox} alt="Mystery box" width={1024} height={1024} className={`relative w-44 drop-shadow-2xl ${boxStage === "shaking" ? "animate-shake-box" : boxReady ? "animate-float-box" : "opacity-50 grayscale"}`} />
            )}
          </button>
          {boxStage === "open" && <p className="text-sm">The box held <span className="num font-semibold text-gold">{mvt(boxResult ?? 0)}</span>!</p>}
          {!boxReady && boxCountdown && boxStage !== "open" && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Timer className="size-3.5" /> Next box in {boxCountdown}</p>}
          <Button variant="gold" disabled={(!boxReady && boxStage !== "open") || boxStage === "shaking"} onClick={doBox} className="w-full max-w-xs">
            {boxStage === "shaking" ? "Opening…" : boxStage === "open" ? "Close" : boxReady ? "Open the box" : "Cooling down"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-5">
          <h3 className="mb-3 font-semibold">Upcoming rewards</h3>
          <div className="space-y-3">
            {upcoming.map((u) => (
              <div key={u.title} className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent"><u.icon className="size-5 text-gold" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-sm"><span className="font-medium">{u.title}</span></div>
                  <p className="text-xs text-muted-foreground">{u.hint}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-gold" style={{ width: `${Math.max(4, Math.min(100, u.pct * 100))}%` }} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <h3 className="mb-3 font-semibold">Recent rewards</h3>
          {st.recent.length ? (
            <ul className="divide-y">
              {st.recent.map((r, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="flex items-center gap-2">
                    {r.jackpot ? <Crown className="size-4 text-gold" /> : r.kind === "spin" ? <Dices className="size-4 text-muted-foreground" /> : <Gift className="size-4 text-muted-foreground" />}
                    {r.jackpot ? "Jackpot" : r.kind === "spin" ? "Daily spin" : "Mystery box"}
                    <span className="text-xs text-muted-foreground">{dt(r.created_at)}</span>
                  </span>
                  <span className="num font-semibold text-gold">+{mvt(r.reward)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4" /> No rewards yet — spin or open a box to start.</p>}
        </div>
      </div>
    </div>
  );
}
