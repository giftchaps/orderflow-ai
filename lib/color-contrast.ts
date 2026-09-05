import type { CSSProperties } from "react"

/**
 * Given a business's chosen brand hex color, pick a readable foreground
 * (near-white or near-black) so `--brand-foreground` always contrasts with
 * `--brand`, no matter which color the business picks in settings.
 */
export function contrastForeground(hex: string): string {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!match) return "#ffffff"

  const num = parseInt(match[1], 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255

  const toLinear = (c: number) => {
    const cs = c / 255
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4)
  }

  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  return luminance > 0.45 ? "#111111" : "#ffffff"
}

/** Inline CSS custom-property override for a business's brand color, or undefined for the default. */
export function brandStyle(themeColor: string | null | undefined): CSSProperties | undefined {
  if (!themeColor) return undefined
  return {
    "--brand": themeColor,
    "--brand-foreground": contrastForeground(themeColor),
  } as CSSProperties
}
