import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-lg bg-gold font-display font-bold text-primary-foreground">M</span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-semibold">Mining<span className="text-gold">Vault</span></span>
        <span className="text-[10px] font-medium uppercase tracking-[0.35em] text-muted-foreground">Groups</span>
      </span>
    </Link>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "gold" | "muted" }) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`num mt-1 text-xl font-semibold ${tone === "gold" ? "text-gold" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const TONES: Record<string, string> = {
  confirmed: "bg-success/15 text-success", success: "bg-success/15 text-success", completed: "bg-success/15 text-success", claimed: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning", pending_review: "bg-warning/15 text-warning", processing: "bg-warning/15 text-warning", reserved: "bg-warning/15 text-warning", active: "bg-ember/15 text-ember", requested: "bg-warning/15 text-warning",
  failed: "bg-destructive/15 text-destructive", rejected: "bg-destructive/15 text-destructive", cancelled: "bg-muted text-muted-foreground", released: "bg-muted text-muted-foreground",
};
export function StatusBadge({ s }: { s: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TONES[s] ?? "bg-muted text-muted-foreground"}`}>{s.replace("_", " ")}</span>;
}

export function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
