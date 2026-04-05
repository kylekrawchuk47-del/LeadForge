interface LogoProps {
  size?: "sm" | "default" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm:      { icon: 14, text: 13, radius: "5px", gap: 6 },
  default: { icon: 19, text: 17, radius: "6px", gap: 8 },
  lg:      { icon: 26, text: 23, radius: "8px", gap: 10 },
  xl:      { icon: 36, text: 32, radius: "11px", gap: 12 },
};

export function Logo({ size = "default", className = "" }: LogoProps) {
  const { icon, text, radius, gap } = sizeMap[size];

  return (
    <div
      className={`flex items-center select-none ${className}`}
      style={{ gap }}
      draggable={false}
    >
      {/* Icon mark — cyan-to-blue gradient, no hard rectangle */}
      <div
        style={{
          width: icon * 1.55,
          height: icon * 1.55,
          borderRadius: radius,
          background: "linear-gradient(135deg, #19D3FF 0%, #2B85E4 55%, #1a6fd4 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 14px rgba(25,211,255,0.35), 0 2px 6px rgba(0,0,0,0.3)",
          flexShrink: 0,
        }}
      >
        {/* Bolt / forge-strike SVG */}
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13 2L4.09 12.11C3.5 12.81 4 14 4.89 14H11L10 22L19.91 11.89C20.5 11.19 20 10 19.11 10H13L13 2Z"
            fill="white"
          />
        </svg>
      </div>

      {/* Wordmark */}
      <span
        style={{
          fontSize: text,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          color: "white",
        }}
      >
        Lead<span style={{ color: "#19D3FF" }}>Forge</span>
      </span>
    </div>
  );
}
