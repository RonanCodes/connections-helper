export const THEMES = [
  'nyt',
  'default',
  'light',
  'neubrutalism',
  'synthwave',
  'geocities',
] as const
export type Theme = (typeof THEMES)[number]

export const MODES = ['light', 'dark', 'system'] as const
export type Mode = (typeof MODES)[number]

export interface ThemeConfig {
  theme: Theme
  mode: Mode
}

/**
 * Apply a theme to the document
 */
export function setTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('sl-theme', theme)
}

/**
 * Apply a color mode (light/dark)
 */
export function setMode(mode: Mode): void {
  if (typeof document === 'undefined') return

  if (mode === 'system') {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
    document.documentElement.setAttribute(
      'data-mode',
      prefersDark ? 'dark' : 'light',
    )
    document.documentElement.classList.toggle('dark', prefersDark)
  } else {
    document.documentElement.setAttribute('data-mode', mode)
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }
  localStorage.setItem('sl-mode', mode)
}

/**
 * Get the current theme config
 */
export function getThemeConfig(): ThemeConfig {
  if (typeof document === 'undefined') {
    return { theme: 'nyt', mode: 'system' }
  }

  const theme = (localStorage.getItem('sl-theme') ?? 'nyt') as Theme
  const mode = (localStorage.getItem('sl-mode') ?? 'system') as Mode
  return { theme, mode }
}

/**
 * Initialize theme from localStorage or defaults
 */
export function initTheme(): ThemeConfig {
  const config = getThemeConfig()
  setTheme(config.theme)
  setMode(config.mode)
  return config
}

/**
 * Toggle between light and dark mode
 */
export function toggleMode(): Mode {
  const current = localStorage.getItem('sl-mode') as Mode
  const next = current === 'dark' ? 'light' : 'dark'
  setMode(next)
  return next
}

/**
 * Cycle through available themes
 */
export function cycleTheme(): Theme {
  const current = (localStorage.getItem('sl-theme') ?? 'nyt') as Theme
  const currentIndex = THEMES.indexOf(current)
  const nextIndex = (currentIndex + 1) % THEMES.length
  const next = THEMES[nextIndex]
  setTheme(next)
  return next
}

// Theme metadata for UI display
export const THEME_META: Record<
  Theme,
  { name: string; description: string; emoji: string }
> = {
  nyt: {
    name: 'NYT Games',
    description: 'Clean newspaper style, inspired by NYT Connections',
    emoji: '📰',
  },
  default: {
    name: 'Dark Mode',
    description: 'Professional dark theme',
    emoji: '🌙',
  },
  light: {
    name: 'Light Mode',
    description: 'Clean light theme, easy on the eyes',
    emoji: '☀️',
  },
  neubrutalism: {
    name: 'Neubrutalism',
    description: 'Bold colors, sharp shadows, chunky elements',
    emoji: '🎯',
  },
  synthwave: {
    name: "Synthwave '84",
    description: 'Neon dreams, retro-futuristic vibes',
    emoji: '🌆',
  },
  geocities: {
    name: 'GeoCities',
    description: '90s web nostalgia, beveled buttons',
    emoji: '🚧',
  },
}
