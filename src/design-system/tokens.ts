/**
 * Design system tokens — single source of truth for non-CSS consumers.
 *
 * Raw colour values live in CSS custom properties (src/lib/themes/css/*.css)
 * and are bridged to Tailwind utilities in src/styles.css. Import from this
 * module when you need a token in JS (inline style, animation target, etc.)
 * OR when you want a semantic name instead of a raw Tailwind class.
 *
 * If a token changes, update it HERE and ONLY here — every call site updates.
 */

// ---------------------------------------------------------------------------
// Typography scale — 6 sizes, semantic names tied to usage intent.
// Match Tailwind's text-xs .. text-4xl so you can use either utility or token.
// ---------------------------------------------------------------------------

export const TYPOGRAPHY = {
  display: 'text-3xl md:text-4xl font-bold tracking-tight',
  h1: 'text-2xl md:text-3xl font-bold tracking-tight',
  h2: 'text-xl font-semibold',
  h3: 'text-base font-semibold',
  body: 'text-sm leading-relaxed',
  bodyLg: 'text-base leading-relaxed',
  caption: 'text-xs text-muted-foreground',
  label: 'text-sm font-medium',
  mono: 'font-mono text-xs',
  // Below the text-xs floor. Reserve for UPPERCASE metadata/stamps only.
  tiny: 'text-[10px] uppercase tracking-wide font-semibold',
} as const

export type TypographyToken = keyof typeof TYPOGRAPHY

// ---------------------------------------------------------------------------
// Spacing scale — use semantic names for gaps, padding, margins.
// All values are Tailwind utilities; numbers map to the 4px grid.
// ---------------------------------------------------------------------------

export const SPACING = {
  xs: '1', //  4px — icon/text gap
  sm: '2', //  8px — inline groups
  md: '3', // 12px — related controls
  lg: '4', // 16px — default section
  xl: '6', // 24px — between sections
  xxl: '8', // 32px — page gutters
} as const

export type SpacingToken = keyof typeof SPACING

// ---------------------------------------------------------------------------
// Radius scale — pulled from the active theme's --radius var.
// Use RADIUS.* in JS; utility classes (rounded-md etc.) also read the same var.
// ---------------------------------------------------------------------------

export const RADIUS = {
  none: 'rounded-none',
  sm: 'rounded-sm', // small chips, inline badges
  md: 'rounded-md', // default — buttons, inputs
  lg: 'rounded-lg', // cards, dialog surfaces
  xl: 'rounded-xl', // emphasised card, popover
  pill: 'rounded-full', // primary CTAs in NYT theme
} as const

// ---------------------------------------------------------------------------
// Elevation — borders + optional shadow. Most themes use borders; only the
// default/dark themes actually cast shadows.
// ---------------------------------------------------------------------------

export const ELEVATION = {
  flat: 'border border-border',
  raised: 'border border-border shadow-sm',
  floating: 'border border-border shadow-md',
  overlay: 'border border-border shadow-xl',
} as const

// ---------------------------------------------------------------------------
// Interaction states — canonical pattern for hover/active/focus/disabled.
// Don't use these directly; they exist to ensure Button/Input variants apply
// the same state treatment. Variant classes bake these in; see button.tsx.
// ---------------------------------------------------------------------------

export const STATE_PATTERN = {
  transition: 'transition-all duration-150',
  hover: '[modifier: bg-darken 10% OR opacity-90]',
  active: '[modifier: bg-darken 20% OR scale-[0.98]]',
  focusRing: 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
  disabled: 'disabled:pointer-events-none disabled:opacity-50',
} as const

// ---------------------------------------------------------------------------
// Button intent — maps user intent to the right variant.
// Callers should use the variant name directly; this is for documentation
// and the occasional programmatic choice ("error → destructive").
// ---------------------------------------------------------------------------

export const BUTTON_INTENT = {
  primary: 'default',
  secondary: 'secondary',
  tertiary: 'ghost',
  danger: 'destructive',
  bordered: 'outline',
  inline: 'link',
} as const

export type ButtonIntent = keyof typeof BUTTON_INTENT

// ---------------------------------------------------------------------------
// Z-index scale — numeric, so arithmetic works in style objects.
// ---------------------------------------------------------------------------

export const Z = {
  base: 0,
  dropdown: 40,
  overlay: 50, // dialog overlay, popover backdrop
  dialog: 60,
  toast: 70,
  tooltip: 80,
} as const
