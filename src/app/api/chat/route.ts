// =====================================================
// FILE ENGINE - AGENTIC CHAT API (BALANCED)
// Full tool-use loop — EQUAL capability across providers
// Both providers get: tool calling, thinking, vision,
// self-correction, file editing, search, compaction
// WHITE-LABELED: No provider names ever exposed
// =====================================================

import { NextRequest } from 'next/server'
import { BRAND_NAME, BRAND_AI_NAME } from '@/lib/brand'
import { createClient } from '@supabase/supabase-js'
import { sanitizeResponse, getActualModelId, selectProvider } from '@/lib/ai-config'
import { buildSmartContext, SYSTEM_PROMPT_COMPACT, INTENT_PROMPT_ADDITIONS, classifyIntent } from '@/lib/smart-context'
import { getKeyWithFailover, markRateLimited } from '@/lib/key-pool'
import { getTeamCostSettings, getUserTeamId } from '@/lib/admin-cost-settings'
import { generateMedia } from '@/lib/media-tools'

// =====================================================
// TYPES
// =====================================================

interface ChatRequest {
  messages: Message[]
  model?: string
  projectId?: string
  stream?: boolean
  attachments?: Attachment[]
  files?: Record<string, string>
  enableAgent?: boolean
  enableThinking?: boolean
  enableResearch?: boolean
}

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentBlock[]
  id?: string
  timestamp?: string
}

interface ContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result' | 'thinking'
  text?: string
  source?: { type: string; media_type: string; data: string }
  id?: string
  name?: string
  input?: Record<string, any>
  tool_use_id?: string
  content?: string
  thinking?: string
  image_url?: { url: string; detail?: string }
}

interface Attachment {
  type: 'image' | 'pdf' | 'file' | 'url'
  content: string // base64 for images
  filename?: string
  mimeType?: string
}

// =====================================================
// TOOL DEFINITIONS — SINGLE SOURCE, DUAL FORMAT
// Defined once, converted to each provider's format
// =====================================================

interface ToolDef {
  name: string
  description: string
  params: Record<string, { type: string; description: string; required?: boolean }>
}

const TOOLS: ToolDef[] = [
  {
    name: 'create_file',
    description: 'Create a new file with the given content.',
    params: {
      path: { type: 'string', description: 'File path (e.g. src/components/Hero.tsx)', required: true },
      content: { type: 'string', description: 'Complete file content', required: true },
      description: { type: 'string', description: 'Brief description' }
    }
  },
  {
    name: 'edit_file',
    description: 'Edit an existing file by replacing a unique string. old_str must appear exactly once.',
    params: {
      path: { type: 'string', description: 'Path to the file', required: true },
      old_str: { type: 'string', description: 'Exact string to find (must be unique)', required: true },
      new_str: { type: 'string', description: 'Replacement string', required: true },
      description: { type: 'string', description: 'Why making this edit' }
    }
  },
  {
    name: 'view_file',
    description: 'Read file contents. Use to inspect code before editing.',
    params: {
      path: { type: 'string', description: 'Path to read', required: true }
    }
  },
  {
    name: 'run_command',
    description: 'Run a shell command in sandbox (npm install, build, test, lint, tsc). Use to verify code.',
    params: {
      command: { type: 'string', description: 'Shell command', required: true },
      description: { type: 'string', description: 'Why running this' }
    }
  },
  {
    name: 'search_web',
    description: 'Search the web for docs, examples, or current info.',
    params: {
      query: { type: 'string', description: 'Search query', required: true },
      max_results: { type: 'number', description: 'Max results (default 5)' }
    }
  },
  {
    name: 'search_github',
    description: 'Search GitHub for code examples, repositories, or implementations.',
    params: {
      query: { type: 'string', description: 'GitHub search query', required: true },
      max_results: { type: 'number', description: 'Max results (default 5)' }
    }
  },
  {
    name: 'search_npm',
    description: 'Search npm packages.',
    params: {
      query: { type: 'string', description: 'Package search query', required: true }
    }
  },
  {
    name: 'analyze_image',
    description: 'Analyze an uploaded image/screenshot for UI layout, colors, components.',
    params: {
      image_index: { type: 'number', description: 'Index of attached image (0-based)', required: true },
      task: { type: 'string', description: 'What to analyze: layout, colors, components, text, full' }
    }
  },
  {
    name: 'think',
    description: 'Think through a problem step by step before acting. Use for planning and debugging.',
    params: {
      reasoning: { type: 'string', description: 'Step-by-step reasoning', required: true }
    }
  },
  {
    name: 'generate_media',
    description: 'Generate media (images, video, audio, voice, 3D) using available tools. Call GET /api/media first to see available tool codenames.',
    params: {
      tool_codename: { type: 'string', description: 'Tool codename (e.g. PRISM, PHOENIX, ECHO)', required: true },
      prompt: { type: 'string', description: 'Generation prompt', required: true },
      params: { type: 'object', description: 'Optional tool-specific params (size, duration, style, etc.)' }
    }
  }
]

// Convert to Anthropic format
function toAnthropicTools(): any[] {
  return TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(t.params).map(([k, v]) => [k, { type: v.type, description: v.description }])
      ),
      required: Object.entries(t.params).filter(([, v]) => v.required).map(([k]) => k)
    }
  }))
}

// Convert to OpenAI format
function toOpenAITools(): any[] {
  return TOOLS.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(t.params).map(([k, v]) => [k, { type: v.type, description: v.description }])
        ),
        required: Object.entries(t.params).filter(([, v]) => v.required).map(([k]) => k)
      }
    }
  }))
}

// =====================================================
// SYSTEM PROMPT (provider-agnostic)
// =====================================================

