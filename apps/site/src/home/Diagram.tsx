/** The spine in one picture: many urges converge on assent; assent becomes an act; the outcome feeds back. */

const URGES: { label: string; color: string; y: number; you?: boolean }[] = [
  { label: 'hunger', color: 'var(--fam-need)', y: 44 },
  { label: 'a duty', color: 'var(--fam-norm)', y: 92 },
  { label: 'a promise', color: 'var(--fam-commitment)', y: 140 },
  { label: 'fear', color: 'var(--fam-emotion)', y: 188 },
  { label: 'a friend', color: 'var(--fam-social)', y: 236 },
  { label: 'your voice', color: 'var(--fam-suggestion)', y: 284, you: true },
];

export function SpineDiagram() {
  const cx = 420;
  const cy = 164;
  return (
    <svg className="spine" viewBox="0 0 860 360" role="img" aria-labelledby="spine-title spine-desc">
      <title id="spine-title">Urge, Assent, Act</title>
      <desc id="spine-desc">
        Six urges, including your voice, flow into one point of assent. Assent becomes an act; the world
        resolves the outcome, which feeds back into the body, memory and trust.
      </desc>
      <defs>
        <marker
          id="spine-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
        </marker>
      </defs>

      <text className="spine-head" x="40" y="18">
        URGE
      </text>
      <text className="spine-head" x={cx} y="18" textAnchor="middle">
        ASSENT
      </text>
      <text className="spine-head" x="760" y="18" textAnchor="middle">
        ACT
      </text>

      {URGES.map((u, i) => {
        const x0 = 168;
        const path = `M${x0},${u.y} C${x0 + 120},${u.y} ${cx - 140},${cy} ${cx - 58},${cy}`;
        return (
          <g key={u.label} className={u.you ? 'spine-urge spine-you' : 'spine-urge'}>
            <path
              d={path}
              fill="none"
              stroke={u.color}
              strokeWidth={u.you ? 2.5 : 2}
              strokeDasharray={u.you ? '5 6' : undefined}
              opacity={0.85}
              style={{ animationDelay: `${i * 0.35}s` }}
              className="spine-flow"
            />
            <rect
              x="34"
              y={u.y - 16}
              width="134"
              height="32"
              rx="16"
              fill="var(--surface)"
              stroke={u.color}
              strokeWidth="1.5"
            />
            <circle cx="54" cy={u.y} r="5" fill={u.color} />
            <text x="68" y={u.y + 5} className="spine-label">
              {u.label}
            </text>
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r="58" fill="var(--surface)" stroke="var(--text)" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r="47" fill="none" stroke="var(--line-strong)" strokeDasharray="2 5" />
      <text x={cx} y={cy - 4} textAnchor="middle" className="spine-node">
        weighs
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" className="spine-node-sub">
        yes · later · no
      </text>

      <path
        d={`M${cx + 60},${cy} L${668},${cy}`}
        stroke="var(--text)"
        strokeWidth="2"
        markerEnd="url(#spine-arrow)"
        color="var(--text)"
      />
      <rect x="680" y={cy - 32} width="160" height="64" rx="14" fill="var(--text)" />
      <text x="760" y={cy - 4} textAnchor="middle" className="spine-act">
        acts
      </text>
      <text x="760" y={cy + 16} textAnchor="middle" className="spine-act-sub">
        the world resolves it
      </text>

      <path
        d={`M760,${cy + 34} C760,${cy + 150} ${cx + 30},${cy + 170} ${cx},${cy + 62}`}
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth="1.5"
        strokeDasharray="4 5"
        markerEnd="url(#spine-arrow)"
        color="var(--text-muted)"
      />
      <text x="610" y={cy + 150} textAnchor="middle" className="spine-loop">
        outcome → body, memory, habits, trust
      </text>
    </svg>
  );
}
