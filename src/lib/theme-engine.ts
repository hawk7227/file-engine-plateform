// =====================================================
// THEME ENGINE
//
// Color scheme system with presets and full customization.
// All UI reads from CSS custom properties — changing the
// theme changes everything instantly.
// =====================================================

export interface ThemeColors {
  bg0: string       // deepest background
  bg1: string       // panel background
  bg2: string       // input/card background
  bg3: string       // hover background
  bg4: string       // active/selected background
  border: string    // primary border
  border2: string   // secondary border
  text1: string     // primary text
  text2: string     // secondary text
  text3: string     // muted text
  text4: string     // disabled text
  accent: string    // primary accent
  accentDim: string // accent at 8% opacity
  purple: string
  blue: string
  red: string
  yellow: string
  cyan: string
}

export interface ThemeScheme {
  id: string
  name: string
  category: 'dark' | 'light' | 'bold'
  colors: ThemeColors
}

// ── Presets ──

export const THEME_SCHEMES: ThemeScheme[] = [
  // === DARK ===
  {
    id: 'midnight',
    name: 'Midnight',
    category: 'dark',
    colors: {
      bg0: '#040406', bg1: '#08080c', bg2: '#0c0c12', bg3: '#111118', bg4: '#18181f',
      border: '#1e1e28', border2: '#2a2a38',
      text1: '#f0f0f4', text2: '#a0a0b0', text3: '#606070', text4: '#404050',
      accent: '#34d399', accentDim: 'rgba(52,211,153,.08)',
      purple: '#a78bfa', blue: '#60a5fa', red: '#f87171', yellow: '#fbbf24', cyan: '#22d3ee',
    },
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    category: 'dark',
    colors: {
      bg0: '#0f0f0f', bg1: '#171717', bg2: '#1f1f1f', bg3: '#262626', bg4: '#2e2e2e',
      border: '#333333', border2: '#444444',
      text1: '#fafafa', text2: '#a3a3a3', text3: '#737373', text4: '#525252',
      accent: '#10b981', accentDim: 'rgba(16,185,129,.08)',
      purple: '#a78bfa', blue: '#3b82f6', red: '#ef4444', yellow: '#f59e0b', cyan: '#06b6d4',
    },
  },
  // === LIGHT ===
  {
    id: 'snow',
    name: 'Snow',
    category: 'light',
    colors: {
      bg0: '#f8f8fa', bg1: '#f0f0f4', bg2: '#e8e8ee', bg3: '#e0e0e8', bg4: '#d8d8e0',
      border: '#d0d0da', border2: '#c0c0cc',
      text1: '#111118', text2: '#44445a', text3: '#707088', text4: '#9090a4',
      accent: '#059669', accentDim: 'rgba(5,150,105,.06)',
      purple: '#7c3aed', blue: '#2563eb', red: '#dc2626', yellow: '#d97706', cyan: '#0891b2',
    },
  },
  {
    id: 'cream',
    name: 'Cream',
    category: 'light',
    colors: {
      bg0: '#faf8f5', bg1: '#f5f0ea', bg2: '#ede5db', bg3: '#e5ddd2', bg4: '#ddd4c8',
      border: '#d4c9bb', border2: '#c4b8a8',
      text1: '#1a1612', text2: '#4a4238', text3: '#7a7060', text4: '#a09888',
      accent: '#d97706', accentDim: 'rgba(217,119,6,.06)',
      purple: '#9333ea', blue: '#2563eb', red: '#dc2626', yellow: '#ca8a04', cyan: '#0891b2',
    },
  },
  // === BOLD / BRIGHT ===
  {
    id: 'neon-green',
    name: 'Neon Green',
    category: 'bold',
    colors: {
      bg0: '#001a0a', bg1: '#002210', bg2: '#003318', bg3: '#004422', bg4: '#00552c',
      border: '#006633', border2: '#00884a',
      text1: '#e0ffe8', text2: '#80ffaa', text3: '#40cc70', text4: '#208848',
      accent: '#00ff66', accentDim: 'rgba(0,255,102,.12)',
      purple: '#cc66ff', blue: '#33ccff', red: '#ff3366', yellow: '#ffcc00', cyan: '#00ffcc',
    },
  },
  {
    id: 'electric-blue',
    name: 'Electric Blue',
    category: 'bold',
    colors: {
      bg0: '#000a1a', bg1: '#001030', bg2: '#001845', bg3: '#002060', bg4: '#003080',
      border: '#0040a0', border2: '#0060cc',
      text1: '#e0f0ff', text2: '#80c4ff', text3: '#4090dd', text4: '#2060aa',
      accent: '#00aaff', accentDim: 'rgba(0,170,255,.12)',
      purple: '#aa66ff', blue: '#00ccff', red: '#ff4488', yellow: '#ffdd33', cyan: '#00ffee',
    },
  },
  {
    id: 'hot-pink',
    name: 'Hot Pink',
    category: 'bold',
    colors: {
      bg0: '#1a000e', bg1: '#2a0018', bg2: '#3d0025', bg3: '#500033', bg4: '#660040',
      border: '#880055', border2: '#aa006e',
      text1: '#ffe0f0', text2: '#ff80c0', text3: '#cc4090', text4: '#992060',
      accent: '#ff0088', accentDim: 'rgba(255,0,136,.12)',
      purple: '#cc44ff', blue: '#4488ff', red: '#ff2244', yellow: '#ffaa00', cyan: '#00ffcc',
    },
  },
  {
    id: 'solar-orange',
    name: 'Solar Orange',
    category: 'bold',
    colors: {
      bg0: '#1a0d00', bg1: '#2a1600', bg2: '#3d2000', bg3: '#552c00', bg4: '#663800',
      border: '#884a00', border2: '#aa6000',
      text1: '#fff0e0', text2: '#ffc080', text3: '#cc8840', text4: '#996020',
      accent: '#ff8800', accentDim: 'rgba(255,136,0,.12)',
      purple: '#cc66ff', blue: '#44aaff', red: '#ff3344', yellow: '#ffee00', cyan: '#00ddcc',
    },
  },
  {
    id: 'cyber-purple',
    name: 'Cyber Purple',
    category: 'bold',
    colors: {
      bg0: '#0d001a', bg1: '#160028', bg2: '#200038', bg3: '#2c004d', bg4: '#380066',
      border: '#4a0088', border2: '#6000aa',
      text1: '#f0e0ff', text2: '#cc80ff', text3: '#9940dd', text4: '#6620aa',
      accent: '#aa44ff', accentDim: 'rgba(170,68,255,.12)',
      purple: '#ff44cc', blue: '#44aaff', red: '#ff4466', yellow: '#ffcc00', cyan: '#00ffaa',
    },
  },
  {
    id: 'fire-red',
    name: 'Fire Red',
    category: 'bold',
    colors: {
      bg0: '#1a0000', bg1: '#280808', bg2: '#381010', bg3: '#4d1818', bg4: '#662222',
      border: '#882e2e', border2: '#aa4040',
      text1: '#ffe0e0', text2: '#ff8080', text3: '#dd4444', text4: '#aa2222',
      accent: '#ff2222', accentDim: 'rgba(255,34,34,.12)',
      purple: '#cc44ff', blue: '#4488ff', red: '#ff6644', yellow: '#ffcc00', cyan: '#00ddff',
    },
  },
  {
    id: 'golden',
    name: 'Golden',
    category: 'bold',
    colors: {
      bg0: '#1a1400', bg1: '#282000', bg2: '#382e00', bg3: '#4d3e00', bg4: '#665200',
      border: '#886800', border2: '#aa8400',
      text1: '#fff8e0', text2: '#ffdd66', text3: '#ccaa33', text4: '#998000',
      accent: '#ffcc00', accentDim: 'rgba(255,204,0,.12)',
      purple: '#cc66ff', blue: '#44aaff', red: '#ff4455', yellow: '#ffee44', cyan: '#00ddbb',
    },
  },
  {
    id: 'miami',
    name: 'Miami Vice',
    category: 'bold',
    colors: {
      bg0: '#0a0018', bg1: '#120025', bg2: '#1a0035', bg3: '#240048', bg4: '#300060',
      border: '#400080', border2: '#5500aa',
      text1: '#fff0ff', text2: '#ff88dd', text3: '#cc44aa', text4: '#992278',
      accent: '#ff44cc', accentDim: 'rgba(255,68,204,.12)',
      purple: '#8844ff', blue: '#00ccff', red: '#ff2266', yellow: '#ffdd00', cyan: '#00ffee',
    },
  },
]