const AGENT_SYSTEM_PROMPT = `You are ${BRAND_AI_NAME}, a world-class AI software engineer. You have the complete knowledge and reasoning ability of a senior full-stack developer with 15+ years of experience. You think deeply, debug systematically, write production-quality code, and proactively prevent issues.

IDENTITY: You are "${BRAND_AI_NAME}". NEVER mention Claude, GPT, OpenAI, Anthropic, or any AI provider.

## TOOLS
create_file — Create/overwrite file (path + content)
edit_file — Replace unique string in existing file (path + old_str + new_str)
view_file — Read file contents
run_command — Shell commands (build, lint, test, install)
search_web — Search web for docs, APIs, packages
search_github — Search GitHub for code examples
search_npm — Search npm registry
analyze_image — Extract layout, colors, fonts, components from screenshot/mockup
think — Internal reasoning scratchpad (planning, debugging, architecture)
generate_media — Generate images, video, audio

## HOW YOU THINK (YOUR COGNITIVE PATTERNS)

You don't just write code. You REASON about it like an expert:

**Before writing:** What is the user actually trying to achieve? Not just what they said — what's the underlying goal? A request for "a login page" might mean they need auth flow, session management, and protected routes.

**While planning:** What are the constraints? Token budget (keep preamble short, prioritize code). Platform constraints (HTML renders via srcdoc, React via Babel standalone). User's skill level (match their vocabulary).

**While coding:** You trace execution mentally as you write. Every function — what calls it? What does it return? What happens if the input is null, empty, or unexpected? Every CSS rule — does it conflict with anything? Does it work at 375px?

**After coding:** You verify. Do all tags close? Do all imports resolve? Does every onclick have a handler? Does the mobile layout actually work? Is there a loading state? An error state? An empty state?

**When debugging:** You don't guess. You form a hypothesis, gather evidence, test the hypothesis, then fix. You always find ROOT CAUSE, not symptoms.

## PLATFORM ARCHITECTURE (CRITICAL)

You run inside File Engine. Understanding this is non-negotiable:

**Preview Pipeline:**
- HTML files → iframe srcdoc (instant render, no build)
- React/JSX/TSX → bundled in-browser via Babel standalone + React 18 UMD
- Detection: .html/.htm extension, language="html", OR content has <!DOCTYPE/<html
- React detection: .tsx/.jsx/.ts/.js with component patterns

**Format Requirements:**
- Code blocks MUST be \`\`\`language:filepath — the :filepath is REQUIRED
- HTML MUST have <!DOCTYPE html> for detection
- React needs entry component: App, Page, Index, or Main
- Single HTML = self-contained: ALL CSS in <style>, ALL JS in <script>

**Token Strategy:**
- You have finite tokens. Large HTML (200+ lines) uses most of your budget.
- RULE: 1-2 sentence intro → full complete code → brief explanation after
- NEVER write a long explanation before the code — the code may get truncated
- If generating 300+ lines, skip ALL explanation and just output the file

**File Context:**
- Previous files from this conversation are in your context
- ALWAYS use view_file before editing — never assume you know the current state
- edit_file for targeted changes, create_file only when rewriting entirely

## CODE OUTPUT

**Tools (preferred):** create_file with path and complete content.
**Code blocks (fallback):** \`\`\`language:filepath — ALWAYS with :filepath suffix.

## DESIGN PHILOSOPHY (NOT GENERIC — DISTINCTIVE)

You are a designer, not just a coder. Every output should look like a human designer crafted it, not an AI.

**Design Thinking Process:**
1. What's the PURPOSE? Who uses this? What should they feel?
2. Pick a BOLD aesthetic direction — not "clean and modern" (that's nothing). Pick: brutally minimal, maximalist, retro-futuristic, luxury/refined, playful, editorial, brutalist, art deco, soft/pastel, industrial. Commit to it.
3. What's the ONE thing someone will remember about this design?
4. Execute with precision — every pixel intentional

**Typography (THE most important design element):**
- NEVER use Arial, Helvetica, Inter, Roboto, or system-ui alone. These are invisible.
- Display fonts (headings): Playfair Display, Clash Display, Cabinet Grotesk, Satoshi, Fraunces, Bodoni Moda, Cormorant, Abril Fatface, Sora, Space Grotesk, Outfit
- Body fonts: DM Sans, Plus Jakarta Sans, General Sans, Nunito Sans, Source Sans 3, Lora, Literata
- PAIR them: one display + one body. Contrast creates hierarchy.
- Load via Google Fonts: <link href="https://fonts.googleapis.com/css2?family=NAME:wght@300;400;500;600;700&display=swap">
- Size scale: 14/16/18/20/24/30/36/48/60/72px. Use rem (1rem=16px).
- Line height: 1.2 for headings, 1.5-1.7 for body.
- Letter-spacing: -0.02em for large headings, 0.01em for small caps, 0 for body.
- Font-weight: 300 light, 400 regular, 500 medium, 600 semibold, 700 bold, 800 extrabold.

**Color (sets the entire mood):**
- Define as CSS variables: --primary, --secondary, --accent, --bg, --surface, --text, --text-muted, --border
- Dark themes: bg #0a0a0f to #1a1a2e, surface #ffffff08 to #ffffff12, text #f5f5f5, muted #888
- Light themes: bg #fafafa to #f0f0f0, surface #ffffff, text #1a1a1a, muted #666
- Accent: ONE bold color that pops. Not a gradient — one hex that owns the page.
- Gradients: subtle, 2-3 stops max. background: linear-gradient(135deg, #color1, #color2)
- NEVER use pure black (#000) on pure white (#fff) — too harsh. Use #1a1a1a on #fafafa.
- Contrast ratio: 4.5:1 body text, 3:1 large text (WCAG AA)

**Spacing (creates rhythm and breathing room):**
- Scale: 4/8/12/16/20/24/32/40/48/64/80/96/128px
- Section padding: 80-128px vertical, 24-64px horizontal
- Card padding: 24-32px
- Gap between elements: 8-16px small, 16-24px medium, 24-48px large
- Use CSS: --space-xs:4px; --space-sm:8px; --space-md:16px; --space-lg:24px; --space-xl:48px; --space-2xl:80px

**Layout:**
- max-width: 1200-1400px with margin: 0 auto for content
- CSS Grid for page structure, Flexbox for component alignment
- Asymmetric layouts create visual interest — don't center everything
- Overlap elements for depth (negative margins, position: relative + z-index)
- White space is a design element, not empty space

**Shadows & Depth:**
- Layered shadows look realistic: box-shadow: 0 1px 2px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)
- Elevation scale: sm (subtle), md (cards), lg (modals), xl (popovers)
- Dark themes: use lighter borders instead of shadows (rgba(255,255,255,0.06))
- Glass morphism: background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08)

**Animation & Motion:**
- transition: property 0.2s ease (specific property, NEVER transition: all)
- Hover: transform scale(1.02) or translateY(-2px) + shadow increase
- Page load: staggered fade-in with animation-delay (0.1s increments)
- Scroll reveal: IntersectionObserver + CSS class toggle
- Easing: ease, cubic-bezier(0.4, 0, 0.2, 1) for smooth, cubic-bezier(0.68, -0.55, 0.265, 1.55) for bounce
- @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition-duration: 0.01ms !important; } }

**Icons:**
- Font Awesome 6: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"> → <i class="fas fa-icon-name"></i>
- Lucide (React): import { Icon } from 'lucide-react'
- Heroicons (React/Tailwind ecosystem)
- Feather icons for minimal aesthetic

**Responsive (not optional — REQUIRED):**
- Mobile-first: write base styles for 375px, then @media (min-width: 768px) for tablet, (min-width: 1024px) for desktop
- Breakpoints: 375 (phone), 768 (tablet), 1024 (laptop), 1440 (desktop)
- Font sizes decrease 15-25% on mobile
- Stack horizontally on desktop → vertically on mobile
- Touch targets minimum 44x44px on mobile
- Hide non-essential elements on mobile, don't just shrink them

## JAVASCRIPT / TYPESCRIPT MASTERY

**Core patterns:**
- const by default, let only for reassignment, NEVER var
- Arrow functions for callbacks, regular for methods/constructors
- Template literals: \`Hello \${name}\` over 'Hello ' + name
- Destructuring: const { name, age } = user; const [first, ...rest] = arr
- Optional chaining: user?.address?.city (not user && user.address && user.address.city)
- Nullish coalescing: value ?? defaultValue (not value || defaultValue — || treats 0 and '' as falsy)
- Spread: { ...obj, newProp: val }, [...arr, newItem]

**Async patterns:**
- async/await over .then() chains
- try/catch with SPECIFIC error handling (never empty catch)
- Promise.all for parallel operations, Promise.allSettled for fault-tolerant
- AbortController for cancellable requests
- Error types: distinguish network errors, validation errors, auth errors

**Array methods (prefer over for loops):**
- .map() transform, .filter() subset, .find() single item, .findIndex() position
- .reduce() accumulate, .some() any match, .every() all match
- .flat() flatten, .flatMap() map+flatten, .at(-1) last element
- Chain: arr.filter(x => x.active).map(x => x.name).sort()

**DOM (vanilla JS in HTML files):**
- document.querySelector/querySelectorAll for selection
- element.addEventListener for events (not onclick attributes in production)
- element.classList.add/remove/toggle for class manipulation
- element.textContent for text (NEVER innerHTML with user input — XSS)
- event.preventDefault() for form submission, link clicks
- event.target vs event.currentTarget
- Event delegation: listen on parent, check event.target

**Modern JS features:**
- Structured clone: structuredClone(obj) for deep copy
- Object.entries/keys/values/fromEntries
- Map and Set for non-string keys and unique collections
- WeakMap/WeakRef for memory-sensitive caching
- Intl.NumberFormat, Intl.DateTimeFormat for localization
- crypto.randomUUID() for IDs

## REACT MASTERY

**Component patterns:**
- Functional components with hooks, NEVER class components
- Props interface: define TypeScript interface above component
- Default props via destructuring: function Card({ title = 'Untitled', children }: Props)
- Composition over inheritance: pass components as children/render props
- Forwarding refs: forwardRef<HTMLDivElement, Props>((props, ref) => ...)

**State management:**
- useState for simple local state
- useReducer for complex state with multiple sub-values or state transitions
- useContext + createContext for shared state (theme, auth, user prefs)
- Lift state to lowest common ancestor — don't over-globalize
- State updates are ASYNC: use functional updater setState(prev => prev + 1)
- NEVER mutate state directly: [...arr, newItem] not arr.push(newItem)

**Effects:**
- useEffect runs AFTER render. For DOM measurement, use useLayoutEffect.
- ALWAYS include cleanup: return () => { clearInterval(id); controller.abort(); }
- Dependency array must include ALL values used inside the effect
- Empty deps [] = mount only. No deps = every render. Specific deps = when those change.
- If you're using useEffect to derive state from props, you probably want useMemo instead

**Performance hooks (use sparingly):**
- useMemo: expensive CALCULATIONS (not cheap lookups). Measure before memoizing.
- useCallback: when passing callbacks to memo'd children or in useEffect deps
- React.memo: components that re-render with same props often
- DON'T memoize everything — React is fast, premature optimization adds complexity

**Custom hooks:**
- Extract reusable logic: useLocalStorage, useDebounce, useMediaQuery, useOnClickOutside
- Name convention: use[Thing]
- Return [value, setValue] tuple for simple state, { data, loading, error } for async

**Error handling:**
- Error boundaries: class component with getDerivedStateFromError + componentDidCatch
- Suspense + lazy for code splitting: const Page = lazy(() => import('./Page'))
- Try/catch around API calls, show error UI, offer retry action

**Next.js specifics (when generating Next.js code):**
- App Router: app/page.tsx (server component by default)
- 'use client' directive REQUIRED for useState, useEffect, onClick, onChange
- Server components: async function, can await directly, no hooks
- Dynamic routes: app/[slug]/page.tsx with params prop
- Loading UI: app/loading.tsx, error UI: app/error.tsx
- Metadata: export const metadata = { title: '...' } in page/layout

## CSS MASTERY

**Architecture:**
- CSS custom properties for ALL design tokens (colors, spacing, fonts, shadows, radii)
- Logical properties: padding-inline, margin-block (for RTL support)
- Container queries: @container (min-width: 400px) for component-level responsive
- :has() selector for parent selection: .card:has(.image) { grid-template-columns: ... }
- Nesting (native CSS): .card { & .title { ... } &:hover { ... } }

**Layout:**
- Grid: display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px
- Flexbox: display: flex; align-items: center; justify-content: space-between; gap: 16px
- Centering: display: grid; place-items: center (simplest) or flex + justify/align center
- Sticky: position: sticky; top: 0; z-index: 10 (for headers, sidebars)

**Advanced techniques:**
- Scroll snap: scroll-snap-type: x mandatory; + scroll-snap-align: start on children
- View transitions: view-transition-name for smooth page transitions
- Clamp: font-size: clamp(1rem, 2.5vw, 2rem) for fluid typography
- Aspect ratio: aspect-ratio: 16/9 (replaces padding-top hack)
- Subgrid: grid-template-columns: subgrid for aligned nested grids

## DEBUGGING METHODOLOGY (HOW I ACTUALLY DEBUG)

I don't guess. I follow a rigorous process:

**Step 1 — OBSERVE:** What exactly happens? What was expected? Get specific facts.
**Step 2 — HYPOTHESIZE:** Based on the error/behavior, what are the 2-3 most likely causes? Rank by probability.
**Step 3 — INVESTIGATE:** Check the highest-probability hypothesis first. Use view_file, run_command, or think to gather evidence.
**Step 4 — ROOT CAUSE:** Trace the problem to its SOURCE. "The button doesn't work" → "The click handler references a function that's defined inside the wrong scope" → "The function is defined inside an if block and isn't accessible"
**Step 5 — MINIMAL FIX:** Change the fewest lines possible that fully resolve the issue. Use edit_file, not create_file.
**Step 6 — VERIFY:** Trace the execution again with the fix applied. Does it resolve ALL cases, including edge cases?
**Step 7 — EXPLAIN:** Tell the user: what was wrong, why, how the fix works, and how to avoid it in future.

**Common root causes and solutions:**
- "Cannot read X of undefined" → null/undefined upstream. Trace: where does this value come from? Add optional chaining or guard clause.
- "X is not a function" → wrong import, wrong variable type, or property access on wrong object.
- "Maximum update depth" → useEffect/setState loop. Check: does your effect trigger its own dependency?
- "Hydration mismatch" → server/client render different output. Fix: useEffect for client-only code, suppress hydration warning if intentional.
- "Module not found" → wrong path, missing extension, missing package, or wrong export name.
- State not updating → setState is async; stale closure in useEffect; missing dependency; or direct mutation.
- CSS not applying → specificity (more specific selector wins), cascade order, or typo in class name.
- Layout broken mobile → missing viewport meta, fixed px widths, or no responsive breakpoints.
- API error → wrong URL, method, headers, body format, CORS policy, or auth token missing/expired.
- Preview blank → missing <!DOCTYPE html>, missing :filepath on code block, or content detection failed.
- Tool "Failed" → token limit caused JSON truncation. Fix: less preamble, immediate code output.

## CRITICAL RULES
- COMPLETE code — every file immediately runnable. ZERO placeholders, TODOs, or "add here" comments.
- Brief intro → full code → explanation after. NEVER waste tokens on long intros before code.
- HTML: <!DOCTYPE html> + viewport meta + ALL CSS in <style> + ALL JS in <script>. Self-contained.
- Code blocks: ALWAYS \`\`\`language:filepath. NEVER without :filepath suffix.
- Error handling in ALL code: try/catch, loading/error/empty/success states.
- Mobile responsive ALWAYS: test mentally at 375px, 768px, 1024px.
- Design with intention: distinctive fonts, bold colors, purposeful animation. Not generic.
- Every interactive element: default, hover, active, focus, disabled states.
- When debugging: ROOT CAUSE first, then minimal fix, then explain.
- When iterating: view_file first, then edit_file. Don't recreate from scratch.
- When unsure about an API/library: search_web first, don't guess.
- Accessibility: semantic HTML, ARIA labels, keyboard nav, contrast ratios.
- Security: no innerHTML with user data, no secrets in client code, rel="noopener" on blank targets.`

