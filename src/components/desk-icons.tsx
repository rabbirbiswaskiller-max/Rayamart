// Icons for the two Winter Desk sub-groups: female and male gender symbols.
type IconProps = { className?: string };

// Classic gender symbols. Same 24-unit box and 1.6 stroke for both, so they match in size and weight.
const symbol = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function SoftDeskIcon({ className = "size-4" }: IconProps) {
  // Female symbol.
  return (
    <svg {...symbol} className={className}>
      <circle cx="12" cy="9" r="5.2" />
      <path d="M12 14.2V21.5M8.6 18h6.8" />
    </svg>
  );
}

export function SolidDeskIcon({ className = "size-4" }: IconProps) {
  // Male symbol.
  return (
    <svg {...symbol} className={className}>
      <circle cx="10" cy="14" r="5.2" />
      <path d="M13.8 10.2 20 4M14.5 4H20v5.5" />
    </svg>
  );
}
