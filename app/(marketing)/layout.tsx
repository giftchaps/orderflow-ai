export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="marketing"
      style={{
        // Warm cream light theme — scoped to marketing pages only
        "--background": "oklch(0.965 0.005 75)",
        "--foreground": "oklch(0.18 0.01 75)",
        "--card": "oklch(0.99 0.002 75)",
        "--card-foreground": "oklch(0.18 0.01 75)",
        "--popover": "oklch(0.99 0.002 75)",
        "--popover-foreground": "oklch(0.18 0.01 75)",
        "--primary": "oklch(0.25 0.01 75)",
        "--primary-foreground": "oklch(0.98 0.005 75)",
        "--secondary": "oklch(0.94 0.008 75)",
        "--secondary-foreground": "oklch(0.25 0.01 75)",
        "--muted": "oklch(0.92 0.008 75)",
        "--muted-foreground": "oklch(0.45 0.01 75)",
        "--accent": "oklch(0.55 0.12 25)",
        "--accent-foreground": "oklch(0.99 0 0)",
        "--border": "oklch(0.88 0.01 75)",
        "--input": "oklch(0.96 0.005 75)",
        "--ring": "oklch(0.25 0.01 75)",
        backgroundColor: "oklch(0.965 0.005 75)",
        color: "oklch(0.18 0.01 75)",
        minHeight: "100vh",
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