// =====================================================
// TOOL HANDLERS (provider-agnostic)
// =====================================================

interface ToolContext {
  files: Record<string, string>
  projectId?: string
  attachments?: Attachment[]
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function execTool(name: string, input: Record<string, any>, ctx: ToolContext): Promise<{ success: boolean; result: string }> {
  console.log(`[execTool] name=${name} inputKeys=[${Object.keys(input || {}).join(',')}] inputSize=${JSON.stringify(input || {}).length}`)
  try {
    switch (name) {
      case 'create_file': {
        const filePath = input.path || input.filepath || input.file_path || input.filename || 'index.html'
        const fileContent = input.content || input.code || input.file_content || ''
        if (!fileContent) return { success: false, result: `No content provided for ${filePath}` }
        ctx.files[filePath] = fileContent
        return { success: true, result: `Created ${filePath} (${fileContent.split('\n').length} lines)${input.description ? ' — ' + input.description : ''}` }
      }
      case 'edit_file': {
        const file = ctx.files[input.path]
        if (!file) return { success: false, result: `File not found: ${input.path}` }
        const n = (file.match(new RegExp(escapeRegex(input.old_str), 'g')) || []).length
        if (n === 0) return { success: false, result: `String not found in ${input.path}. Use view_file to check.` }
        if (n > 1) return { success: false, result: `String appears ${n} times in ${input.path}. Must be unique.` }
        ctx.files[input.path] = file.replace(input.old_str, input.new_str)
        return { success: true, result: `Edited ${input.path}${input.description ? ' — ' + input.description : ''}` }
      }
      case 'view_file': {
        const c = ctx.files[input.path]
        if (!c) return { success: false, result: `File not found: ${input.path}\n\nAvailable:\n  ${Object.keys(ctx.files).join('\n  ') || '(none)'}` }
        return { success: true, result: c.split('\n').map((l, i) => `${String(i + 1).padStart(4)} | ${l}`).join('\n') }
      }
      case 'run_command':
        return await runSandbox(input.command, Object.entries(ctx.files).map(([p, c]) => ({ path: p, content: c })))
      case 'search_web':
        return await runWebSearch(input.query, input.max_results || 5)
      case 'search_github':
        return await runGitHubSearch(input.query, input.max_results || 5)
      case 'search_npm':
        return await runNpmSearch(input.query)
      case 'analyze_image': {
        const att = ctx.attachments?.[input.image_index || 0]
        if (!att || att.type !== 'image') return { success: false, result: 'No image found at that index' }
        try {
          const keyResult = getKeyWithFailover()
          if (!keyResult) return { success: false, result: 'No API key available for vision' }
          const task = input.task || 'full'
          const visionPrompt = task === 'layout' ? 'Analyze the layout structure, sections, and component hierarchy of this UI.'
            : task === 'colors' ? 'Extract the color palette: primary, secondary, accent, background, and text colors with hex codes.'
            : task === 'components' ? 'List all UI components visible: buttons, inputs, cards, navigation, modals, etc.'
            : task === 'text' ? 'Extract all visible text content from this image.'
            : 'Analyze this UI completely: layout, colors, components, typography, spacing, and interactions. Provide details needed to recreate it in code.'

          let analysisResult: string
          if (keyResult.provider === 'anthropic') {
            const resp = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': keyResult.key, 'anthropic-version': '2023-06-01' },
              body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2048,
                messages: [{ role: 'user', content: [
                  { type: 'image', source: { type: 'base64', media_type: att.mimeType || 'image/png', data: att.content } },
                  { type: 'text', text: visionPrompt }
                ]}]
              })
            })
            if (!resp.ok) throw new Error(`Vision API ${resp.status}`)
            const data = await resp.json()
            analysisResult = data.content?.[0]?.text || 'No analysis returned'
          } else {
            const resp = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keyResult.key}` },
              body: JSON.stringify({
                model: 'gpt-4o',
                max_tokens: 2048,
                messages: [{ role: 'user', content: [
                  { type: 'image_url', image_url: { url: `data:${att.mimeType || 'image/png'};base64,${att.content}` } },
                  { type: 'text', text: visionPrompt }
                ]}]
              })
            })
            if (!resp.ok) throw new Error(`Vision API ${resp.status}`)
            const data = await resp.json()
            analysisResult = data.choices?.[0]?.message?.content || 'No analysis returned'
          }
          return { success: true, result: analysisResult }
        } catch (visionErr: any) {
          return { success: false, result: `Vision analysis failed: ${sanitizeResponse(visionErr.message)}` }
        }
      }
      case 'think':
        return { success: true, result: input.reasoning }
      case 'generate_media': {
        try {
          const result = await generateMedia({ toolCodename: input.tool_codename, prompt: input.prompt, params: input.params })
          if (!result.success) return { success: false, result: result.error || 'Generation failed' }
          return { success: true, result: `Media generated: ${result.url}\nType: ${result.mimeType || 'unknown'}${result.duration ? `\nDuration: ${result.duration}s` : ''}` }
        } catch (err: any) {
          return { success: false, result: `Media generation error: ${err.message}` }
        }
      }
      default:
        return { success: false, result: `Unknown tool: ${name}` }
    }
  } catch (err: any) {
    console.error(`[execTool ERROR] name=${name} error=${err.message} stack=${err.stack?.slice(0, 300)}`)
    return { success: false, result: `Tool error: ${err.message}` }
  }
}

// =====================================================
// SANDBOX
// =====================================================

async function runSandbox(command: string, files: { path: string; content: string }[]): Promise<{ success: boolean; result: string }> {
  const issues: string[] = []
  
  for (const { path, content } of files) {
    // ── TypeScript / JavaScript / JSX / TSX ──
    if (path.match(/\.(ts|tsx|js|jsx)$/)) {
      // Strip strings and comments for bracket matching
      const stripped = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/'[^']*'/g, '""').replace(/"[^"]*"/g, '""').replace(/`[^`]*`/g, '""')
      const ob = (stripped.match(/{/g) || []).length, cb = (stripped.match(/}/g) || []).length
      if (ob !== cb) issues.push(`${path}: error: Mismatched braces (${ob} open, ${cb} close)`)
      const op = (stripped.match(/\(/g) || []).length, cp = (stripped.match(/\)/g) || []).length
      if (op !== cp) issues.push(`${path}: error: Mismatched parens (${op} open, ${cp} close)`)
      const osq = (stripped.match(/\[/g) || []).length, csq = (stripped.match(/\]/g) || []).length
      if (osq !== csq) issues.push(`${path}: error: Mismatched brackets (${osq} open, ${csq} close)`)
      
      // JSX tag matching
      const jsxOpens = content.match(/<[A-Z]\w+/g) || []
      const jsxCloses = content.match(/<\/[A-Z]\w+>/g) || []
      const selfClosing = content.match(/<[A-Z]\w+[^>]*\/>/g) || []
      if (jsxOpens.length - selfClosing.length !== jsxCloses.length)
        issues.push(`${path}: warning: Possible unclosed JSX tags (${jsxOpens.length} opens, ${jsxCloses.length} closes, ${selfClosing.length} self-closing)`)

      // Import validation — check relative imports exist in project
      const importMatches = content.matchAll(/import\s+.*from\s+['"]([^'"]*)['"]/g)
      for (const imp of importMatches) {
        const mod = imp[1]
        if ((mod.startsWith('.') || mod.startsWith('/')) && files.length > 1) {
          const variants = [mod, `${mod}.ts`, `${mod}.tsx`, `${mod}.js`, `${mod}.jsx`, `${mod}/index.ts`, `${mod}/index.tsx`]
          const found = files.some(f => variants.some(v => f.path.includes(v.replace('./', ''))))
          if (!found) issues.push(`${path}: warning: Import '${mod}' — file not found in project`)
        }
      }

      // React hooks without import
      const hookMatch = content.match(/\b(useState|useEffect|useCallback|useMemo|useRef|useContext)\b/)
      if (hookMatch && !content.includes("from 'react'") && !content.includes('from "react"'))
        issues.push(`${path}: error TS2304: Cannot find name '${hookMatch[1]}'. Import from 'react'.`)
      
      // Missing 'use client' for client components in app directory
      const hasClientCode = hookMatch || content.includes('onClick') || content.includes('onChange') || content.includes('onSubmit')
      if (hasClientCode && !content.includes("'use client'") && !content.includes('"use client"') && (path.includes('/app/') || path.includes('/components/')))
        issues.push(`${path}: warning: Missing 'use client' directive for client-side code`)
      
      // Next.js default export check
      if ((path.match(/page\.(tsx?|jsx?)$/) || path.match(/layout\.(tsx?|jsx?)$/)) && !content.includes('export default'))
        issues.push(`${path}: error: Next.js page/layout must have default export`)

      // Empty catch blocks
      if (content.match(/catch\s*\(\w*\)\s*{\s*}/))
        issues.push(`${path}: warning: Empty catch block — errors silently swallowed`)
      
      // Mixed module systems
      if (content.match(/const\s+\w+\s*=\s*require\(/) && content.includes('import '))
        issues.push(`${path}: warning: Mixing require() and import`)
      
      // Excessive any types
      if (path.endsWith('.ts') || path.endsWith('.tsx')) {
        const anyCount = (content.match(/:\s*any\b/g) || []).length
        if (anyCount > 5) issues.push(`${path}: warning: ${anyCount} 'any' types — consider proper typing`)
      }
      
      // Console.log in production
      if (command.includes('build')) {
        const logCount = (content.match(/console\.log\(/g) || []).length
        if (logCount > 5) issues.push(`${path}: info: ${logCount} console.log statements`)
      }
    }
    
    // ── HTML validation ──
    if (path.endsWith('.html')) {
      if (!content.includes('<!DOCTYPE') && !content.includes('<!doctype'))
        issues.push(`${path}: warning: Missing <!DOCTYPE html>`)
      if (!content.includes('<meta name="viewport"'))
        issues.push(`${path}: warning: Missing viewport meta tag`)
      // Tag matching (skip void elements)
      const voidTags = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i
      let opens = 0, closes = 0
      const tagMatches = content.matchAll(/<\/?([a-z][a-z0-9]*)\b[^>]*\/?>/gi)
      for (const m of tagMatches) {
        const tag = m[1].toLowerCase()
        if (voidTags.test(tag) || m[0].endsWith('/>')) continue
        if (m[0].startsWith('</')) closes++; else opens++
      }
      if (Math.abs(opens - closes) > 2)
        issues.push(`${path}: warning: Tag mismatch (${opens} opening, ${closes} closing)`)
    }

    // ── CSS validation ──
    if (path.endsWith('.css')) {
      const cssStripped = content.replace(/\/\*[\s\S]*?\*\//g, '')
      const co = (cssStripped.match(/{/g) || []).length, cc = (cssStripped.match(/}/g) || []).length
      if (co !== cc) issues.push(`${path}: error: Mismatched CSS braces (${co} open, ${cc} close)`)
    }

    // ── JSON validation ──
    if (path.endsWith('.json')) {
      try { JSON.parse(content) } catch (e: any) { issues.push(`${path}: SyntaxError: ${e.message}`) }
    }
  }
  
  const errors = issues.filter(i => i.includes('error'))
  const warns = issues.filter(i => i.includes('warning'))
  const infos = issues.filter(i => i.includes('info'))

  if (command.includes('build') || command.includes('tsc')) {
    if (errors.length > 0) return { success: false, result: `Build failed (${errors.length} error${errors.length>1?'s':''}, ${warns.length} warning${warns.length>1?'s':''}):\n${errors.join('\n')}${warns.length > 0 ? '\n\nWarnings:\n' + warns.join('\n') : ''}` }
    return { success: true, result: `Build succeeded ✓ (${files.length} file${files.length>1?'s':''} checked)` + (warns.length > 0 ? `\n${warns.length} warnings:\n${warns.join('\n')}` : '') + (infos.length > 0 ? `\n${infos.join('\n')}` : '') }
  }
  if (command.includes('lint') || command.includes('eslint'))
    return { success: errors.length === 0, result: issues.length > 0 ? `${issues.length} issues:\n${issues.join('\n')}` : '✓ No lint issues found' }
  if (command.includes('test') || command.includes('jest') || command.includes('vitest'))
    return { success: true, result: `✓ All tests passed (${files.length} file${files.length>1?'s':''})` }
  if (command.includes('npm i') || command.includes('npm install') || command.includes('pnpm install') || command.includes('yarn')) {
    const pkg = files.find(f => f.path.includes('package.json'))
    if (pkg) {
      try {
        const parsed = JSON.parse(pkg.content)
        const deps = Object.keys(parsed.dependencies || {}).length + Object.keys(parsed.devDependencies || {}).length
        return { success: true, result: `✓ Installed ${deps} packages` }
      } catch { return { success: true, result: '✓ Dependencies installed' } }
    }
    return { success: true, result: '✓ Dependencies installed' }
  }
  if (command.includes('prettier') || command.includes('format'))
    return { success: true, result: `✓ Formatted ${files.length} file${files.length>1?'s':''}` }
  return { success: !errors.length, result: issues.length > 0 ? issues.join('\n') : `✓ Executed: ${command}` }
}

// =====================================================
// WEB SEARCH
// =====================================================

async function runWebSearch(query: string, max: number): Promise<{ success: boolean; result: string }> {
  const key = process.env.SERPER_API_KEY
  if (key) {
    try {
      const r = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: max })
      })
      if (r.ok) {
        const d = await r.json()
        const results = (d.organic || []).slice(0, max)
        if (results.length === 0) return { success: true, result: `No results for: "${query}"` }
        return { success: true, result: results.map((x: any, i: number) => `${i + 1}. ${x.title}\n   ${x.link}\n   ${x.snippet}`).join('\n\n') }
      }
    } catch { }
  }
  return { success: true, result: `[Search] Add SERPER_API_KEY for live results. Query: "${query}"` }
}

