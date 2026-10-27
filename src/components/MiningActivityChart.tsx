import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { miningActivity, type ActivitySession } from "@/lib/mining-activity";

export function MiningActivityChart({ sessions, loading, error }: { sessions: readonly ActivitySession[]; loading: boolean; error: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);
  const days = miningActivity(sessions, now);
  return (
    <div className="mt-4 h-48 w-full min-w-0" aria-label="Daily mining hours">
      {error ? <p className="text-sm text-destructive">Mining activity could not load.</p> : loading ? <p className="text-sm text-muted-foreground">Loading mining activity…</p> : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} margin={{ top: 12, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 24]} ticks={[0, 6, 12, 18, 24]} tickFormatter={(value: number) => `${value}h`} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "var(--muted)" }} content={({ active, payload }) => {
              const row = payload?.[0]?.payload as (typeof days)[number] | undefined;
              return active && row ? <div className="rounded-md border bg-popover p-3 text-xs text-popover-foreground"><p>{row.date}</p><p className="mt-1 font-semibold">{row.hours.toFixed(2)} hours mined</p></div> : null;
            }} />
            <Bar dataKey="hours" fill="var(--primary)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}