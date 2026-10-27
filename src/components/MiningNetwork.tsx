// Visual-only animation of the mining network: central server + connected mining houses.
const NODES = [
  [80, 70], [320, 60], [360, 200], [300, 330], [90, 320], [40, 195],
] as const;
const C = [200, 195] as const;

export function MiningNetwork({ active = true }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 400 390" className="w-full h-auto" role="img" aria-label="Mining network animation">
      <defs>
        <radialGradient id="core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ember)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--ember)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {NODES.map(([x, y], i) => (
        <g key={i}>
          <line x1={C[0]} y1={C[1]} x2={x} y2={y} stroke="var(--border)" strokeWidth="2" />
          {active && (
            <line
              x1={i % 2 ? x : C[0]} y1={i % 2 ? y : C[1]} x2={i % 2 ? C[0] : x} y2={i % 2 ? C[1] : y}
              stroke="var(--ember)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray="6 114" className="animate-packet"
              style={{ animationDelay: `${i * 0.25}s` }}
            />
          )}
          {/* house */}
          <g transform={`translate(${x - 22} ${y - 22})`}>
            <path d="M22 2 L42 18 L42 42 L2 42 L2 18 Z" fill="var(--card)" stroke="var(--primary)" strokeWidth="1.5" />
            <rect x="17" y="26" width="10" height="16" fill={active ? "var(--ember)" : "var(--muted)"} opacity="0.85" />
          </g>
        </g>
      ))}
      <circle cx={C[0]} cy={C[1]} r="70" fill="url(#core)" className={active ? "animate-core" : ""} opacity={active ? 1 : 0.2} />
      {/* server */}
      <g transform={`translate(${C[0] - 30} ${C[1] - 40})`}>
        <rect width="60" height="80" rx="8" fill="var(--secondary)" stroke="var(--primary)" strokeWidth="2" />
        {[14, 34, 54].map((y) => (
          <g key={y}>
            <rect x="8" y={y} width="44" height="12" rx="3" fill="var(--background)" />
            <circle cx="44" cy={y + 6} r="3" fill={active ? "var(--ember)" : "var(--muted-foreground)"} />
          </g>
        ))}
      </g>
    </svg>
  );
}