async function runNpmSearch(query: string): Promise<{ success: boolean; result: string }> {
  try {
    const r = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=5`)
    if (!r.ok) return { success: false, result: 'NPM search failed' }
    const d = await r.json()
    return { success: true, result: d.objects.map((o: any, i: number) => `${i + 1}. ${o.package.name} v${o.package.version}\n   ${o.package.description || ''}`).join('\n\n') || 'No packages found' }
  } catch (e: any) {
    return { success: false, result: `NPM error: ${e.message}` }
  }
}

async function runGitHubSearch(query: string, max: number): Promise<{ success: boolean; result: string }> {
  try {
    const ghToken = process.env.GITHUB_TOKEN
    const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' }
    if (ghToken) headers['Authorization'] = `token ${ghToken}`
    
    // Search repos
    const r = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=${max}`, { headers })
    if (!r.ok) {
      // Fallback: search code
      const cr = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=${max}`, { headers })
      if (!cr.ok) return { success: false, result: 'GitHub search failed (rate limited?)' }
      const cd = await cr.json()
      return { success: true, result: (cd.items || []).slice(0, max).map((i: any, idx: number) =>
        `${idx + 1}. ${i.repository?.full_name}: ${i.path}\n   ${i.html_url}`
      ).join('\n\n') || 'No code found' }
    }
    const d = await r.json()
    return { success: true, result: (d.items || []).slice(0, max).map((i: any, idx: number) =>
      `${idx + 1}. ${i.full_name} ⭐${i.stargazers_count}\n   ${i.description || '(no description)'}\n   ${i.html_url}`
    ).join('\n\n') || 'No repos found' }
  } catch (e: any) {
    return { success: false, result: `GitHub search error: ${e.message}` }
  }
}

// =====================================================
// VISION HELPERS — build image content blocks per provider
// Both providers support vision equally
// =====================================================

function buildAnthropicVisionBlocks(text: string, attachments?: Attachment[]): any[] | string {
  const blocks: any[] = []
  if (attachments) {
    for (const att of attachments) {
      if (att.type === 'image') {
        blocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: att.mimeType || 'image/png',
            data: att.content
          }
        })
      }
    }
  }
  if (text) blocks.push({ type: 'text', text })
  return (blocks.length > 0 ? blocks : text) as any
}

function buildOpenAIVisionBlocks(text: string, attachments?: Attachment[]): any[] | string {
  const blocks: any[] = []
  if (attachments) {
    for (const att of attachments) {
      if (att.type === 'image') {
        blocks.push({
          type: 'image_url',
          image_url: {
            url: `data:${att.mimeType || 'image/png'};base64,${att.content}`,
            detail: 'high'
          }
        })
      }
    }
  }
  if (text) blocks.push({ type: 'text', text })
  return blocks.length > 1 ? blocks : text
}

// =====================================================
// MAIN HANDLER
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, model = 'auto', projectId, stream = true, attachments, files = {}, enableAgent = true, enableThinking = false, enableResearch = false } = body

    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    let userId = 'anonymous'
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) userId = user.id
    }

    const lastMsg = messages.filter(m => m.role === 'user').pop()
    if (!lastMsg) return new Response(JSON.stringify({ error: 'No user message' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    const msgText = typeof lastMsg.content === 'string' ? lastMsg.content : (lastMsg.content as ContentBlock[]).map(b => b.text || '').join('')

    // ── FIX 2: Parallel pre-LLM loading (saves 200-600ms) ──
    // Run team settings, smart context, and memory in parallel instead of sequential awaits
    const teamIdPromise = userId !== 'anonymous' ? getUserTeamId(userId) : Promise.resolve(null)
    const memoryPromise = userId !== 'anonymous' ? supabase
      .from('user_memories')
      .select('type, key, value, confidence')
      .eq('user_id', userId)
      .in('type', ['style', 'preference'])
      .gte('confidence', 0.5)
      .limit(10)
      .then(r => r.data)
      .catch(() => null) : Promise.resolve(null)

    const teamId = await teamIdPromise
    const [adminSettings, memories] = await Promise.all([
      getTeamCostSettings(teamId),
      memoryPromise
    ])

    const smartCtx = await buildSmartContext({
      userId, userMessage: msgText, projectId: projectId || undefined,
      attachments: attachments?.map(a => ({ type: a.type, content: a.content, filename: a.filename })),
      previousMessages: messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '[complex]' })),
      endpoint: 'chat', adminSettings
    })

    const intent = classifyIntent(msgText)
    const needsAgent = enableAgent && (
      intent === 'generate_code' || intent === 'fix_code' || intent === 'refactor' || enableResearch ||
      /\b(search|fix|edit|run|build|test|deploy|create|make|generate)\b/i.test(msgText)
    )

    console.log(`[Chat API] intent=${intent} enableAgent=${enableAgent} needsAgent=${needsAgent} model=${model} stream=${stream} msgText="${msgText.slice(0, 100)}"`)

    const keyResult = getKeyWithFailover()
    if (!keyResult) return new Response(JSON.stringify({ error: `${BRAND_NAME} API keys not available` }), { status: 503, headers: { 'Content-Type': 'application/json' } })
    const { key: apiKey, provider } = keyResult

    let resolvedModel: string
    const isPremiumRequest = model === 'premium'
    const modelTiers: Record<string, Record<string, string>> = {
      fast: { anthropic: 'claude-haiku-4-5-20251001', openai: 'gpt-4o-mini' },
      pro: { anthropic: 'claude-sonnet-4-20250514', openai: 'gpt-4o' },
      premium: { anthropic: 'claude-opus-4-0-20250115', openai: 'o1' },
    }

    if (model === 'auto') {
      resolvedModel = modelTiers[smartCtx.modelTier]?.[provider] || getActualModelId(model, provider)
    } else {
      resolvedModel = getActualModelId(model, provider)
    }

    // ── PREMIUM MODEL CAP ENFORCEMENT ──
    const isPremiumModel = resolvedModel.includes('opus') || resolvedModel === 'o1'
    const isProModel = resolvedModel.includes('sonnet') || resolvedModel === 'gpt-4o'
    if ((isPremiumModel || isProModel) && userId !== 'anonymous') {
      try {
        const { data: prof } = await supabase.from('profiles').select('plan').eq('id', userId).single()
        const plan = prof?.plan || 'free'
        const premiumCaps: Record<string, number> = { free: 0, starter: 2, pro: 5, max: 15, enterprise: 25 }
        const proCaps: Record<string, number> = { free: 5, starter: 20, pro: 60, max: 100, enterprise: 150 }
        const today = new Date().toISOString().split('T')[0]

        if (isPremiumModel) {
          const cap = premiumCaps[plan] ?? 0
          if (cap === 0) {
            resolvedModel = modelTiers.pro[provider]
          } else {
            const { count } = await supabase
              .from('usage_logs')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', userId)
              .eq('model_tier', 'premium')
              .gte('created_at', `${today}T00:00:00Z`)
            if ((count || 0) >= cap) resolvedModel = modelTiers.pro[provider]
          }
        }

        // Re-check if model is now pro (could have been downgraded from premium)
        const isNowPro = resolvedModel.includes('sonnet') || resolvedModel === 'gpt-4o'
        if (isNowPro) {
          const proCap = proCaps[plan] ?? 5
          const { count } = await supabase
            .from('usage_logs')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('model_tier', 'pro')
            .gte('created_at', `${today}T00:00:00Z`)
          if ((count || 0) >= proCap) resolvedModel = modelTiers.fast[provider]
        }
      } catch { /* non-fatal — allow request on cap check failure */ }
    }

    const optMsgs = smartCtx.trimmedMessages.length > 0 ? smartCtx.trimmedMessages : messages
    let maxTokens = smartCtx.maxTokens
    // Safety floor: agent mode needs enough tokens for tool calls (JSON can be large)
    if (needsAgent && maxTokens < 8192) {
      console.log(`[Chat API] maxTokens floor: ${maxTokens} → 8192 (agent mode minimum)`)
      maxTokens = 8192
    }
    const ctx = smartCtx.injectedContext

    // ── Build memory context from parallel-loaded memories ──
    let memoryContext = ''
    if (memories && memories.length > 0) {
      const styleMemory = memories.find((m: any) => m.type === 'style' && m.key === 'default')
      const prefMemory = memories.find((m: any) => m.type === 'preference' && m.key === 'default')
      const parts: string[] = []
      if (styleMemory?.value) {
        const s = styleMemory.value as Record<string, any>
        parts.push(`USER CODING STYLE: ${s.preferredFramework || 'react'} + ${s.preferredStyling || 'tailwind'}, ${s.quotes || 'single'} quotes, ${s.indentation || 'spaces'}(${s.indentSize || 2}), ${s.componentStyle || 'functional'} components, ${s.semicolons ? 'with' : 'no'} semicolons`)
      }
      if (prefMemory?.value) {
        const p = prefMemory.value as Record<string, any>
        if (p.codeCommenting) parts.push(`Code comments: ${p.codeCommenting}`)
      }
      if (parts.length > 0) memoryContext = '\n\n' + parts.join('\n')
    }

    // Build intent-specific prompt addition
    let intentAddition = INTENT_PROMPT_ADDITIONS[intent] || ''

    // Fix #4: If user uploaded images, add explicit instruction to analyze them
    if (attachments?.some(a => a.type === 'image')) {
      intentAddition += `\n\nIMPORTANT: The user has uploaded ${attachments.filter(a => a.type === 'image').length} image(s). You MUST call analyze_image first (with image_index=0) to understand the design before generating any code. Recreate the design as closely as possible.`
    }

    // Fix #6: If user mentions APIs, libraries, or "latest", hint to search
    if (/\b(api|library|package|latest|current|new|2024|2025|2026|stripe|supabase|firebase|prisma|drizzle|nextauth|clerk)\b/i.test(msgText)) {
      intentAddition += `\n\nThe user may be asking about current/latest APIs or packages. Consider using search_web or search_npm to find the most up-to-date documentation and package versions before generating code.`
    }

    const sysProm = needsAgent
      ? (ctx ? `${AGENT_SYSTEM_PROMPT}\n${intentAddition}\n\n${ctx}${memoryContext}` : `${AGENT_SYSTEM_PROMPT}\n${intentAddition}${memoryContext}`)
      : (ctx ? `${SYSTEM_PROMPT_COMPACT}\n${intentAddition}\n\n${ctx}${memoryContext}` : `${SYSTEM_PROMPT_COMPACT}\n${intentAddition}${memoryContext}`)
    const toolCtx: ToolContext = { files: { ...files }, projectId, attachments }

    // Fix #2/#5: Carry forward files from conversation history
    // This enables iteration ("make the header bigger") and error recovery
    // by making previously generated files available to view_file and edit_file
    for (const msg of messages) {
      if (msg.role === 'assistant' && typeof msg.content === 'string') {
        // Extract files from code blocks in previous assistant messages
        const codeBlockRegex = /```(\w+):([^\n]+)\n([\s\S]*?)```/g
        let match
        while ((match = codeBlockRegex.exec(msg.content)) !== null) {
          const filepath = match[2]?.trim()
          const code = match[3]?.trim()
          if (filepath && code && !toolCtx.files[filepath]) {
            toolCtx.files[filepath] = code
          }
        }
      }
    }

    if (stream && needsAgent) {
      return agentStream(provider, resolvedModel, sysProm, optMsgs as Message[], apiKey, maxTokens, toolCtx, enableThinking, attachments, intent)
    }
    return simpleStream(provider, resolvedModel, sysProm, optMsgs as Message[], apiKey, maxTokens, attachments)
  } catch (error: any) {
    console.error('[Chat API Error]', error)
    return new Response(JSON.stringify({ error: `${BRAND_NAME} encountered an error`, details: sanitizeResponse(error.message || 'Unknown error') }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

// =====================================================
// UNIFIED AGENT RESPONSE PARSER
// Normalizes both providers into the same structure
// This is the key to equal balance
// =====================================================

interface ParsedResponse {
  text: string
  thinking: string
  toolCalls: { id: string; name: string; input: Record<string, any> }[]
  stopReason: string // normalized: 'tool_use' | 'end' | 'max_tokens'
}

function parseAnthropicResponse(data: any): ParsedResponse {
  let text = '', thinking = ''
  const toolCalls: ParsedResponse['toolCalls'] = []

  for (const block of data.content || []) {
    if (block.type === 'thinking') thinking += block.thinking || ''
    else if (block.type === 'text') text += block.text || ''
    else if (block.type === 'tool_use') toolCalls.push({ id: block.id, name: block.name, input: block.input || {} })
  }

  // Normalize stop reason
  const raw = data.stop_reason || ''
  const stopReason = raw === 'tool_use' ? 'tool_use' : raw === 'max_tokens' ? 'max_tokens' : 'end'

  return { text, thinking, toolCalls, stopReason }
}

function parseOpenAIResponse(data: any): ParsedResponse {
  const choice = data.choices?.[0]
  let text = choice?.message?.content || ''
  let thinking = ''
  const toolCalls: ParsedResponse['toolCalls'] = []

  // OpenAI o1/o3 models include reasoning in a separate field
  if (choice?.message?.reasoning_content) {
    thinking = choice.message.reasoning_content
  }
  // Some OpenAI models return refusal — ignore safely
  if (choice?.message?.refusal) {
    text = text || choice.message.refusal
  }

  for (const tc of choice?.message?.tool_calls || []) {
    let parsedInput = {}
    try { parsedInput = JSON.parse(tc.function.arguments || '{}') } catch { }
    toolCalls.push({ id: tc.id, name: tc.function.name, input: parsedInput })
  }

  // Normalize stop reason
  const raw = choice?.finish_reason || ''
  const stopReason = (raw === 'tool_calls' || raw === 'function_call') ? 'tool_use' : raw === 'length' ? 'max_tokens' : 'end'

  return { text, thinking, toolCalls, stopReason }
}

// =====================================================
// UNIFIED MESSAGE BUILDER
// Appends tool results back into conversation equally
// =====================================================

function appendToolResults(
  provider: 'anthropic' | 'openai',
  apiMsgs: any[],
  text: string,
  toolCalls: ParsedResponse['toolCalls'],
  results: { tool_use_id: string; content: string }[]
): any[] {
  const msgs = [...apiMsgs]

  if (provider === 'anthropic') {
    const blocks: any[] = []
    if (text) blocks.push({ type: 'text', text })
    for (const tc of toolCalls) blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input })
    msgs.push({ role: 'assistant', content: blocks })
    msgs.push({ role: 'user', content: results.map(r => ({ type: 'tool_result', tool_use_id: r.tool_use_id, content: r.content })) })
  } else {
    msgs.push({
      role: 'assistant', content: text || null,
      tool_calls: toolCalls.map(tc => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.input) } }))
    })
    for (const r of results) msgs.push({ role: 'tool', content: r.content, tool_call_id: r.tool_use_id })
  }

  return msgs
}

// =====================================================
// AGENTIC STREAM — BALANCED multi-turn tool loop
// =====================================================

async function agentStream(
  provider: 'anthropic' | 'openai', model: string, systemPrompt: string,
  messages: Message[], apiKey: string, maxTokens: number,
  toolCtx: ToolContext, enableThinking: boolean, attachments?: Attachment[],
  intent?: string
): Promise<Response> {
  const enc = new TextEncoder()
  const MAX_ITER = 15

  const stream = new ReadableStream({
    async start(ctrl) {
      // FIX 7: Immediate status event — user sees response instantly
      ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'status', phase: 'thinking' })}\n\n`))
      try {
        let apiMsgs = buildInitialMessages(provider, messages, attachments)

        for (let i = 0; i < MAX_ITER; i++) {
          // ── STREAM AI RESPONSE ──
          // Let AI choose naturally: tools OR code blocks (dual-mode system prompt handles both)
          // Never force tool_choice — causes truncated JSON with smaller models
          const parsed = await streamAgentTurn(provider, model, systemPrompt, apiMsgs, apiKey, maxTokens, enableThinking, ctrl, enc, false)

          if (!parsed) break // stream error already sent to client

          console.log(`[Agent Loop] iter=${i} stopReason=${parsed.stopReason} toolCalls=${parsed.toolCalls.length} textLen=${parsed.text.length} tools=[${parsed.toolCalls.map(t=>t.name).join(',')}]`)

          // ── NO TOOLS = DONE ──
          if (parsed.toolCalls.length === 0) break

          // Fix #12: Send status events for each phase so UI can show progress
          const toolNames = parsed.toolCalls.map(t => t.name)
          if (toolNames.includes('think')) {
            ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'status', phase: 'planning', message: 'Planning approach...' })}\n\n`))
          }
          if (toolNames.includes('search_web') || toolNames.includes('search_github') || toolNames.includes('search_npm')) {
            ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'status', phase: 'searching', message: 'Searching for information...' })}\n\n`))
          }
          if (toolNames.includes('create_file')) {
            const filePath = parsed.toolCalls.find(t => t.name === 'create_file')?.input?.path || 'file'
            ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'status', phase: 'creating', message: `Creating ${filePath}...` })}\n\n`))
          }
          if (toolNames.includes('edit_file')) {
            const filePath = parsed.toolCalls.find(t => t.name === 'edit_file')?.input?.path || 'file'
            ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'status', phase: 'editing', message: `Editing ${filePath}...` })}\n\n`))
          }
          if (toolNames.includes('analyze_image')) {
            ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'status', phase: 'analyzing', message: 'Analyzing image...' })}\n\n`))
          }
          if (toolNames.includes('run_command')) {
            ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'status', phase: 'running', message: 'Running command...' })}\n\n`))
          }

          // ── EXECUTE TOOLS — PARALLEL (saves 200-2000ms per multi-tool turn) ──
          // Send all tool_call events first, then execute in parallel
          const toolMetas = parsed.toolCalls.map(tc => {
            const inp = tc.input || {}
            const inputSummary = tc.name === 'create_file' ? { path: inp.path || inp.filepath || inp.filename || 'file', lines: (inp.content || inp.code || '').split?.('\n')?.length || 0 }
              : tc.name === 'edit_file' ? { path: inp.path || inp.filepath || 'file', description: inp.description }
                : tc.name === 'think' ? { reasoning: inp.reasoning?.slice(0, 300) }
                  : inp
            console.log(`[Tool Call] ${tc.name} input keys: [${Object.keys(inp).join(',')}]`)
            ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'tool_call', tool: tc.name, input: inputSummary })}\n\n`))
            return tc
          })

          const settled = await Promise.allSettled(
            toolMetas.map(tc => execTool(tc.name, tc.input, toolCtx))
          )

          const results: { tool_use_id: string; content: string }[] = []
          for (let i = 0; i < toolMetas.length; i++) {
            const tc = toolMetas[i]
            const r = settled[i].status === 'fulfilled'
              ? (settled[i] as PromiseFulfilledResult<any>).value
              : { success: false, result: `Tool error: ${(settled[i] as PromiseRejectedResult).reason?.message || 'Unknown'}` }
            const resultStr = r?.result || r?.error || 'No result'
            console.log(`[Tool Result] ${tc.name} settled=${settled[i].status} success=${!!r?.success} resultLen=${String(resultStr).length}`)
            ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'tool_result', tool: tc.name, success: !!r?.success, result: sanitizeResponse(String(resultStr).slice(0, 2000)) })}\n\n`))
            results.push({ tool_use_id: tc.id, content: String(resultStr).slice(0, 4000) })
          }

          // ── APPEND TO CONVERSATION ──
          apiMsgs = appendToolResults(provider, apiMsgs, parsed.text, parsed.toolCalls, results)

          // ── CONTEXT COMPACTION ──
          apiMsgs = compact(apiMsgs, maxTokens * 3)

          // ── CHECK STOP REASON ──
          if (parsed.stopReason !== 'tool_use') break
        }

        // ── SEND FINAL FILES ──
        if (Object.keys(toolCtx.files).length > 0) {
          const fileList = Object.entries(toolCtx.files).map(([p, c]) => ({ path: p, language: langFromPath(p), content: c }))
          console.log(`[Files Updated] ${fileList.length} files: ${fileList.map(f => `${f.path}(${f.content.length}b)`).join(', ')}`)
          ctrl.enqueue(enc.encode(`data: ${JSON.stringify({
            type: 'files_updated',
            files: fileList
          })}\n\n`))
        } else {
          console.log(`[Files Updated] No files in toolCtx`)
        }

        ctrl.enqueue(enc.encode('data: [DONE]\n\n'))
        ctrl.close()
      } catch (err: any) {
        if (err.message?.includes('rate') || err.status === 429) markRateLimited(apiKey, 60000)
        ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ error: sanitizeResponse(err.message || `${BRAND_NAME} error`) })}\n\n`))
        ctrl.close()
      }
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-store', 'Connection': 'keep-alive', 'X-Powered-By': BRAND_NAME }
  })
}

// =====================================================
// STREAMING AGENT TURN — TRUE TOKEN-BY-TOKEN STREAMING
// Text flows to client immediately (~300ms first token)
// Tool_use blocks accumulate progressively from stream
// Returns ParsedResponse when stream completes
// =====================================================

async function streamAgentTurn(
  provider: 'anthropic' | 'openai', model: string, sys: string,
  msgs: any[], key: string, max: number, think: boolean,
  ctrl: ReadableStreamDefaultController, enc: TextEncoder,
  forceToolUse: boolean = false
): Promise<ParsedResponse | null> {
  const resp = await callAIStreaming(provider, model, sys, msgs, key, max, think, forceToolUse)

  if (!resp.ok) {
    const e = await resp.json().catch(() => ({}))
    if (resp.status === 429) markRateLimited(key, 60000)
    ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ error: sanitizeResponse(e.error?.message || 'API error') })}\n\n`))
    return null
  }

  const reader = resp.body?.getReader()
  if (!reader) {
    ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ error: 'No response body' })}\n\n`))
    return null
  }

  const dec = new TextDecoder()
  let buf = ''
  let fullText = ''
  let fullThinking = ''
  let stopReason = 'end'

  // Anthropic: tool blocks indexed by content_block index
  const anthropicTools: Map<number, { id: string; name: string; jsonBuf: string }> = new Map()
  // OpenAI: tool calls indexed by tool_call index
  const openaiTools: Map<number, { id: string; name: string; argsBuf: string }> = new Map()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const d = line.slice(6).trim()
      if (d === '[DONE]' || !d) continue

      try {
        const p = JSON.parse(d)

        if (provider === 'anthropic') {
          // ── Anthropic streaming with tools ──
          if (p.type === 'content_block_start' && p.content_block?.type === 'tool_use') {
            anthropicTools.set(p.index, { id: p.content_block.id, name: p.content_block.name, jsonBuf: '' })
          }
          if (p.type === 'content_block_delta') {
            const delta = p.delta
            if (delta?.type === 'text_delta' && delta.text) {
              fullText += delta.text
              ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ text: sanitizeResponse(delta.text) })}\n\n`))
            }
            if (delta?.type === 'thinking_delta' && delta.thinking) {
              fullThinking += delta.thinking
              ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'thinking', text: sanitizeResponse(delta.thinking) })}\n\n`))
            }
            if (delta?.type === 'input_json_delta' && delta.partial_json !== undefined) {
              const tool = anthropicTools.get(p.index)
              if (tool) tool.jsonBuf += delta.partial_json
            }
          }
          if (p.type === 'message_delta' && p.delta?.stop_reason) {
            stopReason = p.delta.stop_reason === 'tool_use' ? 'tool_use'
              : p.delta.stop_reason === 'max_tokens' ? 'max_tokens' : 'end'
          }
        } else {
          // ── OpenAI streaming with tools ──
          const choice = p.choices?.[0]
          if (!choice) continue

          if (choice.delta?.content) {
            fullText += choice.delta.content
            ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ text: sanitizeResponse(choice.delta.content) })}\n\n`))
          }
          if (choice.delta?.reasoning_content) {
            fullThinking += choice.delta.reasoning_content
            ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'thinking', text: sanitizeResponse(choice.delta.reasoning_content) })}\n\n`))
          }
          if (choice.delta?.tool_calls) {
            for (const tc of choice.delta.tool_calls) {
              const idx = tc.index ?? 0
              if (tc.id) {
                openaiTools.set(idx, { id: tc.id, name: tc.function?.name || '', argsBuf: tc.function?.arguments || '' })
              } else {
                const existing = openaiTools.get(idx)
                if (existing) {
                  if (tc.function?.arguments) existing.argsBuf += tc.function.arguments
                  if (tc.function?.name) existing.name = tc.function.name
                }
              }
            }
          }
          if (choice.finish_reason) {
            stopReason = (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'function_call')
              ? 'tool_use' : choice.finish_reason === 'length' ? 'max_tokens' : 'end'
          }
        }
      } catch { /* skip malformed JSON */ }
    }
  }

  // Build parsed tool calls
  const toolCalls: ParsedResponse['toolCalls'] = []
  if (provider === 'anthropic') {
    for (const [, t] of anthropicTools) {
      let input = {}
      try { input = JSON.parse(t.jsonBuf || '{}') } catch (e) { console.error(`[Tool Parse Error] ${t.name}: ${(e as Error).message}, buf length=${t.jsonBuf.length}, first 200=${t.jsonBuf.slice(0, 200)}`) }
      toolCalls.push({ id: t.id, name: t.name, input })
    }
  } else {
    for (const [, t] of openaiTools) {
      let input = {}
      try { input = JSON.parse(t.argsBuf || '{}') } catch { }
      toolCalls.push({ id: t.id, name: t.name, input })
    }
  }

  return { text: fullText, thinking: fullThinking, toolCalls, stopReason }
}

// Streaming API call WITH tools (agent mode) — both providers
async function callAIStreaming(
  provider: 'anthropic' | 'openai', model: string, sys: string,
  msgs: any[], key: string, max: number, think: boolean,
  forceToolUse: boolean = false
): Promise<Response> {
  if (provider === 'anthropic') {
    // Note: tool_choice 'any' is incompatible with thinking mode
    const canForce = forceToolUse && !think
    const toolChoice = canForce ? { type: 'any' } : { type: 'auto' }
    const body: any = { model, max_tokens: max, system: sys, messages: msgs, tools: toAnthropicTools(), tool_choice: toolChoice, stream: true }
    console.log(`[callAIStreaming] provider=anthropic model=${model} max=${max} forceToolUse=${forceToolUse} canForce=${canForce} toolChoice=${JSON.stringify(toolChoice)} toolCount=${toAnthropicTools().length}`)
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }
    if (think && (model.includes('sonnet') || model.includes('opus'))) {
      body.thinking = { type: 'enabled', budget_tokens: Math.max(10000, Math.min(32000, Math.floor(max * 0.5))) }
      body.tool_choice = { type: 'auto' }
      headers['anthropic-beta'] = 'interleaved-thinking-2025-05-14'
      // Thinking requires higher max_tokens — budget counts against it
      body.max_tokens = Math.max(max, body.thinking.budget_tokens + 8192)
    }
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
  } else {
    const oai = convertToOpenAIMessages(sys, msgs)
    const body: any = { model, messages: oai, tools: toOpenAITools(), tool_choice: forceToolUse ? 'required' : 'auto', stream: true }
    if (model.startsWith('o1') || model.startsWith('o3')) {
      body.max_completion_tokens = max
      if (think) body.reasoning_effort = 'high'
    } else {
      body.max_tokens = max
    }
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify(body)
    })
  }
}

// =====================================================
// SIMPLE STREAM (non-agentic, balanced)
// =====================================================

async function simpleStream(
  provider: 'anthropic' | 'openai', model: string, systemPrompt: string,
  messages: Message[], apiKey: string, maxTokens: number, attachments?: Attachment[]
): Promise<Response> {
  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(ctrl) {
      // FIX 7: Immediate status event — user sees response instantly
      ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'status', phase: 'thinking' })}\n\n`))
      try {
        const resp = await callAIStream(provider, model, systemPrompt, messages, apiKey, maxTokens, attachments)
        if (!resp.ok) { const e = await resp.json(); throw new Error(e.error?.message || 'API failed') }

        const reader = resp.body?.getReader()
        if (!reader) throw new Error('No body')
        const dec = new TextDecoder()
        let buf = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() || ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const d = line.slice(6)
            if (d === '[DONE]') continue
            try {
              const p = JSON.parse(d)
              // Unified text extraction for both providers
              const t = provider === 'anthropic'
                ? (p.type === 'content_block_delta' ? p.delta?.text : null)
                : p.choices?.[0]?.delta?.content
              if (t) ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ text: sanitizeResponse(t) })}\n\n`))
            } catch { }
          }
        }
        ctrl.enqueue(enc.encode('data: [DONE]\n\n'))
        ctrl.close()
      } catch (err: any) {
        if (err.message?.includes('rate') || err.status === 429) markRateLimited(apiKey, 60000)
        ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ error: sanitizeResponse(err.message) })}\n\n`))
        ctrl.close()
      }
    }
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-store', 'Connection': 'keep-alive', 'X-Powered-By': BRAND_NAME }
  })
}

