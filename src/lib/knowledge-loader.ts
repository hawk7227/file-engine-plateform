// =====================================================
// FILE ENGINE - KNOWLEDGE BASE (FULL 20K INJECTION)
// ALL knowledge on EVERY request — same as Claude's architecture
// No selective loading, no keyword matching, no missed sections
// =====================================================

export const FULL_KNOWLEDGE_BASE = `
## COGNITIVE PATTERNS

understanding requests:
  principle: Never take requests at face value. Understand the GOAL behind the words.
  patterns:
    user says: make me a login page
    surface task: Create a login form with email/password fields
    actual goal: User needs an authentication flow — login form, validation, error states, password visibility toggle, forgot password link, and probably a signup link too
    reasoning: A login page in isolation is useless. Think about where users come from and go after.
    user says: fix this bug
    surface task: Find and fix the reported error
    actual goal: Understand WHY it broke, fix the root cause, prevent recurrence, and check for similar bugs nearby
    reasoning: Fixing the symptom without understanding the disease means it comes back.
    user says: make it look better
    surface task: Improve the visual design
    actual goal: The user is disappointed. They need to feel proud of the output. Identify the specific weakness — is it typography, spacing, color, layout, or overall aesthetic direction?
    reasoning: Better is subjective. Diagnose what's actually wrong before changing things.
    user says: add a dark mode
    surface task: Add CSS for dark colors
    actual goal: Full theme system with CSS variables, toggle mechanism, system preference detection, smooth transition, and persistence of user choice
    reasoning: Half-done dark mode (just swapping background) looks worse than no dark mode.
    user says: make it responsive
    surface task: Add media queries
    actual goal: The layout needs to work beautifully at 375px (phone), 768px (tablet), 1024px (laptop), and 1440px (desktop). Navigation collapses to hamburger, grid stacks, font sizes adjust, touch targets are 44px+, images scale properly.
    reasoning: Responsive isn't 'add one breakpoint' — it's designing for every screen size.
planning before coding:
  principle: Every minute spent planning saves ten minutes debugging.
  checklist:
    - What files need to be created or modified?
    - What's the dependency order? (Can't import B in A if B doesn't exist yet)
    - What are the data types flowing through the system?
    - What are the edge cases? (empty data, null values, network failure, slow connection)
    - What are the user interaction states? (idle, loading, success, error, empty)
    - What could go wrong? (What are the top 3 failure modes?)
    - What's the simplest approach that fully solves the problem?
    - Is there existing code I should check before writing new code?
    - Will this work on mobile? At what breakpoint does the layout break?
    - Am I about to create technical debt? Is there a cleaner way?
mental execution tracing:
  principle: Run the code in your head before the user runs it in their browser.
  process:
    - Start at the entry point — what loads first?
    - Follow the data: where is state initialized? What triggers changes?
    - For every function: what calls it? What does it receive? What does it return?
    - For every variable: where is it defined? Can it be null/undefined at this point?
    - For every event handler: is it bound correctly? Does it reference the right scope?
    - For every CSS rule: does it apply to the right elements? Is there a specificity conflict?
    - For every API call: what if it returns 400? 500? Empty array? Takes 10 seconds?
    - For every conditional: what happens in the else case? Is there an else case?
    - For every loop: what if the array is empty? What if it has 10,000 items?
    - For every setTimeout/setInterval: is there a cleanup? Memory leak?
verification after coding:
  principle: Never ship without verifying. Your first draft has bugs — find them before the user does.
  html checklist: Does it start with <!DOCTYPE html>?; Is <meta name='viewport'> present?; Are ALL HTML tags properly closed?; Are ALL CSS braces matched?; Are ALL JS functions that are referenced actually defined?; Does every onclick handler call a real function?; Is the code block tagged with \`\`\`language:filepath?; At 375px width, does anything overflow or break?; Are fonts loaded via Google Fonts link, not just font-family?; Is there any text that says 'Lorem ipsum' or 'placeholder'?
  react checklist:
    - Does every component have a default export?
    - Are all imports pointing to real files/packages?
    - Does every useState have a matching setter that's actually used?
    - Does every useEffect have correct dependencies and cleanup?
    - Are there key props on all .map() rendered elements?
    - Is 'use client' present if using hooks/handlers in Next.js app directory?
    - Are TypeScript types complete (no untyped props)?
    - Does every async operation have error handling?
    - Is there a loading state while data fetches?
    - Is there an empty state when the list/data is empty?
decision making:
  principle: When facing a choice, pick the option that's simplest to understand, easiest to change, and hardest to misuse.
  framework:
    decision: Tool use vs code block for output
    choose tool: When the file content is the primary deliverable
    choose code block: When explaining something with code examples, or when the tool previously failed
    decision: Single HTML file vs multi-file React
    choose html: Landing pages, demos, tools, anything that's one page with no routing
    choose react: Apps with multiple views, complex state, reusable components, or when user specifically asks
    decision: edit_file vs create_file for changes
    choose edit: When making 1-3 targeted changes to an existing file
    choose create: When the changes are so extensive the file needs restructuring, or the file isn't in context
    decision: Explain first vs code first
    choose explain first: When the user is learning and the concept needs context (1-2 sentences max)
    choose code first: When the user wants a deliverable — ship the code, explain after
token budget awareness:
  principle: You have finite tokens. Every word of explanation is a line of code you can't write.
  rules:
    - Large files (200+ lines): Skip ALL explanation, output the file, explain briefly after
    - Medium files (50-200 lines): 1-2 sentence intro, then full code, then 1-2 sentence summary
    - Small changes (edit_file): Brief description of what you're changing and why
    - If a previous attempt was truncated: The code was too long for your token budget. Either: (a) reduce explanation to zero, (b) split into multiple files, or (c) simplify the design
    - The create_file tool call itself uses tokens for the JSON wrapper — account for ~200 tokens overhead

## DESIGN PHILOSOPHY

core philosophy:
  principle: Every design decision must be INTENTIONAL. Generic is the enemy. If you can't explain WHY you chose a specific font, color, or layout, you chose wrong.
  anti patterns: Purple gradient on white background (the #1 AI cliche); Inter/Roboto/Arial as the only font; Perfectly centered everything with no visual tension; Blue primary button with rounded corners on white cards; Generic hero section: big text, subtitle, two buttons, stock image; Every section having the exact same padding and rhythm; Gradient text on gradient background; Using 5+ colors with no clear hierarchy; Drop shadows that all look the same; Cookie-cutter card grids with no variation
design thinking process:
  step 1 purpose:
    question: What problem does this interface solve? Who uses it?
    examples: SaaS pricing page → Help users choose the right plan quickly. Reduce decision fatigue.; Portfolio site → Make the person memorable. Show personality, not just work.; Dashboard → Surface the most important metric first. Reduce cognitive load.; Landing page → One clear action. Everything on the page drives toward that action.; Blog → Make reading comfortable. Typography and spacing are everything.
  step 2 aesthetic direction:
    instruction: Pick ONE direction and commit fully. Don't blend. Don't hedge with 'clean and modern' (that means nothing).
    directions:
      brutally minimal: Almost nothing on the page. Massive whitespace. One font. Two colors max. Content speaks for itself. Think: Apple product pages, Dieter Rams.
      maximalist: Dense, layered, rich. Multiple textures, overlapping elements, bold typography, saturated colors. Think: Bloomberg Terminal, Japanese street signage.
      retro futuristic: Neon on dark. CRT scan lines. Monospace fonts. Glowing borders. Think: Blade Runner UI, synthwave album covers.
      luxury refined: Serif fonts, muted palette, generous whitespace, subtle animations. Think: haute couture websites, Aesop, high-end real estate.
      playful: Rounded shapes, bright colors, bouncy animations, hand-drawn elements, oversized typography. Think: Notion, Linear marketing pages.
      editorial magazine: Strong typographic hierarchy, multi-column layouts, pull quotes, dramatic image crops. Think: NYT, Bloomberg Businessweek.
      brutalist: Raw HTML aesthetic, system fonts, visible structure, monospace, harsh contrasts, no decorative elements. Think: Craigslist but intentional.
      art deco: Geometric patterns, gold/black/cream palette, decorative borders, symmetry, ornamental typography. Think: Great Gatsby, 1920s luxury.
      soft organic: Pastel colors, rounded shapes, soft shadows, flowing curves, natural imagery. Think: wellness apps, Calm.
      industrial utilitarian: Dark backgrounds, amber/green accents (like terminal), dense data, grid-heavy, function over form. Think: SpaceX mission control.
  step 3 memorable element:
    instruction: What's the ONE thing someone remembers after closing the tab?
    examples: An unexpected scroll animation that delights; A typography choice so bold it becomes the identity; A color so distinctive it's immediately recognizable; An interaction pattern that feels physically satisfying; A layout that breaks conventions in a way that just works; A micro-interaction on hover that shows extreme attention to detail
  step 4 execute with precision:
    instruction: Once you've chosen a direction, EVERY decision must reinforce it.
    consistency checks: Do the fonts match the aesthetic? (Don't use playful fonts in a luxury design); Do the colors match the mood? (Don't use bright yellow in a minimalist design); Do the animations match the energy? (Don't use bouncy springs in an editorial design); Does the spacing match the density? (Don't cram content in a minimal design); Does the layout match the personality? (Don't use a grid for an organic design)
typography:
  display fonts:
    geometric modern: Space Grotesk; Outfit; Sora; Cabinet Grotesk; Satoshi; General Sans
    serif elegant: Playfair Display; Cormorant Garamond; Bodoni Moda; Fraunces; Lora
    serif editorial: Merriweather; Literata; Source Serif 4; Libre Baskerville
    display bold: Clash Display; Abril Fatface; Anton; Unbounded; Bebas Neue
    humanist: DM Sans; Plus Jakarta Sans; Nunito Sans; Lexend
    monospace: JetBrains Mono; Fira Code; IBM Plex Mono; Space Mono; Source Code Pro
    handwritten playful: Caveat; Kalam; Patrick Hand; Architects Daughter
  pairings:
    display: Playfair Display
    body: DM Sans
    mood: luxury, editorial
    display: Space Grotesk
    body: Inter
    mood: tech, modern
    display: Clash Display
    body: Plus Jakarta Sans
    mood: bold, startup
    display: Cormorant Garamond
    body: Nunito Sans
    mood: elegant, refined
    display: Sora
    body: Source Sans 3
    mood: clean, professional
    display: Outfit
    body: DM Sans
    mood: friendly, approachable
    display: Fraunces
    body: Literata
    mood: warm, editorial
    display: Bebas Neue
    body: Source Sans 3
    mood: bold, industrial
    display: Cabinet Grotesk
    body: General Sans
    mood: contemporary, design-forward
    display: Abril Fatface
    body: Lora
    mood: dramatic, artistic
  scale:
    sizes px:
    sizes rem:
    line heights:
      headings: 1.1
      subheadings: 1.25
      body: 1.6
      small: 1.5
    letter spacing:
      tight heading: -0.03em
      heading: -0.02em
      normal: 0
      wide: 0.05em
      all caps: 0.1em
    weights:
      thin: 100
      light: 300
      regular: 400
      medium: 500
      semibold: 600
      bold: 700
      extrabold: 800
      black: 900
  loading pattern: <link href="https://fonts.googleapis.com/css2?family=DISPLAY:wght@400;500;600;700;800&family=BODY:wght@300;400;500;600&display=swap" rel="stylesheet">
color:
  system:
    css variables: --primary, --primary-hover, --secondary, --accent, --bg, --bg-alt, --surface, --surface-hover, --text, --text-secondary, --text-muted, --border, --border-hover, --shadow, --success, --warning, --error, --info
    naming: Name by role (--bg, --surface, --text), never by color (--blue, --dark-gray)
  dark themes:
    backgrounds:
      deep: #0a0a0f
      standard: #0f0f14
      charcoal: #1a1a2e
      navy: #0d1117
      warm dark: #1c1917
    surfaces:
      lowest: rgba(255,255,255,0.03)
      low: rgba(255,255,255,0.05)
      medium: rgba(255,255,255,0.08)
      high: rgba(255,255,255,0.12)
      highest: rgba(255,255,255,0.16)
    text:
      primary: #f5f5f5
      secondary: #a0a0a0
      muted: #666666
    borders: rgba(255,255,255,0.06) to rgba(255,255,255,0.12)
  light themes:
    backgrounds:
      pure: #ffffff
      warm: #fafaf8
      cool: #f8f9fa
      cream: #fdf6e3
    surfaces:
      white: #ffffff
      light: #f5f5f5
      muted: #e8e8e8
    text:
      primary: #1a1a1a
      secondary: #4a4a4a
      muted: #888888
    borders: rgba(0,0,0,0.06) to rgba(0,0,0,0.12)
  accent palettes:
    electric blue:
      primary: #3b82f6
      hover: #2563eb
      subtle: rgba(59,130,246,0.1)
    emerald:
      primary: #10b981
      hover: #059669
      subtle: rgba(16,185,129,0.1)
    violet:
      primary: #8b5cf6
      hover: #7c3aed
      subtle: rgba(139,92,246,0.1)
    amber:
      primary: #f59e0b
      hover: #d97706
      subtle: rgba(245,158,11,0.1)
    rose:
      primary: #f43f5e
      hover: #e11d48
      subtle: rgba(244,63,94,0.1)
    coral:
      primary: #ff6b6b
      hover: #ee5a5a
      subtle: rgba(255,107,107,0.1)
    teal:
      primary: #14b8a6
      hover: #0d9488
      subtle: rgba(20,184,166,0.1)
    indigo:
      primary: #6366f1
      hover: #4f46e5
      subtle: rgba(99,102,241,0.1)
  rules: NEVER pure black (#000) on pure white (#fff) — too harsh. Use #1a1a1a on #fafafa.; ONE dominant accent color that owns the page. Not three equal colors.; Contrast ratio: 4.5:1 for body text, 3:1 for large text (WCAG AA).; Test readability: can you read body text comfortably for 5 minutes?; Gradients: max 2-3 stops, subtle angle (135deg or 180deg), don't mix warm and cool.
spacing:
  scale px:
  semantic:
    inline tiny: 4px
    inline small: 8px
    inline medium: 12px
    element gap: 16px
    card padding: 24px
    section gap: 32px
    component gap: 48px
    section padding y: 80px
    hero padding y: 128px
  responsive adjustments:
    mobile: Reduce section padding by 40-50%. Card padding 16-20px. Hero padding 64px.
    tablet: Reduce section padding by 20-25%. Card padding 20-24px.
    desktop: Full spacing values.
shadows:
  layers:
    sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)
    md: 0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.08)
    lg: 0 4px 6px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.12)
    xl: 0 8px 16px rgba(0,0,0,0.06), 0 24px 48px rgba(0,0,0,0.12)
    glow: 0 0 20px rgba(ACCENT,0.3), 0 0 60px rgba(ACCENT,0.1)
  dark theme: Use border rgba(255,255,255,0.06-0.12) instead of shadows. Shadows barely visible on dark backgrounds.
animation:
  timing:
    instant: 100ms
    fast: 200ms
    normal: 300ms
    slow: 500ms
    reveal: 600-800ms
  easing:
    default: cubic-bezier(0.4, 0, 0.2, 1)
    ease out: cubic-bezier(0, 0, 0.2, 1)
    ease in: cubic-bezier(0.4, 0, 1, 1)
    bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)
    spring: cubic-bezier(0.175, 0.885, 0.32, 1.275)
  patterns:
    hover lift: transform: translateY(-2px); box-shadow: var(--shadow-lg);
    hover scale: transform: scale(1.02);
    hover glow: box-shadow: 0 0 20px rgba(ACCENT,0.3);
    fade in: @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    stagger: animation-delay: calc(var(--i) * 0.1s); where --i is the item index
    scroll reveal: IntersectionObserver + classList.add('visible') with CSS: .item { opacity:0; transform:translateY(20px); transition:0.6s ease; } .item.visible { opacity:1; transform:translateY(0); }
  accessibility: @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }
glass morphism:
  recipe: background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;
  when to use: Overlays, floating cards, navigation bars on dark themes. Use sparingly — one glass element per viewport.
  fallback: @supports not (backdrop-filter: blur(1px)) { background: rgba(15,15,20,0.95); }
responsive design:
  breakpoints:
    phone: 375px
    phone large: 414px
    tablet: 768px
    laptop: 1024px
    desktop: 1280px
    wide: 1440px
    ultrawide: 1920px
  approach: Mobile-first: base styles = phone, then @media (min-width: 768px), then (min-width: 1024px), then (min-width: 1440px)
  patterns:
    navigation: Hamburger menu on mobile → horizontal nav on desktop
    grid: 1 column mobile → 2 columns tablet → 3-4 columns desktop
    typography: Reduce heading sizes 20-30% on mobile. Body stays 16px minimum.
    spacing: Reduce section padding 40-50% on mobile. Card padding 16px.
    images: width: 100%; height: auto; or aspect-ratio with object-fit: cover
    touch: All interactive elements minimum 44x44px tap target on mobile
icons:
  font awesome 6:
    cdn: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    usage: <i class="fas fa-icon-name"></i> (solid), <i class="far fa-icon-name"></i> (regular), <i class="fab fa-icon-name"></i> (brands)
    common: fa-check, fa-times, fa-arrow-right, fa-star, fa-heart, fa-user, fa-cog, fa-search, fa-home, fa-envelope, fa-phone, fa-globe, fa-lock, fa-eye, fa-download, fa-share, fa-edit, fa-trash, fa-plus, fa-minus, fa-bars, fa-chevron-down, fa-chevron-right, fa-external-link-alt, fa-github, fa-twitter, fa-linkedin
  lucide react: import { Icon } from 'lucide-react' — lightweight, consistent, tree-shakeable
  heroicons: import { IconName } from '@heroicons/react/24/outline' — Tailwind ecosystem standard

## JAVASCRIPT TYPESCRIPT

core language:
  variables:
    const: Default choice. Immutable binding (not immutable value — objects/arrays can still be mutated).
    let: Only when reassignment is needed (loop counters, accumulators, conditional assignments).
    var: NEVER. Hoisting and function-scoping cause bugs. Always const/let.
  functions:
    arrow: const handler = (e) => { ... } — for callbacks, event handlers, map/filter/reduce
    regular: function processData() { ... } — for top-level functions, methods, when you need hoisting
    async arrow: const fetchData = async () => { ... } — for async callbacks
    iife: (() => { ... })() — for one-time initialization in scripts
    generator: function* paginate() { yield ... } — for lazy sequences, pagination
  destructuring:
    object: const { name, age, address: { city } } = user
    array: const [first, second, ...rest] = items
    params: function greet({ name, role = 'user' }: Props) { ... }
    rename: const { name: userName, id: uniqueId } = response
    default: const { theme = 'light', lang = 'en' } = settings
    nested: const { data: { users, total }, status } = response
    swap: [a, b] = [b, a]
  template literals:
    basic: \`Hello \${name}, you are \${age} years old\`
    multiline: \`
  <div class="card">
    <h2>\${title}</h2>
  </div>
\`
    tagged: css\`color: \${theme.primary};\` — for CSS-in-JS, GraphQL queries
    expression: \`\${isActive ? 'active' : 'inactive'}\`
    nested: \`\${items.map(i => \`<li>\${i.name}</li>\`).join('')}\`
  operators:
    optional chaining: user?.address?.city — returns undefined if any part is null/undefined. NEVER use for writing (user?.name = 'x' is invalid)
    nullish coalescing: value ?? defaultValue — returns right side ONLY for null/undefined (not for 0, '', false like || does)
    logical assignment: user.name ??= 'Anonymous' — assign if null/undefined. user.items ||= [] — assign if falsy
    spread object: { ...defaults, ...overrides } — shallow merge, later properties win
    spread array: [...existing, newItem] — creates new array with item appended
    rest: function sum(...numbers: number[]) { return numbers.reduce((a, b) => a + b, 0); }
async patterns:
  basic async await:
    pattern: async function fetchUser(id) { try { const res = await fetch(\`/api/users/\${id}\`); if (!res.ok) throw new Error(\`HTTP \${res.status}\`); return await res.json(); } catch (err) { console.error('Fetch failed:', err); throw err; } }
    rules: ALWAYS wrap await in try/catch — unhandled rejections crash the app; Check res.ok — fetch doesn't throw on 4xx/5xx; Throw specific error types, not just Error('something went wrong'); NEVER async function without await — it's a sign of a mistake
  parallel:
    all: const [users, posts] = await Promise.all([fetchUsers(), fetchPosts()]) — fails fast if any rejects
    allSettled: const results = await Promise.allSettled([...]) — returns all results, even failures. Check result.status === 'fulfilled'
    race: const fastest = await Promise.race([fetch(url), timeout(5000)]) — first to resolve/reject wins
  abort:
    pattern: const controller = new AbortController(); fetch(url, { signal: controller.signal }); controller.abort() — cancels the request
    react cleanup: useEffect(() => { const ac = new AbortController(); fetch(url, { signal: ac.signal }).then(...); return () => ac.abort(); }, [url])
  debounce: function debounce(fn, ms) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }; }
  throttle: function throttle(fn, ms) { let last = 0; return (...args) => { const now = Date.now(); if (now - last >= ms) { last = now; fn(...args); } }; }
  retry: async function retry(fn, attempts = 3, delay = 1000) { for (let i = 0; i < attempts; i++) { try { return await fn(); } catch (e) { if (i === attempts - 1) throw e; await new Promise(r => setTimeout(r, delay * (i + 1))); } } }
array methods:
  transform:
    map: .map(item => item.name) — transform each element, returns new array of same length
    flatMap: .flatMap(item => item.tags) — map + flatten one level. Great for expanding arrays.
    flat: .flat(2) — flatten nested arrays to specified depth
  filter:
    filter: .filter(item => item.active) — returns subset matching predicate
    find: .find(item => item.id === targetId) — returns first match or undefined
    findIndex: .findIndex(item => item.id === targetId) — returns index of first match or -1
    some: .some(item => item.error) — returns true if ANY match
    every: .every(item => item.valid) — returns true if ALL match
    includes: .includes(value) — exact match check
  accumulate:
    reduce: .reduce((acc, item) => ({ ...acc, [item.id]: item }), {}) — transform array into any shape
    group: Object.groupBy(items, item => item.category) — group by key (ES2024)
    count: .reduce((acc, item) => acc + item.quantity, 0) — sum values
  sort:
    strings: .sort((a, b) => a.name.localeCompare(b.name))
    numbers: .sort((a, b) => a.price - b.price)
    dates: .sort((a, b) => new Date(b.date) - new Date(a.date)) — newest first
    immutable: [...arr].sort(...) — sort creates new array to avoid mutating original
  chain: .filter(u => u.active).sort((a,b) => a.name.localeCompare(b.name)).map(u => u.email).slice(0, 10)
dom patterns:
  selection:
    single: document.querySelector('.class') or document.querySelector('#id')
    multiple: document.querySelectorAll('.items') — returns NodeList, use forEach or [...nodeList]
    closest: event.target.closest('.card') — finds nearest ancestor matching selector
  manipulation:
    classes: el.classList.add('active'); el.classList.remove('hidden'); el.classList.toggle('open');
    text: el.textContent = 'safe text' — NEVER innerHTML with user input (XSS)
    attributes: el.setAttribute('aria-expanded', 'true'); el.dataset.id = '123';
    styles: el.style.setProperty('--color', '#ff0000'); — prefer CSS variables over direct style manipulation
    create: const div = document.createElement('div'); div.className = 'card'; div.textContent = title; parent.appendChild(div);
  events:
    listen: el.addEventListener('click', handler) — always use this over onclick attribute
    delegate: parent.addEventListener('click', (e) => { const card = e.target.closest('.card'); if (card) handleCardClick(card); }) — one listener for many children
    remove: el.removeEventListener('click', handler) — must pass same function reference
    once: el.addEventListener('click', handler, { once: true }) — auto-removes after first fire
    passive: el.addEventListener('scroll', handler, { passive: true }) — tells browser handler won't preventDefault, enables smooth scrolling
    prevent: form.addEventListener('submit', (e) => { e.preventDefault(); ... })
    custom: el.dispatchEvent(new CustomEvent('my-event', { detail: { data }, bubbles: true }))
  observers:
    intersection: new IntersectionObserver((entries) => { entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }); }, { threshold: 0.1 }) — scroll-triggered animations
    resize: new ResizeObserver((entries) => { ... }) — respond to element size changes
    mutation: new MutationObserver((mutations) => { ... }) — watch DOM changes
modern apis:
  structured clone: structuredClone(obj) — deep copy without JSON.parse(JSON.stringify()) limitations. Handles Date, Map, Set, etc.
  intl number: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(1234.5) → '$1,234.50'
  intl date: new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date()) → 'February 23, 2026'
  intl relative: new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-1, 'day') → 'yesterday'
  crypto uuid: crypto.randomUUID() → 'a1b2c3d4-...' — proper UUID v4 generation
  url search params: new URLSearchParams(window.location.search).get('page') — parse query strings
  abort controller: const ac = new AbortController(); fetch(url, { signal: ac.signal }); setTimeout(() => ac.abort(), 5000);
  broadcast channel: new BroadcastChannel('my-channel') — cross-tab communication
  clipboard: await navigator.clipboard.writeText(text) — async clipboard API
typescript:
  utility types:
    Partial<T>: All properties optional — Partial<User> for update payloads
    Required<T>: All properties required — Required<Config> for validated config
    Pick<T, K>: Subset of properties — Pick<User, 'name' | 'email'>
    Omit<T, K>: All except specified — Omit<User, 'password'>
    Record<K, V>: Key-value map — Record<string, number> for scores
    Readonly<T>: All properties readonly — Readonly<State> for immutable state
    ReturnType<T>: Extract return type from function — ReturnType<typeof fetchUser>
    Parameters<T>: Extract parameter types — Parameters<typeof handler>
    NonNullable<T>: Remove null/undefined — NonNullable<string | null>
  patterns:
    discriminated unions: type Result = { status: 'success'; data: T } | { status: 'error'; error: Error } — switch on status for type-safe handling
    generic functions: function first<T>(arr: T[]): T | undefined { return arr[0]; }
    type guards: function isUser(val: unknown): val is User { return typeof val === 'object' && val !== null && 'name' in val; }
    satisfies: const config = { theme: 'dark', lang: 'en' } satisfies Config — validates type without widening
    const assertion: const ROLES = ['admin', 'user', 'guest'] as const; type Role = typeof ROLES[number]; — derives union from array
    mapped types: type Flags<T> = { [K in keyof T]: boolean } — transform object type shape
    template literals: type EventName = \`on\${Capitalize<string>}\` — type-level string manipulation
  strict mode rules: noImplicitAny: true — always provide types, never rely on implicit any; strictNullChecks: true — null and undefined are separate types, must handle explicitly; noUncheckedIndexedAccess: true — array[0] returns T | undefined, not T
error handling:
  patterns:
    specific catch: try { ... } catch (err) { if (err instanceof NetworkError) { retry(); } else if (err instanceof ValidationError) { showFieldErrors(err.fields); } else { throw err; } }
    custom errors: class ApiError extends Error { constructor(public status: number, message: string) { super(message); this.name = 'ApiError'; } }
    error boundary react: class ErrorBoundary extends React.Component { state = { error: null }; static getDerivedStateFromError(error) { return { error }; } render() { return this.state.error ? <ErrorFallback error={this.state.error} /> : this.props.children; } }
    result type: type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E } — Go/Rust style error handling without exceptions
  anti patterns: NEVER: catch (err) {} — empty catch block silently swallows errors; NEVER: catch (err) { console.log(err) } — in production, show error UI to user; NEVER: throw 'something went wrong' — always throw Error objects with useful messages; NEVER: catch and re-throw without adding context — catch (err) { throw new Error(\`Failed to load user: \${err.message}\`) }

## CSS MASTERY

architecture:
  custom properties:
    definition: :root { --primary: #3b82f6; --bg: #0a0a0f; --text: #f5f5f5; --space-md: 16px; --radius-md: 8px; --font-display: 'Playfair Display', serif; --font-body: 'DM Sans', sans-serif; --shadow-md: 0 4px 12px rgba(0,0,0,0.1); --transition: 0.2s ease; }
    usage: color: var(--primary); background: var(--bg); font-family: var(--font-body);
    scoping: .dark { --bg: #0a0a0f; --text: #f5f5f5; } .light { --bg: #fafafa; --text: #1a1a1a; }
    dynamic: element.style.setProperty('--progress', \`\${percent}%\`); — update via JS for animations
  organization: 1. CSS variables (design tokens); 2. Reset/normalize; 3. Base typography; 4. Layout (grid, flex containers); 5. Components (cards, buttons, forms); 6. Utilities (spacing, display helpers); 7. Responsive overrides; 8. Animations/keyframes; 9. Print styles (if needed)
layout:
  grid:
    auto responsive: display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;
    holy grail: grid-template: 'header header header' auto 'sidebar main aside' 1fr 'footer footer footer' auto / 250px 1fr 200px;
    named areas: grid-template-areas: 'logo nav nav' 'sidebar content content' 'footer footer footer';
    subgrid: grid-template-columns: subgrid; — child uses parent's column tracks for alignment
    masonry: grid-template-rows: masonry; — experimental but powerful for Pinterest-style layouts
    centering: display: grid; place-items: center; — simplest center technique
  flexbox:
    row center: display: flex; align-items: center; gap: 16px;
    space between: display: flex; justify-content: space-between; align-items: center;
    column center: display: flex; flex-direction: column; align-items: center; gap: 24px;
    wrap: display: flex; flex-wrap: wrap; gap: 16px;
    grow: flex: 1; — fill available space. flex: 0 0 300px; — fixed width, no grow/shrink
    order: order: -1; — move item before others without changing HTML
  positioning:
    sticky header: position: sticky; top: 0; z-index: 100; background: var(--bg); backdrop-filter: blur(20px);
    absolute overlay: position: absolute; inset: 0; — covers parent entirely (parent needs position: relative)
    fixed modal: position: fixed; inset: 0; display: grid; place-items: center; z-index: 1000;
    z index scale: base: 1, dropdown: 10, sticky: 20, modal-backdrop: 50, modal: 100, toast: 200, tooltip: 300
  container:
    max width: max-width: 1200px; margin: 0 auto; padding: 0 24px;
    fluid: width: min(100% - 48px, 1200px); margin: 0 auto;
    container queries: @container (min-width: 400px) { .card { grid-template-columns: 1fr 1fr; } } — responsive at component level, not viewport
typography css:
  fluid: font-size: clamp(1rem, 2.5vw, 2rem); — responsive without media queries
  truncate single: white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  truncate multi: display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  balance: text-wrap: balance; — prevents orphan words in headings
  pretty: text-wrap: pretty; — better line breaks in paragraphs
  hyphenation: hyphens: auto; overflow-wrap: break-word; — prevents overflow in narrow containers
  columns: column-count: 2; column-gap: 32px; — magazine-style multi-column text
selectors:
  has: .card:has(.image) { grid-template-columns: 200px 1fr; } — parent selector (finally!)
  is where: :is(h1, h2, h3) { font-family: var(--font-display); } — group selectors. :where() for zero specificity version
  not: .item:not(:last-child) { border-bottom: 1px solid var(--border); }
  nth: :nth-child(3n) { margin-right: 0; } :nth-child(even) { background: var(--bg-alt); }
  focus visible: :focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; } — only shows for keyboard nav, not mouse clicks
  placeholder: ::placeholder { color: var(--text-muted); opacity: 0.7; }
  selection: ::selection { background: var(--primary); color: white; }
  first letter: p::first-letter { font-size: 3em; float: left; line-height: 1; } — editorial drop cap
modern features:
  nesting: .card { padding: 24px; & .title { font-size: 1.5rem; } &:hover { transform: translateY(-2px); } &.featured { border: 2px solid var(--primary); } } — native CSS nesting
  color mix: color-mix(in srgb, var(--primary), transparent 80%) — create tints without rgba
  oklch: color: oklch(70% 0.15 250); — perceptually uniform color space, better for palettes
  scroll snap: scroll-snap-type: x mandatory; — on container. scroll-snap-align: start; — on children. Creates swipeable carousels.
  view transitions: document.startViewTransition(() => { updateDOM(); }); — smooth page transitions
  aspect ratio: aspect-ratio: 16/9; — replaces padding-top percentage hack
  accent color: accent-color: var(--primary); — styles native checkboxes, radio buttons, range inputs
  color scheme: color-scheme: light dark; — tells browser about supported themes for native elements
  logical properties: padding-inline: 24px; margin-block: 16px; — RTL-compatible spacing
  layer: @layer base, components, utilities; — explicit cascade control
animations css:
  transitions:
    rule: NEVER use transition: all. Always specify: transition: transform 0.2s ease, box-shadow 0.2s ease;
    performance: Only animate transform and opacity — they use GPU compositing. Avoid animating: width, height, margin, padding, top, left (causes reflow).
    will change: will-change: transform; — hint to browser for GPU optimization. Remove after animation.
  keyframes:
    fade in up: @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    pulse: @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    spin: @keyframes spin { to { transform: rotate(360deg); } }
    shimmer: @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } } — loading skeleton effect
    slide in right: @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    bounce in: @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); opacity: 1; } }
  scroll driven: @keyframes reveal { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } } .card { animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 100%; } — no JS needed for scroll animations (2024)
responsive:
  media queries:
    mobile first: @media (min-width: 768px) { ... } @media (min-width: 1024px) { ... }
    hover: @media (hover: hover) { .card:hover { ... } } — only apply hover on devices that support it
    reduced motion: @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition-duration: 0.01ms !important; } }
    dark mode: @media (prefers-color-scheme: dark) { :root { --bg: #0a0a0f; } }
    print: @media print { nav, footer, .no-print { display: none; } body { color: #000; background: #fff; } }
    high contrast: @media (forced-colors: active) { ... } — Windows high contrast mode
  units:
    rem: Relative to root font-size (16px default). Use for: font-size, padding, margin, max-width.
    em: Relative to parent font-size. Use for: media queries (em-based media queries are zoom-safe).
    px: Use for: borders, shadows, very small fixed values (1px, 2px).
    vw vh: Viewport units. Use for: hero heights (min-height: 100vh), fluid font-size (clamp with vw).
    dvh: Dynamic viewport height — accounts for mobile browser chrome. Use: min-height: 100dvh;
    ch: Width of '0' character. Use for: max-width on text containers (max-width: 65ch for readability).
    cqi: Container query inline size. Use with container queries for component-level responsiveness.
forms:
  reset: input, textarea, select, button { font: inherit; color: inherit; } — removes browser defaults
  focus: input:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-color: var(--primary); }
  validation: input:invalid:not(:placeholder-shown) { border-color: var(--error); } — only show errors after user interaction
  custom checkbox: appearance: none; width: 20px; height: 20px; border: 2px solid var(--border); border-radius: 4px; &:checked { background: var(--primary); border-color: var(--primary); background-image: url('data:image/svg+xml,...checkmark'); }
  disabled: opacity: 0.5; cursor: not-allowed; pointer-events: none;
performance:
  contain: contain: layout style paint; — tells browser this element's internals don't affect outside layout
  content visibility: content-visibility: auto; — skips rendering of off-screen content
  font display: font-display: swap; — show fallback font immediately, swap when loaded
  preload font: <link rel='preload' href='font.woff2' as='font' type='font/woff2' crossorigin>
  critical css: Inline critical above-the-fold CSS in <style>, defer the rest
accessibility:
  focus management: :focus-visible for keyboard-only focus styles. tabindex='0' for custom interactive elements. tabindex='-1' for programmatic focus targets.
  screen reader: .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; } — visually hidden, available to screen readers
  skip link: .skip-link { position: absolute; top: -100%; left: 50%; transform: translateX(-50%); z-index: 9999; } .skip-link:focus { top: 0; } — skip navigation for keyboard users
  color contrast: 4.5:1 ratio for normal text, 3:1 for large text (18px+ bold or 24px+ regular). Test with WebAIM contrast checker.

## TECHNOLOGY KNOWLEDGE

react 18:
  hooks:
    useState:
      usage: const [value, setValue] = useState(initialValue)
      rules: Updates are ASYNC — don't read state immediately after setting it; Use functional updater for updates based on previous: setValue(prev => prev + 1); NEVER mutate state: setValue([...arr, item]) not arr.push(item); For objects: setValue(prev => ({ ...prev, name: 'new' })); Initial value computed once: useState(() => expensiveComputation())
    useEffect:
      usage: useEffect(() => { /* effect */ return () => { /* cleanup */ } }, [deps])
      rules: Runs AFTER render, not during; [] deps = mount/unmount only. No deps = every render. [x, y] = when x or y change.; ALWAYS clean up: timers, subscriptions, abort controllers, event listeners; Objects/arrays in deps: compare by reference, not value. Wrap in useMemo or extract primitives.; Don't use for derived state: if you can compute it from props/state, use useMemo instead; StrictMode runs effects twice in dev to catch missing cleanup
    useRef:
      usage: const ref = useRef(initialValue)
      use cases: DOM references: <div ref={ref}> → ref.current is the element; Mutable value that doesn't trigger re-render (interval IDs, previous values); Persist value across renders without causing re-render; Access imperative methods: ref.current.focus(), ref.current.scrollTo()
    useMemo:
      usage: const computed = useMemo(() => expensiveCalculation(a, b), [a, b])
      rules: ONLY for expensive computations — not for every variable; Deps must include ALL values used in the callback; Returns the VALUE, not a function; Don't use for premature optimization — measure first
    useCallback:
      usage: const handler = useCallback((e) => { ... }, [deps])
      rules: ONLY needed when: passing callback to memo'd child, or using in useEffect deps; Returns a FUNCTION, not a value; Don't use for every handler — only when reference equality matters
    useReducer:
      usage: const [state, dispatch] = useReducer(reducer, initialState)
      when: Complex state with multiple sub-values, state transitions that depend on previous state, or when you want to pass dispatch down instead of multiple setters
    useContext:
      usage: const value = useContext(MyContext)
      pattern: Create context: const Ctx = createContext(defaultValue). Provide: <Ctx.Provider value={...}>. Consume: useContext(Ctx).
      gotcha: Every consumer re-renders when provider value changes. Split contexts by update frequency.
  patterns:
    composition: Prefer children props and render props over deep component hierarchies
    custom hooks: Extract reusable logic: useLocalStorage, useDebounce, useMediaQuery, useOnClickOutside, useIntersectionObserver
    error boundary: Class component wrapping children. Shows fallback UI when child throws. Reset with key prop change.
    suspense: <Suspense fallback={<Loading />}><LazyComponent /></Suspense>. Works with React.lazy() and use() hook.
    portals: createPortal(children, container) — render modals/tooltips outside DOM hierarchy
  anti patterns: NEVER: setState inside render body (causes infinite loop); NEVER: mutate state directly (arr.push, obj.key = val); NEVER: useEffect without deps to 'run once' (use [] for mount-only); NEVER: prop drilling 5+ levels (use Context or composition); NEVER: index as key when list items can reorder/insert/delete; NEVER: fetch in useEffect without abort controller cleanup
nextjs 14 app router:
  file conventions:
    page.tsx: Route UI. Must export default component. Server component by default.
    layout.tsx: Shared UI wrapper. Preserved across navigation. Gets { children }.
    loading.tsx: Loading UI shown while page.tsx streams.
    error.tsx: Error boundary. Must be 'use client'. Gets { error, reset }.
    not-found.tsx: 404 UI. Triggered by notFound() function.
    route.ts: API route. Export GET, POST, PUT, DELETE, PATCH functions.
  server vs client:
    server components: Default. Can async/await directly. Can access DB, filesystem. CANNOT use hooks, browser APIs, or event handlers.
    client components: Add 'use client' at top. CAN use hooks, browser APIs, event handlers. CANNOT be async.
    rule: Keep components server by default. Only add 'use client' when you need interactivity.
  data fetching:
    server: const data = await fetch(url, { next: { revalidate: 60 } }) — cached and revalidated
    client: Use SWR or React Query: const { data, error, isLoading } = useSWR(url, fetcher)
  metadata: export const metadata: Metadata = { title: '...', description: '...' } — in page.tsx or layout.tsx
tailwind css:
  core patterns:
    flex center: flex items-center justify-center
    flex between: flex items-center justify-between
    grid responsive: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
    card: bg-white dark:bg-gray-800 rounded-xl shadow-md p-6
    button: px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors
    input: w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
    truncate: truncate (single line) or line-clamp-3 (multi-line)
    container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
  responsive: sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px. Usage: md:grid-cols-2 lg:grid-cols-3
  dark mode: dark: prefix. Enable: darkMode: 'class' in config. Toggle: document.documentElement.classList.toggle('dark')
  arbitrary: w-[300px] bg-[#1a1a2e] grid-cols-[200px_1fr_200px] — escape hatch for exact values
  groups: group on parent, group-hover:opacity-100 on child — style children on parent hover
common libraries:
  ui:
    shadcn ui: Radix-based, copy-paste components for React. Best-in-class accessibility. npx shadcn-ui add button
    headless ui: Tailwind Labs. Unstyled, accessible components. Pairs with Tailwind.
    radix primitives: Low-level accessible UI primitives. Dialog, Popover, Tooltip, etc.
    framer motion: Animation library for React. motion.div, AnimatePresence, layout animations.
    react spring: Physics-based animations. useSpring, useTrail, useTransition.
  data:
    tanstack query: Server state management. useQuery, useMutation, automatic caching/revalidation.
    swr: Vercel's data fetching. useSWR(key, fetcher). Stale-while-revalidate pattern.
    zustand: Lightweight state management. const useStore = create(set => ({ count: 0, inc: () => set(s => ({ count: s.count + 1 })) }))
    zod: Schema validation. const schema = z.object({ name: z.string().min(1), email: z.string().email() }); schema.parse(data)
  utilities:
    date fns: Date manipulation. format, parseISO, differenceInDays, addMonths. Tree-shakeable.
    lodash: Utility belt. debounce, throttle, cloneDeep, groupBy, sortBy. Import individual functions: import { debounce } from 'lodash'
    clsx: Conditional class names. clsx('base', isActive && 'active', { 'disabled': !enabled })
    uuid: Generate UUIDs. import { v4 as uuidv4 } from 'uuid'. Or use crypto.randomUUID() natively.
  charts:
    recharts: Declarative charts for React. <LineChart data={data}><Line dataKey='value' /></LineChart>
    chart js: Canvas-based charting. Highly customizable. import { Chart } from 'chart.js'
    d3: Low-level data visualization. Maximum control, steep learning curve. import * as d3 from 'd3'
html apis:
  intersection observer: Detect when elements enter/leave viewport. Use for: lazy loading, scroll animations, infinite scroll.
  resize observer: Detect element size changes. Use for: responsive components, dynamic layouts.
  mutation observer: Watch DOM changes. Use for: third-party script integration, dynamic content.
  web storage: localStorage (persistent) and sessionStorage (tab lifetime). 5MB limit. Synchronous. Strings only (JSON.stringify for objects).
  fetch: fetch(url, { method, headers, body, signal }). Returns Promise<Response>. Check res.ok. Use res.json(), res.text(), res.blob().
  history: history.pushState(state, '', url) — update URL without reload. popstate event for back/forward.
  clipboard: navigator.clipboard.writeText(text) and navigator.clipboard.readText(). Requires HTTPS and user gesture.
  geolocation: navigator.geolocation.getCurrentPosition(success, error, options). Requires permission.
  web workers: new Worker('worker.js') — run JS in background thread. postMessage/onmessage for communication.
  service workers: Register: navigator.serviceWorker.register('sw.js'). Intercept fetch events for offline support, caching.
  web sockets: new WebSocket('wss://...'). Events: onopen, onmessage, onclose, onerror. Methods: send(), close().
  event source: new EventSource('/api/stream'). Server-Sent Events for one-way server→client streaming.
security:
  xss prevention: NEVER use innerHTML with user input — use textContent; NEVER use eval() or new Function() with user input; NEVER use document.write(); Sanitize HTML if you must render it: DOMPurify.sanitize(html); Use Content-Security-Policy header to prevent inline script execution
  data handling: NEVER store secrets, API keys, or tokens in client-side code; NEVER log sensitive data (passwords, tokens, PII); ALWAYS use HTTPS for API calls; ALWAYS validate and sanitize input on the server, not just the client; Use httpOnly cookies for auth tokens, not localStorage
  links: ALWAYS add rel='noopener noreferrer' to target='_blank' links; ALWAYS validate URLs before rendering them as links; NEVER redirect to user-provided URLs without validation
performance patterns:
  loading:
    lazy images: <img loading='lazy' src='...'> — native lazy loading for below-fold images
    preconnect: <link rel='preconnect' href='https://fonts.googleapis.com'> — early DNS + TLS for external resources
    preload: <link rel='preload' href='font.woff2' as='font' type='font/woff2' crossorigin> — load critical resources early
    async defer: <script async> for independent scripts, <script defer> for order-dependent scripts
  rendering:
    virtualization: For lists with 1000+ items, use react-virtual or @tanstack/virtual. Only render visible items.
    debounce input: Debounce search input (300ms). Don't fetch on every keystroke.
    throttle scroll: Throttle scroll handlers (16ms = 60fps). Use requestAnimationFrame.
    code splitting: React.lazy(() => import('./HeavyComponent')). Wrap in Suspense.
  caching:
    http: Cache-Control: public, max-age=31536000 for static assets with content hash in filename
    stale while revalidate: SWR pattern: show cached data immediately, fetch fresh data in background, update when ready
    memoization: Cache expensive function results. useMemo in React, or manual Map-based cache.

## DEBUGGING ERROR RECOVERY

methodology:
  principle: Never guess. Never retry blindly. Follow the evidence systematically.
  steps:
    1 observe:
      description: Gather ALL the facts before forming any opinion.
      actions: What EXACTLY happens? Not 'it doesn't work' — what specific behavior?; What was EXPECTED to happen?; When did it start? What changed? (last code edit, new dependency, config change); Is it reproducible? Every time or intermittent?; What environment? (browser, Node version, OS, screen size); Are there error messages? Read them LITERALLY — they usually say exactly what's wrong.; Check browser console, network tab, terminal output
    2 hypothesize:
      description: Based on observations, rank the most likely causes.
      actions: What are the 2-3 most probable causes based on the error message?; Which hypothesis is easiest to test? Start there.; Consider: is this a code error, config error, environment error, or data error?; Consider: did this EVER work? If yes, what changed? If no, what's missing?
    3 investigate:
      description: Test your highest-probability hypothesis first.
      actions: Use view_file to see the actual code (don't rely on memory); Use run_command to check build/lint for syntax errors; Read the exact line the error points to + 10 lines above and below; Check imports — are they pointing to real files?; Check the data — is it the shape you expect? Add console.log to verify.; Check the network — is the API returning what you expect?
    4 root cause:
      description: Don't stop at the symptom. Trace to the SOURCE.
      example:
        symptom: Button doesn't submit the form
        surface cause: onClick handler isn't firing
        deeper: onClick is bound to the wrong function name
        root cause: The function was renamed during refactoring but the JSX wasn't updated
        real fix: Update the onClick to reference the correct function name
        band aid fix: Creating a new function that wraps the old one — DON'T do this
    5 minimal fix:
      description: Change the FEWEST lines that fully resolve the issue.
      rules: Use edit_file for targeted changes, not create_file for full rewrites; Don't fix things that aren't broken while you're in there; Don't refactor during a bugfix — that's a separate task; The fix should be obvious to a reader: 'ah, this was the problem'
    6 verify:
      description: Confirm the fix works for ALL cases, not just the reported one.
      actions: Trace the execution path with the fix applied; Check edge cases: what about empty data? null? very long strings?; Does the fix break anything else? Check nearby code.; Would this fix survive a page refresh? A different browser? Mobile?
    7 explain:
      description: Tell the user what happened so they can prevent it.
      template: The issue was [specific problem] in [specific file/line]. This happened because [root cause]. I fixed it by [specific change]. To prevent this in the future, [actionable advice].
error patterns:
  javascript runtime:
    cannot read property of undefined:
      error: TypeError: Cannot read properties of undefined (reading 'name')
      meaning: You're accessing .name on a variable that is undefined
      common causes: API response hasn't loaded yet (async timing issue); Object doesn't have the expected property; Array index out of bounds; Destructuring a value that doesn't exist; Wrong variable name or typo
      fix: Add optional chaining: user?.name, or add a null check: if (user) { ... }, or check the data source upstream
    not a function:
      error: TypeError: X is not a function
      meaning: You're calling something that exists but isn't a function
      common causes: Wrong import (imported a type instead of a function); Variable shadowed by a local declaration; Calling a property instead of a method (obj.name() vs obj.name); Module default export vs named export mismatch; Circular dependency causing undefined import
      fix: Check the import statement. console.log(typeof X) to see what it actually is. Check for name collisions.
    not defined:
      error: ReferenceError: X is not defined
      meaning: The variable doesn't exist in the current scope at all
      common causes: Typo in variable name; Variable declared in a different scope (inside an if/for block); Missing import statement; Script order issue (using before declaration without hoisting)
      fix: Check spelling. Check if the import exists. Check scope boundaries.
    maximum call stack:
      error: RangeError: Maximum call stack size exceeded
      meaning: Infinite recursion
      common causes: Function calls itself without a base case; Two components rendering each other; useEffect triggering its own dependency update; Circular data structure passed to JSON.stringify
      fix: Find the recursive call. Add a base case. For React, check useEffect dependencies.
  react specific:
    max update depth:
      error: Error: Maximum update depth exceeded
      meaning: setState is being called in a way that triggers infinite re-renders
      common causes: Setting state directly in the render body (not in useEffect or handler); useEffect dependency includes the state it sets; useEffect without dependency array calling setState; Object/array dependency that's recreated every render (reference equality)
      fix: Move setState into useEffect with correct deps. For objects, use useMemo or move outside component. For effects that set state, add proper dependencies.
    hydration mismatch:
      error: Hydration failed because the initial UI does not match what was rendered on the server
      meaning: Server-rendered HTML differs from client-rendered HTML
      common causes: Using browser APIs (window, document, localStorage) during render; Date/time rendering (server time ≠ client time); Math.random() or crypto.randomUUID() in render; Third-party scripts modifying DOM
      fix: Wrap client-only code in useEffect or use dynamic import with { ssr: false }. For dates, render a placeholder on server.
    invalid hook call:
      error: Invalid hook call. Hooks can only be called inside the body of a function component
      common causes: Calling hook inside a condition, loop, or nested function; Calling hook in a regular function, not a component; Multiple versions of React in the bundle; Missing 'use client' in Next.js app router
      fix: Move hook to top level of component. Check for duplicate React versions. Add 'use client' directive.
    missing key:
      error: Warning: Each child in a list should have a unique 'key' prop
      meaning: React needs keys to track list items for efficient updates
      fix: Add key prop using stable unique identifier: items.map(item => <div key={item.id}>). NEVER use array index as key if items can reorder.
    stale closure:
      symptom: State value is always the initial value inside a callback or effect
      meaning: The callback captured an old version of the state variable
      common causes: useEffect closure over stale state without including it in deps; setInterval callback referencing state without functional updater; Event handler defined with old state
      fix: Use functional updater: setState(prev => prev + 1). Add the state to useEffect deps. Use useRef for values that shouldn't trigger re-render.
  css visual:
    styles not applying:
      symptom: CSS rule exists but element doesn't reflect it
      common causes: Specificity: a more specific selector is overriding yours; Cascade: a later rule overwrites an earlier one; Typo in class name or selector; Element not matching (wrong nesting, missing parent class); !important somewhere else overriding; Scoped styles (CSS modules, Shadow DOM) blocking global styles
      fix: Inspect element in DevTools → Computed tab. See which rule wins. Increase specificity or reorder rules.
    layout broken:
      symptom: Elements overlapping, overflowing, or not positioned correctly
      common causes: Missing box-sizing: border-box (padding adds to width); Float without clearfix; Absolute positioned element without relative parent; Flexbox child not shrinking (needs min-width: 0); Grid item overflowing (needs minmax(0, 1fr)); Fixed width on a responsive container
      fix: Add *, *::before, *::after { box-sizing: border-box; } at top. Use flex/grid instead of floats. Check for fixed widths.
    mobile broken:
      symptom: Layout works on desktop but breaks on mobile
      common causes: Missing <meta name='viewport' content='width=device-width, initial-scale=1.0'>; Fixed pixel widths instead of percentages or fr units; Horizontal overflow from elements wider than viewport; Font too small (below 16px causes zoom on iOS); No media queries for smaller screens
      fix: Add viewport meta. Replace fixed widths with max-width + percentage. Add overflow-x: hidden to body as last resort (but fix the real overflow). Add media queries.
  api network:
    cors:
      error: Access to fetch at 'URL' from origin 'URL' has been blocked by CORS policy
      meaning: The server doesn't allow requests from your domain
      fix: Server must send Access-Control-Allow-Origin header. For development, use a proxy. NEVER disable CORS in production.
    404:
      error: GET /api/endpoint 404 Not Found
      common causes: Wrong URL path; API route not created/deployed; Missing trailing slash or extra slash; Case sensitivity in URL
      fix: Verify the exact URL. Check server routes. Check for typos.
    401 403:
      error: 401 Unauthorized or 403 Forbidden
      meaning: 401 = no auth token or invalid. 403 = valid token but insufficient permissions.
      fix: Check Authorization header is sent. Check token isn't expired. Check user has the required role.
    500:
      error: 500 Internal Server Error
      meaning: Server-side exception
      fix: Check server logs for the actual error. The client can't diagnose this — need server-side info.
    network error:
      error: TypeError: Failed to fetch
      common causes: Server is down; URL is wrong; CORS blocking; No internet connection; HTTPS mixed content (HTTP request from HTTPS page)
      fix: Check if the URL is reachable directly. Check browser network tab for the actual error.
  platform specific:
    creating file failed:
      symptom: Agent Activity shows 'Creating file ✕ Failed'
      root cause: Token limit caused the create_file tool call JSON to be truncated. The AI ran out of tokens while writing the file content, resulting in invalid JSON that couldn't be parsed.
      evidence: Look for: stopReason=max_tokens in server logs, or [Tool Parse Error] in logs
      fix: Reduce explanation text before the code. Strategy: 1 sentence intro → full code. Or split into smaller files. Or use code block fallback instead of create_file tool.
      prevention: System should use generate_code intent (16384 tokens) not style_question (1024 tokens) for building requests.
    preview blank:
      symptom: Preview panel shows 'Preview will appear here' even after code generates
      root cause: HTML detection failed — the file doesn't match any detection pattern
      evidence: Check: does the file have .html extension? Does content include <!DOCTYPE or <html? Is the code block tagged \`\`\`html:filename.html?
      fix: Ensure file starts with <!DOCTYPE html>. Ensure code block uses \`\`\`html:index.html format. The :filepath is required.
    preview shows old code:
      symptom: Preview doesn't update after edits
      root cause: The preview iframe caches the previous srcdoc. Or edit_file didn't trigger a new files_updated event.
      fix: Use create_file to overwrite the entire file. This triggers a new files_updated SSE event.
    tool shows failed but code exists:
      symptom: UI shows 'Failed' on tool call, but the code appears in the chat
      root cause: The tool_result SSE event had success:false, OR the event never arrived (stream ended before tool_result)
      fix: Check server logs for [Tool Result] line — did it show success=true or false? If false, check what execTool returned.
    agent loops forever:
      symptom: Agent Activity keeps adding tool calls without finishing
      root cause: The agent loop has max 6 iterations, but each iteration makes an API call. If the AI keeps calling tools without producing final text, it loops.
      fix: The stopReason check should break the loop. If it doesn't, the AI model might be confused about when to stop. Check the system prompt for conflicting instructions.
    intent misclassified:
      symptom: Request gets wrong model/tokens (e.g., build request gets 1024 tokens)
      root cause: Intent classifier regex matched the wrong pattern before the correct one. Order-dependent first-match-wins.
      evidence: Check server logs: intent=X — is X correct for the request?
      fix: Reorder classifyIntent patterns. generate_code must come before style_question. More specific patterns first.
      prevention: Agent mode safety floor: maxTokens never below 8192 when agent is enabled.
error recovery patterns:
  graceful degradation:
    principle: If feature X fails, the app should still work without X
    patterns: API fails → Show cached data or empty state with retry button; Image fails → Show placeholder or alt text; Font fails → System font fallback in font-family stack; Animation fails → Content still visible without animation; JavaScript fails → Core content accessible via HTML/CSS
  progressive enhancement:
    principle: Start with basic working version, enhance if capabilities exist
    patterns: Basic HTML form → Enhanced with JS validation → Enhanced with real-time API validation; Static list → Enhanced with search/filter → Enhanced with infinite scroll; @supports (backdrop-filter: blur(1px)) { /* glass effect */ } → Fallback: solid background
  retry strategies:
    immediate retry: For transient failures (network blip). Retry once immediately.
    exponential backoff: For rate limiting. Wait 1s, 2s, 4s, 8s between retries. Cap at 3-5 attempts.
    circuit breaker: After N consecutive failures, stop trying for M seconds. Prevents hammering a dead server.
  user communication:
    loading: Show spinner or skeleton. NEVER blank screen. User should always know something is happening.
    error: Show what went wrong (in human terms, not stack traces) + what they can do (retry, go back, contact support).
    empty: Show friendly message + call to action. 'No results found' → 'No results for X. Try a broader search or browse categories.'
    timeout: Show message after 5s of loading. 'This is taking longer than expected. Still working...' After 15s: 'Something might be wrong. Try refreshing.'

## REASONING PATTERNS

first principles:
  description: Break complex problems into fundamental truths, then build up from there.
  example:
    problem: User wants a real-time collaborative editor
    wrong approach: Let me install a library for that
    first principles:
      - What IS real-time collaboration? → Multiple clients seeing each other's changes with low latency
      - What does that require? → A server that broadcasts changes, a conflict resolution strategy, and a diff/patch mechanism
      - What's the simplest version? → WebSocket server that broadcasts text changes to all connected clients
      - What can go wrong? → Conflicts when two people edit the same section simultaneously
      - What's the industry solution? → Operational Transform (Google Docs) or CRDTs (Yjs, Automerge)
      - What's the pragmatic choice? → Use Yjs library for CRDT-based sync, it handles conflicts automatically
divide and conquer:
  description: Break large problems into small, independently solvable pieces.
  process: 1. What is the full scope of the task?; 2. What are the independent sub-tasks?; 3. What is the dependency order? (Which sub-tasks need others to be done first?); 4. What is the smallest useful unit I can build and verify?; 5. Build that unit, verify it works, then build the next.
  example:
    task: Build a dashboard with auth, data visualization, and settings
    breakdown: Step 1: Static HTML layout with placeholder data → verify it renders; Step 2: Add interactivity (charts, filters) with hardcoded data → verify interactions work; Step 3: Connect to API for real data → verify data flows correctly; Step 4: Add auth layer → verify protected routes work; Step 5: Add settings page → verify persistence
inversion:
  description: Instead of asking 'how do I make this work?', ask 'what would make this fail?'
  applications:
    question: How do I make a form that works well?
    inverted: What would make a form frustrating?
    answers: No validation feedback until submit; Clearing all fields on error; No loading state on submit; Tab order that jumps around; Submit button with no disabled state during loading
    solution: Avoid all of those: real-time validation, preserve input on error, loading spinner on submit, logical tab order, disabled button while submitting
    question: How do I make a fast website?
    inverted: What would make a website slow?
    answers: Loading 5MB of JavaScript upfront; Fetching data sequentially instead of parallel; Not caching anything; Rendering 10,000 DOM nodes at once; Synchronous layout recalculation in scroll handlers
    solution: Code split, parallel fetch, cache aggressively, virtualize long lists, debounce/throttle scroll handlers
steel thread:
  description: Build the thinnest possible end-to-end path first, then widen.
  principle: A system that works for one user with one feature is infinitely more valuable than a system with 50 features that doesn't work at all.
  process: 1. Identify the critical path: what's the minimum user flow?; 2. Build just that: UI → Action → API → DB → Response → Display; 3. Verify it works END TO END in the real environment; 4. Then add the next feature/improvement; 5. Verify again after each addition
  example:
    project: E-commerce checkout
    steel thread: Product list → Add to cart → Cart page → Checkout form → Payment → Success page
    NOT first: User accounts, wishlists, reviews, search, recommendations, admin panel
rubber duck debugging:
  description: Explain the problem out loud, step by step. The act of explanation often reveals the bug.
  process: 1. What is this code supposed to do?; 2. Walk through it line by line: 'First, we declare X. Then we call Y. Y returns Z.'; 3. At each step: 'Is this value what I expect? How do I know?'; 4. Where does reality diverge from expectation? THAT'S the bug.; 5. The 'think' tool serves this purpose in File Engine — use it.
occams razor:
  description: The simplest explanation is usually correct. Don't look for complex causes when a simple one fits.
  applications: Button doesn't work → Check: is the onClick handler spelled correctly? Before: is there a race condition in the event system?; API returns 404 → Check: is the URL right? Before: is the server routing broken?; CSS not applying → Check: is the class name spelled correctly? Before: is the CSS specificity algorithm broken?; State not updating → Check: are you mutating instead of creating new? Before: is React's reconciliation broken?
working backwards:
  description: Start from the desired end state and work backwards to figure out what needs to happen.
  example:
    goal: User sees their dashboard with personalized data
    backwards: For user to see data → Dashboard component must receive data as props/state; For component to have data → useEffect must fetch from API on mount; For API to return data → Backend route must query DB with user ID; For backend to know user → Auth token must be sent in request header; For token to exist → User must have logged in; For login to work → Auth system must be implemented
    build order: Auth → API route → Data fetch hook → Dashboard component → Styling
constraint analysis:
  description: Identify ALL constraints before designing a solution. Constraints are features, not bugs.
  categories:
    platform: File Engine: HTML via srcdoc, React via Babel standalone, token limit, no build step, CDN-only dependencies
    browser: No filesystem access, same-origin policy, limited localStorage (5MB), no native modules
    mobile: Small screen (375px), touch input (44px targets), slow network, limited memory
    accessibility: Screen readers, keyboard navigation, color blindness, motor impairment, cognitive load
    performance: Time to first byte, time to interactive, largest contentful paint, cumulative layout shift
    security: XSS prevention, CSRF protection, auth token handling, input sanitization
abstraction levels:
  description: Think at the right level of abstraction for the task at hand.
  levels:
    user story: As a user, I want to see my recent orders so I can track deliveries.
    feature: Order history page with list, filters, and status tracking.
    architecture: Client fetches from /api/orders, renders OrderList component, each OrderCard shows status.
    implementation: useQuery hook, OrderCard component with status badge, date formatting, pagination.
    code: The actual TypeScript/JSX/CSS that implements it.
  rule: Start at the highest level. Only drop down when you need to. Don't write code until the architecture is clear. Don't design architecture until the feature is understood. Don't define features until the user story is clear.
`

export function getFullKnowledgeBase(): string {
  return `\n<knowledge>\n${FULL_KNOWLEDGE_BASE}\n</knowledge>`
}
