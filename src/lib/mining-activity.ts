export type ActivitySession = { started_at: string; ends_at: string; status: string; cancelled_at?: string | null };

// Merge overlapping intervals so a day measures time spent mining, not concurrent starts.
export function miningActivity(sessions: readonly ActivitySession[], now: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const intervals = sessions.flatMap((session) => {
      if (session.status === "cancelled" && !session.cancelled_at) return [];
      if (!["active", "completed", "claimed", "cancelled"].includes(session.status)) return [];
      const start = Math.max(Date.parse(session.started_at), day.getTime());
      const end = Math.min(Date.parse(session.ends_at), next.getTime(), now.getTime(), session.cancelled_at ? Date.parse(session.cancelled_at) : Infinity);
      return Number.isFinite(start) && Number.isFinite(end) && end > start ? [[start, end]] : [];
    }).sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
    let total = 0;
    let previousEnd = 0;
    for (const interval of intervals) {
      const [start = 0, end = 0] = interval;
      total += Math.max(0, end - Math.max(start, previousEnd));
      previousEnd = Math.max(previousEnd, end);
    }
    return { date: day.toLocaleDateString(), label: day.toLocaleDateString(undefined, { weekday: "short" }), hours: total / 3_600_000 };
  });
}