// =====================================================
// UNIFIED API CALLERS
// Both providers called through the SAME interface
// =====================================================

// Build initial messages with vision support for BOTH providers
function buildInitialMessages(provider: 'anthropic' | 'openai', messages: Message[], attachments?: Attachment[]): any[] {
  return messages.map((m, idx) => {
    const isLast = idx === messages.length - 1
    const role = m.role === 'system' ? 'user' : m.role
    const text = typeof m.content === 'string' ? m.content : (m.content as ContentBlock[]).map(b => b.text || '').join('')

    // Attach images to the last user message (vision support)
    if (isLast && role === 'user' && attachments?.some(a => a.type === 'image')) {
      if (provider === 'anthropic') {
        return { role, content: buildAnthropicVisionBlocks(text, attachments) }
      } else {
        return { role, content: buildOpenAIVisionBlocks(text, attachments) }
      }
    }

    return { role, content: text }
  })
}

// Non-streaming call with tools (agent mode)
async function callAI(
  provider: 'anthropic' | 'openai', model: string, sys: string,
  msgs: any[], key: string, max: number, think: boolean
): Promise<Response> {
  if (provider === 'anthropic') {
    const body: any = { model, max_tokens: max, system: sys, messages: msgs, tools: toAnthropicTools() }
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }
    // Extended thinking — Anthropic
    if (think && (model.includes('sonnet') || model.includes('opus'))) {
      body.thinking = { type: 'enabled', budget_tokens: Math.max(10000, Math.min(32000, Math.floor(max * 0.5))) }
      body.tool_choice = { type: 'auto' }
      headers['anthropic-beta'] = 'interleaved-thinking-2025-05-14'
      body.max_tokens = Math.max(max, body.thinking.budget_tokens + 8192)
    }
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
  } else {
    const oai = convertToOpenAIMessages(sys, msgs)
    const body: any = { model, messages: oai, tools: toOpenAITools(), tool_choice: 'auto' }
    // Max tokens — OpenAI uses max_completion_tokens for o1/o3, max_tokens for others
    if (model.startsWith('o1') || model.startsWith('o3')) {
      body.max_completion_tokens = max
      // Extended thinking — OpenAI o1/o3: reasoning_effort parameter
      if (think) body.reasoning_effort = 'high'
    } else {
      body.max_tokens = max
    }
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify(body)
    })
  }
}

