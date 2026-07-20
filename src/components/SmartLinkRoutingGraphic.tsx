// Decorative "one link → many destinations" fan-out graphic for the Smart Links
// (Chapter Links) page. Single hub on the left routes to four destination nodes
// on the right — an inverted mirror of the Chapter connections diagram.

type Dest = { y: number; color: string; label: string; dest: string };

const HUB = { x: 50, y: 118 };
const PILL_LEFT = 210;
const PILL_W = 208;
const PILL_H = 44;

const DESTS: Dest[] = [
  { y: 36, color: "#ea7a2b", label: "High value customer", dest: "→ high AOV products" },
  { y: 91, color: "#2f9e7a", label: "Spontaneous customer", dest: "→ sale page" },
  { y: 146, color: "#3f7fd4", label: "Winback customer", dest: "→ offer page" },
  { y: 201, color: "#8aa0b8", label: "Generic", dest: "→ homepage" },
];

export default function SmartLinkRoutingGraphic({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-orange-100 bg-white px-4 py-4 shadow-sm ${className}`}
    >
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
        One link, many destinations
      </p>

      <svg
        viewBox="0 0 440 236"
        className="h-auto w-full"
        style={{ fontFamily: "inherit" }}
        role="img"
        aria-label="One link routing to four customer destinations: high value customers to high-AOV products, spontaneous customers to the sale page, winback customers to the offer page, and everyone else to the homepage."
      >
        {/* Curves from hub to each destination */}
        {DESTS.map((d, i) => (
          <path
            key={`curve-${i}`}
            d={`M ${HUB.x + 28} ${HUB.y} C 150 ${HUB.y}, 150 ${d.y}, ${PILL_LEFT - 3} ${d.y}`}
            fill="none"
            stroke={d.color}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ))}

        {/* Connector dots at each destination */}
        {DESTS.map((d, i) => (
          <circle key={`dot-${i}`} cx={PILL_LEFT - 1} cy={d.y} r={4} fill={d.color} />
        ))}

        {/* Destination pills */}
        {DESTS.map((d, i) => (
          <g key={`pill-${i}`}>
            <rect
              x={PILL_LEFT}
              y={d.y - PILL_H / 2}
              width={PILL_W}
              height={PILL_H}
              rx={13}
              fill="#f8fafc"
              stroke="#cbd5e1"
            />
            <text
              x={PILL_LEFT + 18}
              y={d.y - 3}
              fontSize="12"
              fontWeight={600}
              fill="#1f2d43"
            >
              {d.label}
            </text>
            <text x={PILL_LEFT + 18} y={d.y + 12} fontSize="10.5" fill="#64748b">
              {d.dest}
            </text>
          </g>
        ))}

        {/* Hub — the single link */}
        <rect
          x={HUB.x - 28}
          y={HUB.y - 28}
          width={56}
          height={56}
          rx={15}
          fill="#ea7a2b"
        />
        <text
          x={HUB.x}
          y={HUB.y + 8}
          fontSize="24"
          fontWeight={700}
          fill="#ffffff"
          textAnchor="middle"
        >
          1
        </text>
        <text
          x={HUB.x}
          y={HUB.y + 46}
          fontSize="12.5"
          fontWeight={600}
          fill="#334155"
          textAnchor="middle"
        >
          One Link
        </text>
      </svg>
    </div>
  );
}