// ── Apply theme to DOM ──

export function applyTheme(scheme: ThemeScheme): void {
  const root = document.documentElement
  const c = scheme.colors
  root.style.setProperty('--wp-bg-0', c.bg0)
  root.style.setProperty('--wp-bg-1', c.bg1)
  root.style.setProperty('--wp-bg-2', c.bg2)
  root.style.setProperty('--wp-bg-3', c.bg3)
  root.style.setProperty('--wp-bg-4', c.bg4)
  root.style.setProperty('--wp-border', c.border)
  root.style.setProperty('--wp-border-2', c.border2)
  root.style.setProperty('--wp-text-1', c.text1)
  root.style.setProperty('--wp-text-2', c.text2)
  root.style.setProperty('--wp-text-3', c.text3)
  root.style.setProperty('--wp-text-4', c.text4)
  root.style.setProperty('--wp-accent', c.accent)
  root.style.setProperty('--wp-accent-dim', c.accentDim)
  root.style.setProperty('--wp-purple', c.purple)
  root.style.setProperty('--wp-blue', c.blue)
  root.style.setProperty('--wp-red', c.red)
  root.style.setProperty('--wp-yellow', c.yellow)
  root.style.setProperty('--wp-cyan', c.cyan)

  // Set theme category for conditional CSS
  root.setAttribute('data-wp-theme', scheme.category === 'light' ? 'light' : 'dark')
}

// ── Persist / Load ──

export function saveThemeId(id: string): void {
  localStorage.setItem('wp-theme-scheme', id)
}

export function loadThemeScheme(): ThemeScheme {
  const saved = localStorage.getItem('wp-theme-scheme')
  if (saved) {
    const found = THEME_SCHEMES.find(s => s.id === saved)
    if (found) return found
  }
  return THEME_SCHEMES[0] // midnight default
}

export function getSchemeById(id: string): ThemeScheme | undefined {
  return THEME_SCHEMES.find(s => s.id === id)
}