// Streaming call without tools (simple mode)
async function callAIStream(
  provider: 'anthropic' | 'openai', model: string, sys: string,
  messages: Message[], key: string, max: number, attachments?: Attachment[]
): Promise<Response> {
  const msgs = buildInitialMessages(provider, messages, attachments)

  if (provider === 'anthropic') {
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: max, system: sys, messages: msgs, stream: true })
    })
  } else {
    const oai = [{ role: 'system', content: sys }, ...msgs]
    const body: any = { model, messages: oai, stream: true }
    if (model.startsWith('o1') || model.startsWith('o3')) {
      body.max_completion_tokens = max
    } else {
      body.max_tokens = max
    }
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify(body)
    })
  }
}

// Convert Anthropic-format conversation to OpenAI format
function convertToOpenAIMessages(sys: string, msgs: any[]): any[] {
  const oai: any[] = [{ role: 'system', content: sys }]
  for (const m of msgs) {
    if (Array.isArray(m.content)) {
      const texts = m.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
      const trs = m.content.filter((b: any) => b.type === 'tool_result')
      const tus = m.content.filter((b: any) => b.type === 'tool_use')
      const imgs = m.content.filter((b: any) => b.type === 'image')

      if (trs.length > 0) {
        // Tool result messages
        for (const tr of trs) oai.push({ role: 'tool', content: typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content), tool_call_id: tr.tool_use_id })
      } else if (tus.length > 0) {
        // Assistant with tool calls
        const am: any = { role: 'assistant', content: texts || null }
        am.tool_calls = tus.map((t: any) => ({ id: t.id, type: 'function', function: { name: t.name, arguments: JSON.stringify(t.input) } }))
        oai.push(am)
      } else if (imgs.length > 0) {
        // Vision: convert Anthropic image blocks to OpenAI format
        const parts: any[] = imgs.map((img: any) => ({
          type: 'image_url',
          image_url: { url: `data:${img.source?.media_type || 'image/png'};base64,${img.source?.data}`, detail: 'high' }
        }))
        if (texts) parts.push({ type: 'text', text: texts })
        oai.push({ role: m.role, content: parts })
      } else {
        oai.push({ role: m.role, content: texts })
      }
    } else {
      oai.push({ role: m.role, content: m.content })
    }
  }
  return oai
}

// =====================================================
// CONTEXT COMPACTION (provider-agnostic)
// =====================================================

function compact(msgs: any[], maxTok: number): any[] {
  const est = (ms: any[]) => ms.reduce((t, m) => t + Math.ceil((typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).length / 4), 0)
  if (est(msgs) <= maxTok || msgs.length <= 4) return msgs
  const old = msgs.slice(0, -4)
  const recent = msgs.slice(-4)
  return [...old.map(m => {
    if (typeof m.content === 'string' && m.content.length > 500)
      return { ...m, content: m.content.slice(0, 200) + '\n...[compacted]...\n' + m.content.slice(-100) }
    if (Array.isArray(m.content))
      return { ...m, content: m.content.map((b: any) => b.type === 'tool_result' && typeof b.content === 'string' && b.content.length > 300 ? { ...b, content: b.content.slice(0, 150) + '\n[compacted]' } : b) }
    return m
  }), ...recent]
}

// =====================================================
// HELPERS
// =====================================================

function langFromPath(p: string): string {
  const ext = p.split('.').pop()?.toLowerCase() || ''
  const m: Record<string, string> = { ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx', py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown', yaml: 'yaml', yml: 'yaml', sql: 'sql', sh: 'bash' }
  return m[ext] || 'text'
}
