// =====================================================
// FILE ENGINE - KNOWLEDGE BASE (FULL INJECTION)
// Like Claude: ALL knowledge available on EVERY request
// Compiled into dense text — JSON wastes tokens, text is 2-3x more efficient
// =====================================================

export const FULL_KNOWLEDGE_BASE = `
## COGNITIVE PATTERNS

Understanding requests: Never take at face value. "Login page"=auth flow+validation+error states+forgot password. "Make it better"=diagnose specific weakness (typography? spacing? color?). "Add dark mode"=CSS vars+toggle+system preference+persistence. "Make responsive"=375/768/1024/1440px, nav collapse, grid stack, font adjust, 44px touch targets.

Planning (before ANY code): What files? Dependency order? Data types? Edge cases (null, empty, error)? Interaction states (idle, loading, success, error, empty)? Top 3 failure modes? Simplest complete solution? Existing code to check?

Mental execution tracing: Follow data from entry. Every function: who calls it, what returns? Every variable: can be null here? Every handler: bound correctly, right scope? Every CSS: right elements, specificity conflict? Every API call: what if 400/500/empty/slow?

Verification — HTML: <!DOCTYPE html>? viewport meta? All tags closed? CSS braces matched? JS functions defined? onclick handlers exist? Code block has :filepath? Works at 375px? Fonts loaded via link? React: default export? imports real? useState setter used? useEffect deps+cleanup? Keys on .map()? 'use client' if hooks?

Token strategy: 200+ lines=skip ALL explanation, output file. Medium=1-2 sentences then code. Truncated before=less preamble or split files. create_file tool costs ~200 tokens JSON overhead.

## DESIGN PHILOSOPHY

Process: 1) PURPOSE — who uses it, what should they feel? 2) BOLD aesthetic — not "clean modern" (meaningless). Pick: brutally minimal, maximalist, retro-futuristic, luxury/refined, playful, editorial, brutalist, art deco, soft/organic, industrial. COMMIT FULLY. 3) ONE memorable element. 4) Every decision reinforces direction.

NEVER: Purple gradient on white. Inter/Roboto/Arial only. Everything centered. Blue button white cards. Generic hero. Same padding every section. 5+ colors no hierarchy.

Fonts — Display: Playfair Display, Clash Display, Cabinet Grotesk, Satoshi, Fraunces, Bodoni Moda, Cormorant, Abril Fatface, Sora, Space Grotesk, Outfit, Unbounded, Bebas Neue. Body: DM Sans, Plus Jakarta Sans, General Sans, Nunito Sans, Source Sans 3, Lora, Literata. Mono: JetBrains Mono, Fira Code, Space Mono.
Pairings: Playfair Display+DM Sans (luxury), Space Grotesk+Inter (tech), Clash Display+Plus Jakarta Sans (bold), Cormorant+Nunito Sans (elegant), Sora+Source Sans 3 (pro).
Load: <link href="https://fonts.googleapis.com/css2?family=DISPLAY:wght@400;500;600;700;800&family=BODY:wght@300;400;500;600&display=swap" rel="stylesheet">
Scale: 12/14/16/18/20/24/30/36/48/60/72px. Line-height: headings 1.1-1.25, body 1.5-1.7. Letter-spacing: headings -0.02em, body 0, caps 0.1em.

Colors — CSS vars: --primary, --primary-hover, --bg, --bg-alt, --surface, --text, --text-muted, --border, --accent. Dark: bg #0f0f14, surface rgba(255,255,255,0.05-0.12), text #f5f5f5, muted #888. Light: bg #fafafa, surface #fff, text #1a1a1a, muted #666. NEVER #000 on #fff. Contrast: 4.5:1 body, 3:1 large. ONE dominant accent.
Accents: blue #3b82f6, emerald #10b981, violet #8b5cf6, amber #f59e0b, rose #f43f5e, coral #ff6b6b, teal #14b8a6, indigo #6366f1.

Spacing: 4/8/12/16/20/24/32/40/48/64/80/96/128px. Cards: 24px. Sections: 80-128px vertical. Mobile: reduce 40-50%.

Shadows layered: sm: 0 1px 2px rgba(0,0,0,0.04),0 1px 3px rgba(0,0,0,0.06). md: 0 2px 4px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.08). lg: 0 4px 6px rgba(0,0,0,0.04),0 12px 24px rgba(0,0,0,0.12). Dark=borders rgba(255,255,255,0.06-0.12) instead.

Glass: background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08);border-radius:16px.

Animation: transition:property 0.2s ease (NEVER all). Hover: translateY(-2px)+shadow, or scale(1.02). Stagger: animation-delay:calc(var(--i)*0.1s). Scroll: IntersectionObserver+classList.add('visible'). Easing: default cubic-bezier(0.4,0,0.2,1), bounce cubic-bezier(0.68,-0.55,0.265,1.55). ALWAYS: @media(prefers-reduced-motion:reduce){*{animation:none!important;transition-duration:0.01ms!important}}

Icons: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"> → <i class="fas fa-check"></i> fa-times fa-arrow-right fa-star fa-user fa-cog fa-search fa-home fa-envelope fa-lock fa-eye fa-download fa-share fa-edit fa-trash fa-plus fa-bars fa-chevron-down

Responsive: Mobile-first. Base=375px, @media(min-width:768px), (min-width:1024px), (min-width:1440px). Fonts -20% mobile. Stack columns. Touch 44px. Hide non-essential mobile.

## JAVASCRIPT / TYPESCRIPT

Core: const default, let reassign only, NEVER var. Arrow callbacks, regular top-level. Destructure: const {name,age}=user; const [first,...rest]=arr. Template literals. Optional chain: x?.y?.z. Nullish coalesce: val??default (not || which treats 0/'' as falsy). Spread: {...obj,new:val}, [...arr,item].

Async: try/catch ALL awaits. Check res.ok (fetch no throw on 4xx). Promise.all parallel, allSettled fault-tolerant. AbortController for cancel. Cleanup: return()=>controller.abort().
Debounce: let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}
Retry: for(let i=0;i<n;i++){try{return await fn()}catch(e){if(i===n-1)throw e;await new Promise(r=>setTimeout(r,d*(i+1)))}}

Arrays: .map() transform, .filter() subset, .find() single, .findIndex() position, .some() any, .every() all, .reduce() accumulate, .flat() flatten, .at(-1) last. Chain: .filter().sort().map().slice()

DOM: querySelector/All. addEventListener (not onclick attr). classList.add/remove/toggle. textContent (NEVER innerHTML=XSS). Event delegation: parent.addEventListener('click',e=>{const c=e.target.closest('.card');if(c)handle(c)}). IntersectionObserver scroll reveal. MutationObserver DOM watch. ResizeObserver element size.

Modern APIs: structuredClone() deep copy. crypto.randomUUID(). Intl.NumberFormat currency. Intl.DateTimeFormat dates. URLSearchParams query strings. navigator.clipboard.writeText().

TypeScript: Partial<T> optional all. Pick<T,K> subset. Omit<T,K> exclude. Record<K,V> map. ReturnType<typeof fn>. Discriminated unions: {status:'ok',data:T}|{status:'err',error:E}. Type guards: function isX(v:unknown):v is X. as const for literal types. satisfies for validation without widening.

Errors: NEVER empty catch. NEVER console.log only. Custom: class ApiError extends Error{constructor(public status:number,msg:string){super(msg)}}. Show error UI to user always.

## CSS

Vars: :root{--primary:#3b82f6;--bg:#0f0f14;--text:#f5f5f5;--space-md:16px;--radius:8px;--font-display:'Playfair',serif;--font-body:'DM Sans',sans-serif}

Layout: Grid: grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px. Center: display:grid;place-items:center. Flex: display:flex;justify-content:space-between;align-items:center. Container: max-width:1200px;margin:0 auto;padding:0 24px. Sticky: position:sticky;top:0;z-index:100. Container query: @container(min-width:400px){...}.

Type: Fluid: font-size:clamp(1rem,2.5vw,2rem). Truncate: white-space:nowrap;overflow:hidden;text-overflow:ellipsis. Multi-truncate: display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden. Balance: text-wrap:balance.

Selectors: :has() parent, :is() group, :focus-visible keyboard-only, ::selection highlight, :not(:last-child) borders. Native nesting: .card{&:hover{...}&.active{...}}.

Modern: aspect-ratio:16/9. accent-color for inputs. color-scheme:light dark. scroll-snap-type:x mandatory. logical props: padding-inline, margin-block.

Animate: ONLY transform+opacity (GPU). Never width/height/margin. Keyframes: fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}. Shimmer for skeletons: background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);background-size:200%;animation:shimmer 1.5s infinite.

Forms: Reset: input,textarea,select,button{font:inherit;color:inherit}. Focus: :focus-visible{outline:2px solid var(--primary);outline-offset:2px}. Validation: input:invalid:not(:placeholder-shown){border-color:var(--error)}.

A11y: .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}. Skip link. 4.5:1 contrast. Semantic HTML: nav,main,section,article,aside. ARIA labels on icon buttons.

Units: rem sizing, px borders/shadows, clamp() fluid, dvh mobile viewport, ch text width (max-width:65ch).

Performance: contain:layout style paint. content-visibility:auto. font-display:swap. preconnect CDNs.

## REACT MASTERY

Hooks: useState — async, functional updater setState(prev=>prev+1), never mutate, lazy init useState(()=>compute()). useEffect — after render, ALWAYS cleanup, deps=all used values, []=mount, no deps=every render, DON'T derive state (use useMemo). useRef — DOM refs+mutable non-render values. useMemo — expensive calc only, not premature. useCallback — only for memo'd children or effect deps. useReducer — complex transitions. useContext — shared state.

Patterns: Functional only. Composition over inheritance. Custom hooks: useDebounce, useMediaQuery, useLocalStorage, useOnClickOutside, useIntersectionObserver. Error boundaries class component. Suspense+lazy code split. forwardRef for DOM access. createPortal for modals/tooltips.

NEVER: setState in render body. Mutate state. useEffect no deps "run once" (use []). Index as key dynamic lists. Fetch without abort cleanup.

Next.js 14: 'use client' for hooks/handlers. Server components default=async/await/no hooks. page.tsx=route, layout.tsx=wrapper, loading.tsx=loading, error.tsx=error. export const metadata={title:'...'}.

Common libs: shadcn/ui (Radix-based), headless-ui (Tailwind), framer-motion (animation), tanstack-query (data fetching), swr (stale-while-revalidate), zustand (state), zod (validation), date-fns (dates), recharts/chart.js (charts), clsx (classnames).

## DEBUGGING METHODOLOGY

7 steps: 1) OBSERVE — exactly what happens vs expected, error messages, when started, reproducible? 2) HYPOTHESIZE — top 2-3 causes by probability. 3) INVESTIGATE — view_file, run_command, read actual code. 4) ROOT CAUSE — trace to source not symptom. 5) MINIMAL FIX — edit_file, fewest lines. 6) VERIFY — trace with fix, edge cases. 7) EXPLAIN — what broke, why, fix, prevent.

JS errors: "Cannot read X of undefined"=null upstream, add ?. or guard. "Not a function"=wrong import or shadowed var. "Max call stack"=infinite recursion, check base case. ReferenceError=typo or missing import.

React errors: "Max update depth"=setState loop in effect, check deps. "Hydration mismatch"=client-only code in render, use useEffect. "Invalid hook"=called in condition/loop or missing 'use client'. Missing key=add key={item.id} on .map(). Stale closure=use functional updater or useRef.

CSS bugs: Not applying=specificity override or typo. Layout broken=missing box-sizing:border-box or fixed widths. Mobile broken=missing viewport meta or no breakpoints.

API errors: CORS=server needs Access-Control-Allow-Origin. 404=wrong URL. 401=missing/expired auth. 500=server-side, check server logs. "Failed to fetch"=server down/URL wrong/CORS/mixed content.

Platform errors: "Creating file failed"=token limit truncated JSON, less preamble. "Preview blank"=missing <!DOCTYPE html> or missing :filepath. "Tool Failed"=JSON truncated, shorter explanation. "Changes not showing"=create_file to overwrite. "Intent misclassified"=wrong max_tokens, safety floor 8192.

Recovery: Loading=spinner/skeleton never blank. Error=human message+retry action. Empty=friendly message+CTA. Timeout=5s "still working", 15s "try refreshing".

## REASONING MODELS

First principles: Break to fundamentals, build up. Don't jump to solutions.
Steel thread: Thinnest end-to-end first (UI→API→DB→render), then widen.
Inversion: "What would make this fail?" to find what to prevent.
Occam's razor: Simplest explanation first. Check spelling before framework bugs.
Working backwards: From desired end state, trace what must exist.
Divide and conquer: Independent sub-tasks, smallest useful unit first, verify, next.
Constraints: Platform (srcdoc/Babel, tokens, CDN-only). Browser (no fs, same-origin). Mobile (375px, 44px touch). A11y (keyboard, screen reader, contrast). Perf (lazy load, debounce, GPU-only animation). Security (no innerHTML user data, no client secrets, rel=noopener).

## SECURITY

XSS: NEVER innerHTML/eval/document.write with user input. Use textContent. DOMPurify.sanitize() if must render HTML.
Data: NEVER store secrets/keys/tokens in client code. HTTPS only. httpOnly cookies for auth.
Links: rel="noopener noreferrer" on target="_blank". Validate URLs before rendering.
Input: Validate both client (UX) and server (security). Never trust client-side validation alone.
`

// =====================================================
// EXPORT — INJECT INTO EVERY REQUEST
// =====================================================

export function getFullKnowledgeBase(): string {
  return `\n<knowledge>\n${FULL_KNOWLEDGE_BASE}\n</knowledge>`
}
