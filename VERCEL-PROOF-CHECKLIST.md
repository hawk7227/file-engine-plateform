# VERCEL-PROOF™ Master Verification Checklist

## 500+ Pre-Build Checks for Next.js + TypeScript + React + Supabase

> **Purpose:** Guarantee every push passes Vercel build. Catch errors locally before they waste deploy time.
> 
> **System:** `vercel-proof.sh` (automated) + this document (reference)
>
> **Rule:** Nothing gets pushed to Git until `vercel-proof.sh` returns exit code 0.

---

## How to Use

```bash
# Install (one time)
./vercel-proof-setup.sh

# Run before every push
./vercel-proof.sh

# Scan a single file you just changed
./vercel-proof.sh --file src/components/MyComponent.tsx

# Run only one category
./vercel-proof.sh --category types

# Auto-fix what's fixable
./vercel-proof.sh --fix
```

After installation, the pre-push Git hook runs verification automatically. If errors are found, the push is blocked.

---

## Category 1: Syntax & Structure (Checks 1–65)

### Bracket Balance (1–15)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 1 | Parentheses `()` balanced per file | ERROR | SWC parse error, build crash |
| 2 | Curly braces `{}` balanced per file | ERROR | SWC parse error, build crash |
| 3 | Square brackets `[]` balanced per file | ERROR | SWC parse error, build crash |
| 4 | Angle brackets `<>` balanced in JSX | ERROR | SWC parse error, build crash |
| 5 | Template literal backticks balanced | ERROR | SWC parse error |
| 6 | No orphaned closing brackets at EOF | ERROR | "Expression expected" error |
| 7 | No orphaned opening brackets | ERROR | Unterminated block |
| 8 | JSX self-closing tags have `/>`  | ERROR | Parse error |
| 9 | Multi-line JSX wrapped in `()` after return | ERROR | Returns undefined (ASI) |
| 10 | Arrow functions with block body have `{}` | ERROR | Syntax error |
| 11 | Ternary operators complete (has both `:` branches) | ERROR | Syntax error |
| 12 | Switch cases have `break` or `return` | WARN | Fall-through bugs |
| 13 | No dangling commas in function params | WARN | Older parsers may fail |
| 14 | Object destructuring brackets balanced | ERROR | Syntax error |
| 15 | Array destructuring brackets balanced | ERROR | Syntax error |

### Declarations & Scope (16–35)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 16 | No duplicate `const` declarations in same scope | ERROR | TS2451 duplicate identifier |
| 17 | No duplicate `function` declarations in same scope | ERROR | TS2393 duplicate function |
| 18 | No duplicate `interface` names (unless intentional merge) | WARN | Unexpected type merging |
| 19 | No duplicate `type` aliases | ERROR | TS2300 duplicate identifier |
| 20 | No duplicate `enum` members | ERROR | TS2432 duplicate enum member |
| 21 | No `var` usage (use `const`/`let`) | WARN | Hoisting bugs |
| 22 | No redeclared `let` in same block | ERROR | TS2451 |
| 23 | Single `export default` per file | ERROR | TS2528 |
| 24 | Named exports don't conflict with default | WARN | Import confusion |
| 25 | No circular variable references | ERROR | TDZ errors |
| 26 | Destructured variables match source properties | WARN | Gets `undefined` |
| 27 | No empty destructuring `const {} = x` | WARN | Useless statement |
| 28 | `const` variables aren't reassigned | ERROR | TS2588 |
| 29 | Block-scoped vars used after declaration (not before) | ERROR | TS2448 — THE BUG WE HIT |
| 30 | Function params don't shadow outer variables | WARN | Confusing scope |
| 31 | No unused variables in strict TS mode | ERROR | TS6133 if noUnusedLocals |
| 32 | No unused parameters (except prefixed with `_`) | WARN | Clean code |
| 33 | Exported functions are used somewhere | WARN | Dead code |
| 34 | No assignment in conditional (`if (x = y)`) | WARN | Likely means `===` |
| 35 | No `eval()` usage | WARN | Security + bundle issues |

### String & Template Literals (36–45)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 36 | No unclosed string literals | ERROR | Parse error |
| 37 | No unclosed template literal `${…}` expressions | ERROR | Parse error |
| 38 | Template literals don't contain unescaped backticks | ERROR | Parse error |
| 39 | No HTML entities in JSX text (use unicode) | WARN | Renders literal `&amp;` |
| 40 | No straight quotes in JSX where smart quotes intended | WARN | Typography |
| 41 | Regex literals properly closed | ERROR | Parse error |
| 42 | JSON.parse() input validated | WARN | Runtime crash |
| 43 | No `\n` in JSX text (use `<br />` or CSS) | WARN | Renders literally |
| 44 | String concatenation uses template literals | WARN | Readability |
| 45 | No bare `//` in JSX text (interpreted as comment) | ERROR | Content lost |

### Control Flow (46–65)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 46 | No unreachable code after `return` | WARN | Dead code |
| 47 | No unreachable code after `throw` | WARN | Dead code |
| 48 | No infinite loops without break condition | WARN | Browser freeze |
| 49 | `for...in` has `hasOwnProperty` check | WARN | Prototype pollution |
| 50 | `for...of` used on iterables only | ERROR | Runtime TypeError |
| 51 | No consecutive logical operators `&&&&` or `||||` | ERROR | Syntax error |
| 52 | Ternary operator not nested beyond 2 levels | WARN | Unreadable |
| 53 | `switch` has `default` case | WARN | Unhandled cases |
| 54 | No empty `if` blocks | WARN | Likely incomplete code |
| 55 | No empty `else` blocks | WARN | Likely incomplete code |
| 56 | No empty function bodies (except no-ops) | WARN | Likely incomplete |
| 57 | `try` blocks have `catch` or `finally` | ERROR | Syntax error without |
| 58 | `catch` blocks don't silently swallow errors | WARN | Hidden bugs |
| 59 | `finally` blocks don't have `return` | WARN | Overrides try/catch return |
| 60 | No `throw` of string literals (throw Error objects) | WARN | No stack trace |
| 61 | `typeof` checks use valid type names | WARN | Always `false` |
| 62 | `instanceof` right operand is a constructor | ERROR | Runtime TypeError |
| 63 | No comparison of different types without coercion | WARN | Unexpected results |
| 64 | `===` used instead of `==` (except null checks) | WARN | Type coercion bugs |
| 65 | Comma operator not used accidentally | WARN | Evaluates to last |

---

## Category 2: TypeScript Type Errors (Checks 66–130)

### Variable & Scope Types (66–85)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 66 | Block-scoped variable not used before declaration | ERROR | TS2448 — EXACT BUG |
| 67 | `const` used for callback references before definition | ERROR | TS2448 |
| 68 | `useCallback` dependencies declared before the callback | ERROR | TS2448 |
| 69 | Function hoisting only works for `function` declarations, not `const` | ERROR | TDZ |
| 70 | No circular type references | ERROR | TS2456 |
| 71 | Generic type parameters provided where required | ERROR | TS2314 |
| 72 | `Promise<>` has type parameter | ERROR | TS1099 |
| 73 | `Array<>` has type parameter | ERROR | TS1099 |
| 74 | `Record<>` has both key and value types | ERROR | TS1099 |
| 75 | `Map<>` and `Set<>` have type parameters | WARN | Implicit `any` |
| 76 | Optional chaining used for nullable properties | WARN | Runtime crash |
| 77 | Non-null assertion `!` justified and documented | WARN | Runtime crash if wrong |
| 78 | `as` type assertions are safe (not lying to compiler) | WARN | Runtime crash |
| 79 | No `any` type in function signatures | WARN | Disables type checking |
| 80 | No `@ts-ignore` without explanation comment | WARN | Hidden type errors |
| 81 | No `@ts-nocheck` in production code | ERROR | Entire file unchecked |
| 82 | `unknown` used instead of `any` for dynamic data | WARN | Forces type narrowing |
| 83 | Type predicates (`is`) return correct narrowed type | ERROR | Wrong type in branches |
| 84 | Discriminated unions have exhaustive checks | WARN | Unhandled variants |
| 85 | `keyof` used on correct type | WARN | Wrong key set |

### Property & Interface Types (86–110)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 86 | Property exists on the type being accessed | ERROR | TS2339 — THE ALLERGIES BUG |
| 87 | Hook return type matches destructured properties | ERROR | TS2339 |
| 88 | Supabase query results accessed with correct column names | ERROR | Undefined at runtime |
| 89 | Props interface matches component usage | ERROR | TS2322 |
| 90 | State setter names match useState declarations | ERROR | TS2304 — THE SETTER BUG |
| 91 | Callback parameter types match event handler signatures | ERROR | TS2345 |
| 92 | Return type matches function signature | ERROR | TS2322 |
| 93 | Object spread types are compatible | ERROR | TS2698 |
| 94 | Intersection types don't create `never` properties | WARN | Unusable type |
| 95 | Optional properties handled (not assumed present) | WARN | Runtime undefined |
| 96 | `readonly` properties not mutated | ERROR | TS2540 |
| 97 | Index signatures match access patterns | ERROR | TS7053 |
| 98 | Tuple types accessed within bounds | ERROR | TS2493 |
| 99 | Mapped type keys valid | ERROR | TS2345 |
| 100 | Conditional types resolve correctly | WARN | Unexpected type |
| 101 | Interface extensions don't conflict | ERROR | TS2320 |
| 102 | Class implements all interface members | ERROR | TS2420 |
| 103 | Abstract methods implemented in subclasses | ERROR | TS2515 |
| 104 | Overloaded function signatures match implementation | ERROR | TS2394 |
| 105 | `Partial<T>` used when all props optional | WARN | Cleaner type |
| 106 | `Required<T>` used when removing optionality | WARN | Cleaner type |
| 107 | `Pick<T, K>` keys exist on T | ERROR | TS2344 |
| 108 | `Omit<T, K>` keys exist on T | WARN | No-op if key missing |
| 109 | `Extract<T, U>` produces non-never result | WARN | Empty type |
| 110 | `Exclude<T, U>` produces non-never result | WARN | Empty type |

### Function & Expression Types (111–130)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 111 | Function called with correct number of arguments | ERROR | TS2554 |
| 112 | Function arguments match parameter types | ERROR | TS2345 |
| 113 | Async functions return Promise-wrapped type | ERROR | TS2322 |
| 114 | `await` used on Promise (not non-Promise) | WARN | No-op await |
| 115 | Callback return types satisfy constraint | ERROR | TS2322 |
| 116 | Array methods (`.map`, `.filter`) callback types correct | ERROR | TS2345 |
| 117 | `.find()` result handled as possibly undefined | WARN | Runtime crash |
| 118 | `.indexOf()` result checked against -1, not falsy | WARN | Index 0 is falsy |
| 119 | Numeric operations on numeric types only | ERROR | TS2365 |
| 120 | String operations on string types only | ERROR | TS2345 |
| 121 | Boolean expressions evaluate to boolean | WARN | Truthy/falsy confusion |
| 122 | Nullish coalescing `??` preferred over `||` for defaults | WARN | `0` and `''` are falsy |
| 123 | Optional chaining `?.` return type is `T | undefined` | WARN | Missing null check |
| 124 | Spread operator type compatible | ERROR | TS2698 |
| 125 | Destructured default values match type | ERROR | TS2322 |
| 126 | `JSON.parse()` result typed (not used as `any`) | WARN | No type safety |
| 127 | Event handler types match DOM events | ERROR | TS2769 |
| 128 | Ref types match element types | ERROR | TS2322 |
| 129 | Context type matches Provider value | ERROR | TS2322 |
| 130 | `useReducer` dispatch type matches action types | ERROR | TS2345 |

---

## Category 3: Import & Module Errors (Checks 131–195)

### Import Resolution (131–155)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 131 | All imported modules exist on disk | ERROR | TS2307 module not found |
| 132 | Relative import paths resolve to existing files | ERROR | TS2307 |
| 133 | `@/` alias paths resolve correctly via tsconfig | ERROR | Module not found |
| 134 | Named imports exist in source module | ERROR | TS2305 |
| 135 | Default import matches module's default export | ERROR | TS1192 |
| 136 | No circular imports between files | WARN | Undefined at runtime |
| 137 | Barrel exports (`index.ts`) don't create cycles | WARN | Initialization order |
| 138 | Dynamic imports have correct paths | ERROR | Runtime 404 |
| 139 | `require()` not used in ESM context | WARN | May fail in ESM |
| 140 | Import extensions match tsconfig module resolution | WARN | Module not found |
| 141 | `useState` imported when used | ERROR | ReferenceError |
| 142 | `useEffect` imported when used | ERROR | ReferenceError |
| 143 | `useCallback` imported when used | ERROR | ReferenceError |
| 144 | `useRef` imported when used | ERROR | ReferenceError |
| 145 | `useMemo` imported when used | ERROR | ReferenceError |
| 146 | `useContext` imported when used | ERROR | ReferenceError |
| 147 | `useReducer` imported when used | ERROR | ReferenceError |
| 148 | Lucide icons imported from `lucide-react` | ERROR | Module not found |
| 149 | Supabase client imported correctly | ERROR | Module not found |
| 150 | Next.js components imported from correct packages | ERROR | Module not found |
| 151 | No imports from `node_modules` internals | WARN | Breaks on update |
| 152 | Type imports use `import type` where possible | WARN | Unnecessary bundle |
| 153 | No duplicate import statements for same module | WARN | Clean code |
| 154 | Import order follows convention (external → internal) | WARN | Clean code |
| 155 | No side-effect imports unless necessary | WARN | Bundle size |

### Server/Client Module Boundary (156–175)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 156 | No `fs` import in client components | ERROR | Build crash — module not found in browser |
| 157 | No `path` import in client components | ERROR | Build crash |
| 158 | No `child_process` in client components | ERROR | Build crash |
| 159 | No `crypto` (Node) in client components | ERROR | Build crash (use Web Crypto) |
| 160 | No `os` import in client components | ERROR | Build crash |
| 161 | No `stream` import in client components | ERROR | Build crash |
| 162 | No `http`/`https` in client components | ERROR | Build crash |
| 163 | No `net` import in client components | ERROR | Build crash |
| 164 | Server-only packages marked with `server-only` | WARN | Accidental client inclusion |
| 165 | Client-only packages marked with `client-only` | WARN | Accidental server inclusion |
| 166 | No database driver imports in client code | ERROR | Exposes connection strings |
| 167 | No Supabase service role client in client code | ERROR | Exposes service key |
| 168 | `getServerSideProps` not in App Router files | ERROR | Wrong API |
| 169 | `getStaticProps` not in App Router files | ERROR | Wrong API |
| 170 | Server Actions (`'use server'`) not imported as client functions | ERROR | Security bypass |
| 171 | `cookies()` only used in Server Components | ERROR | Client crash |
| 172 | `headers()` only used in Server Components | ERROR | Client crash |
| 173 | `redirect()` from `next/navigation` in client | WARN | Use `useRouter` instead |
| 174 | `notFound()` only in Server Components or Route Handlers | ERROR | Client crash |
| 175 | Dynamic import for heavy client-only libraries | WARN | SSR crash otherwise |

### Unused & Dead Imports (176–195)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 176 | Every named import is used at least once | WARN | Clean code |
| 177 | Default imports are used | WARN | Clean code |
| 178 | Namespace imports (`* as`) are used | WARN | Bundle bloat |
| 179 | Re-exports actually export something | ERROR | Empty module |
| 180 | No imports from deleted files | ERROR | TS2307 |
| 181 | No imports from renamed files (old name) | ERROR | TS2307 |
| 182 | Icon imports match what's rendered | WARN | Missing icon |
| 183 | Hook imports match what's called | ERROR | ReferenceError |
| 184 | Utility function imports match usage | WARN | Dead code |
| 185 | Type imports not used at runtime | WARN | Unnecessary bundle |
| 186 | CSS module imports match className usage | WARN | Missing styles |
| 187 | No orphaned test imports in production code | WARN | Bundle size |
| 188 | No mock imports in production code | WARN | Wrong behavior |
| 189 | Package version compatible with imports used | ERROR | Missing API |
| 190 | Peer dependencies satisfied | WARN | Version mismatch warning |
| 191 | No conflicting package versions | WARN | Multiple instances |
| 192 | Lock file matches package.json | WARN | Different versions installed |
| 193 | Both `package-lock.json` and `yarn.lock` don't coexist | WARN | Vercel warning |
| 194 | `dependencies` vs `devDependencies` correct | WARN | Missing in production |
| 195 | No deprecated package imports | WARN | Future breakage |

---

## Category 4: React & JSX Errors (Checks 196–270)

### Component Structure (196–220)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 196 | Component names are PascalCase | ERROR | React treats as HTML element |
| 197 | Component returns valid JSX (not undefined) | ERROR | Runtime crash |
| 198 | Component has single root element or Fragment | ERROR | Parse error |
| 199 | Conditional rendering handles all branches | WARN | Unexpected undefined |
| 200 | No component definition inside another component | WARN | Remounts on every render |
| 201 | `key` prop provided in `.map()` rendered lists | ERROR | React hydration error |
| 202 | `key` prop is unique within the list | WARN | Wrong DOM updates |
| 203 | `key` prop is not array index (in mutable lists) | WARN | State bugs on reorder |
| 204 | `key` prop not passed to child component props | WARN | Not accessible |
| 205 | Children prop type matches usage | ERROR | TS2322 |
| 206 | `React.memo` comparison function is correct | WARN | Stale renders |
| 207 | `forwardRef` used when ref forwarding needed | WARN | Ref is null |
| 208 | Default props provided for optional props | WARN | Undefined access |
| 209 | Prop types match parent's passed values | ERROR | TS2322 |
| 210 | No prop drilling beyond 3 levels | WARN | Use context instead |
| 211 | Event handler naming follows `on*` / `handle*` convention | WARN | Readability |
| 212 | Boolean props don't need `={true}` | WARN | Clean code |
| 213 | Spread props don't conflict with explicit props | WARN | Overwritten values |
| 214 | Component file name matches export name | WARN | Import confusion |
| 215 | No side effects in render body | ERROR | Infinite loops |
| 216 | `{0 && <Component />}` renders "0" — use `!!` or ternary | WARN | Shows "0" in UI |
| 217 | `{undefined && <Component />}` is safe but unnecessary | WARN | Dead code |
| 218 | Fragment `<>` doesn't need key; use `<Fragment key>` when it does | ERROR | Missing key |
| 219 | Portal target element exists in DOM | WARN | Runtime null error |
| 220 | ErrorBoundary wraps error-prone subtrees | WARN | Uncaught errors |

### JSX Attribute Errors (221–250)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 221 | `className` used (not `class`) | ERROR | React warning + ignored |
| 222 | `htmlFor` used (not `for`) | WARN | React warning |
| 223 | `onChange` used (not `onchange`) | ERROR | Ignored in React |
| 224 | `onClick` used (not `onclick`) | ERROR | Ignored in React |
| 225 | `tabIndex` used (not `tabindex`) | WARN | React warning |
| 226 | `autoComplete` used (not `autocomplete`) | WARN | React warning |
| 227 | `readOnly` used (not `readonly`) | WARN | React warning |
| 228 | `maxLength` used (not `maxlength`) | WARN | React warning |
| 229 | `colSpan`/`rowSpan` used (not `colspan`/`rowspan`) | WARN | React warning |
| 230 | `style` prop is object, not string | ERROR | React crash |
| 231 | Style property names are camelCase | ERROR | Ignored property |
| 232 | Style values are correct type (string/number) | ERROR | Ignored property |
| 233 | `dangerouslySetInnerHTML` content is sanitized | WARN | XSS vulnerability |
| 234 | `dangerouslySetInnerHTML` not used with `children` | ERROR | React error |
| 235 | Boolean HTML attributes handled correctly | WARN | Always `"true"` string |
| 236 | `src` attributes have valid URLs | WARN | 404 images |
| 237 | `href` attributes have valid URLs | WARN | Dead links |
| 238 | Input `type` attribute is valid HTML | WARN | Falls back to text |
| 239 | Form `method` attribute is valid | WARN | Defaults to GET |
| 240 | `ref` not used on function components (need forwardRef) | ERROR | React warning |
| 241 | `value` and `onChange` paired on controlled inputs | WARN | React warning |
| 242 | `defaultValue` not used with `value` (controlled vs uncontrolled) | WARN | React warning |
| 243 | `checked` and `onChange` paired on checkboxes | WARN | React warning |
| 244 | No JavaScript URIs (`href="javascript:..."`) | WARN | Security |
| 245 | `target="_blank"` has `rel="noopener noreferrer"` | WARN | Security |
| 246 | Image dimensions provided (width/height) | WARN | Layout shift |
| 247 | SVG attributes use camelCase in JSX | WARN | React warning |
| 248 | `data-*` attributes are lowercase | WARN | HTML spec |
| 249 | `aria-*` attributes are valid | WARN | Accessibility |
| 250 | No duplicate props on same element | ERROR | Last one wins silently |

### React Event Handling (251–270)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 251 | Event handler is function reference, not invocation | ERROR | Fires on render |
| 252 | `onClick={() => fn()}` for functions with args | WARN | Otherwise calls immediately |
| 253 | `onSubmit` has `e.preventDefault()` when needed | WARN | Page reloads |
| 254 | Event handler receives correct event type | WARN | Type mismatch |
| 255 | `e.target.value` used on correct input events | WARN | Undefined value |
| 256 | `e.currentTarget` used for the element with the handler | WARN | Wrong element |
| 257 | Synthetic events not accessed asynchronously | WARN | Null event (React <17) |
| 258 | `e.stopPropagation()` used intentionally | WARN | Blocks parent handlers |
| 259 | Keyboard events handle accessibility | WARN | Not accessible |
| 260 | Touch events don't conflict with click events | WARN | Double-fire on mobile |
| 261 | Form events properly typed | WARN | Type errors |
| 262 | Custom events properly dispatched | WARN | Silent failure |
| 263 | Event cleanup in useEffect return | WARN | Memory leak |
| 264 | Passive event listeners for scroll/touch | WARN | Performance |
| 265 | No memory leaks from event listeners | WARN | Growing handler list |
| 266 | Drag events properly sequenced | WARN | Broken drag-and-drop |
| 267 | File input `onChange` handles FileList correctly | WARN | Type error |
| 268 | Resize/scroll handlers are throttled/debounced | WARN | Performance |
| 269 | Focus management in modals/dialogs | WARN | Accessibility |
| 270 | No event handler on non-interactive elements without role | WARN | Accessibility |

---

## Category 5: Next.js Specific (Checks 271–340)

### Client/Server Directives (271–290)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 271 | `'use client'` present when using hooks | ERROR | Server Component error |
| 272 | `'use client'` at very top of file (before imports) | ERROR | Not recognized |
| 273 | `'use server'` files don't use hooks | ERROR | Hooks only work in client |
| 274 | Server Components don't import client-only modules | ERROR | Build error |
| 275 | Client Components don't export metadata | ERROR | Build error |
| 276 | `'use server'` functions are async | ERROR | Server Action requirement |
| 277 | Server Actions properly serializable | ERROR | Can't transfer to client |
| 278 | No `'use client'` in API routes | WARN | Unnecessary |
| 279 | Layout components correctly mark client/server | ERROR | Hydration mismatch |
| 280 | Template components (`template.tsx`) properly structured | WARN | Wrong behavior |
| 281–290 | (Additional directive checks) | VARIES | Various build errors |

### Routing & Pages (291–320)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 291 | Page files have `export default` | ERROR | 404 page |
| 292 | Layout files have `export default` | ERROR | Build crash |
| 293 | API routes use named exports (GET, POST, etc.) | ERROR | 405 Method Not Allowed |
| 294 | API routes don't use `export default` in App Router | ERROR | Route not found |
| 295 | Dynamic route params typed correctly | ERROR | Type mismatch |
| 296 | `generateStaticParams` returns correct format | ERROR | Build crash |
| 297 | `generateMetadata` is async and returns correct type | ERROR | Build crash |
| 298 | `loading.tsx` has `export default` | ERROR | Loading not shown |
| 299 | `error.tsx` has `'use client'` | ERROR | Error boundary requires it |
| 300 | `not-found.tsx` has `export default` | ERROR | Not shown |
| 301 | No duplicate route segments | ERROR | Ambiguous routing |
| 302 | Catch-all routes `[...slug]` handled correctly | WARN | 404s |
| 303 | Optional catch-all `[[...slug]]` handled | WARN | Missing handler |
| 304 | Route groups `(group)` don't conflict | WARN | Ambiguous routing |
| 305 | Parallel routes `@slot` properly configured | ERROR | Build crash |
| 306 | Intercepting routes `(.)` properly structured | WARN | Wrong behavior |
| 307 | Middleware matcher patterns valid | ERROR | Wrong routes matched |
| 308 | `revalidatePath` called with valid paths | WARN | Cache not cleared |
| 309 | `redirect()` called with valid paths | WARN | 404s |
| 310 | `permanentRedirect()` used correctly | WARN | Wrong status code |
| 311–320 | (Additional routing checks) | VARIES | Various errors |

### Next.js API & Features (321–340)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 321 | `<Image>` component has required `width`/`height` or `fill` | ERROR | Build error |
| 322 | `<Image>` `src` is valid | ERROR | 404 image |
| 323 | `<Link>` `href` is valid path | WARN | 404 navigation |
| 324 | `<Link>` doesn't nest `<a>` tag | ERROR | React hydration error |
| 325 | `useRouter` from `next/navigation` (not `next/router`) | ERROR | Wrong API in App Router |
| 326 | `useSearchParams` wrapped in Suspense | WARN | Build warning |
| 327 | `usePathname` from `next/navigation` | ERROR | Wrong import |
| 328 | Font loading via `next/font` (not CSS import) | WARN | Performance |
| 329 | `next.config.js` valid JavaScript | ERROR | Build crash |
| 330 | Image domains configured for external images | ERROR | Images blocked |
| 331 | `experimental` features actually supported | WARN | Build warning |
| 332 | `output: 'export'` compatible with features used | ERROR | Build crash |
| 333 | Webpack config customizations valid | ERROR | Build crash |
| 334 | Environment variables properly typed | WARN | Type safety |
| 335 | ISR `revalidate` values are numbers | ERROR | Build error |
| 336 | Static pages don't use dynamic APIs | ERROR | Build error |
| 337 | `dynamic = 'force-static'` compatible with page logic | ERROR | Runtime crash |
| 338 | `fetchCache` configuration valid | WARN | Wrong caching |
| 339 | `runtime = 'edge'` compatible with dependencies | ERROR | Edge doesn't support all Node APIs |
| 340 | Streaming/Suspense boundaries properly placed | WARN | Bad UX |

---

## Category 6: React Hooks Rules (Checks 341–400)

### Rules of Hooks (341–370)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 341 | Hooks not called inside conditions | ERROR | Inconsistent hook order |
| 342 | Hooks not called inside loops | ERROR | Inconsistent hook order |
| 343 | Hooks not called inside nested functions | ERROR | Not a component context |
| 344 | Hooks not called after early returns | ERROR | Inconsistent hook order |
| 345 | Hooks called in same order every render | ERROR | State corruption |
| 346 | Custom hooks start with `use` prefix | ERROR | Not recognized as hook |
| 347 | Custom hooks return consistent type | WARN | Consumer confusion |
| 348 | `useEffect` dependency array complete | WARN | Stale closures |
| 349 | `useEffect` dependency array not missing state references | WARN | Stale state |
| 350 | `useEffect` cleanup function returned | WARN | Memory leak |
| 351 | `useEffect` with empty deps only runs on mount | WARN | May need deps |
| 352 | `useEffect` not used for derived state (use `useMemo`) | WARN | Extra render |
| 353 | `useCallback` has dependency array | WARN | No memoization |
| 354 | `useCallback` dependencies are minimal | WARN | Too many re-creations |
| 355 | `useMemo` has dependency array | WARN | Computed every render |
| 356 | `useMemo` not used for simple values | WARN | Unnecessary overhead |
| 357 | `useRef` initial value matches usage | WARN | Type mismatch |
| 358 | `useRef` `.current` not used in render output | WARN | Won't trigger re-render |
| 359 | `useContext` consumer inside Provider | WARN | Gets default value |
| 360 | `useReducer` action types exhaustive | WARN | Unhandled actions |
| 361–370 | (Additional hook checks) | VARIES | Various hook errors |

### State & Effect Patterns (371–400)
| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 371 | setState not called in render body | ERROR | Infinite loop |
| 372 | setState async — don't read right after setting | WARN | Stale value (THE RACE BUG) |
| 373 | Functional updates used when depending on prev state | WARN | Race conditions |
| 374 | Object/array state updated immutably | WARN | React won't re-render |
| 375 | No state for values derivable from other state | WARN | Out of sync |
| 376 | useState initialized with correct type | WARN | Type mismatch |
| 377 | useEffect not async (wrap in IIFE) | ERROR | Returns cleanup confusion |
| 378 | useEffect cleanup cancels async operations | WARN | State update on unmount |
| 379 | useEffect doesn't update state that's in its deps | ERROR | Infinite loop |
| 380 | useEffect with timer sets up cleanup | WARN | Memory leak |
| 381 | useEffect with subscription has unsubscribe | WARN | Memory leak |
| 382 | useEffect with event listener has removal | WARN | Memory leak |
| 383 | useLayoutEffect not used unnecessarily | WARN | Blocks paint |
| 384 | setInterval paired with clearInterval | WARN | Memory leak |
| 385 | setTimeout paired with clearTimeout on unmount | WARN | State update after unmount |
| 386 | AbortController used for fetch cancellation | WARN | Race conditions |
| 387 | Optimistic updates rolled back on error | WARN | Inconsistent UI |
| 388 | Loading states properly managed | WARN | No feedback |
| 389 | Error states properly managed | WARN | Silent failures |
| 390 | Transition states used for non-urgent updates | WARN | Janky UI |
| 391–400 | (Additional pattern checks) | VARIES | Various issues |

---

## Category 7: State Management (Checks 401–440)

| # | Check | Severity | What Breaks |
|---|-------|----------|-------------|
| 401 | useState setter name matches `set` + state name | ERROR | TS2304 — THE SETTER BUG |
| 402 | All setState calls use the declared setter name | ERROR | TS2304 |
| 403 | No misspelled setter variants (e.g., `setQuickSMSSending` vs `setSendingQuickSMS`) | ERROR | TS2304 — EXACT BUG |
| 404 | Context providers wrap consuming components | WARN | Default values used |
| 405 | Global state changes don't cause unnecessary renders | WARN | Performance |
| 406 | Local state used instead of global when appropriate | WARN | Over-engineering |
| 407 | Form state properly managed (controlled vs uncontrolled) | WARN | Input issues |
| 408 | URL state synced with React state when needed | WARN | State lost on refresh |
| 409 | Server state cached/invalidated properly | WARN | Stale data |
| 410 | State initialization doesn't cause hydration mismatch | ERROR | React hydration error |
| 411–440 | (Additional state checks for stores, context, lifting state) | VARIES | Various |

---

## Categories 8–18: (Async, CSS, Env, Deps, API, Supabase, Security, A11y, Perf, Build, Git)

*Each category has 30–50 checks covering the specific domain. Full details are in the automated script. Key highlights:*

### Category 8: Async & Promises (441–490)
- Missing `await` on async operations
- `async` useEffect (not allowed)
- Unhandled promise rejections
- Race conditions in async state updates
- `Promise.all` error handling

### Category 9: CSS & Tailwind (491–530)
- Tailwind class typos
- Conflicting utility classes
- Dynamic class concatenation issues
- Inline style vs className consistency
- CSS-in-JS type correctness

### Category 10: Environment & Config (531–570)
- `NEXT_PUBLIC_` prefix for client env vars
- Missing env vars referenced in code
- `next.config.js` syntax valid
- `tsconfig.json` strict mode
- `package.json` build script exists

### Category 11: Dependencies (571–600)
- Missing packages used in imports
- Lock file conflicts (npm + yarn)
- Peer dependency mismatches
- Deprecated packages
- Dev vs prod dependency placement

### Category 12: API & Data (601–650)
- App Router response format (`NextResponse.json()`)
- CORS headers on mutation routes
- `request.json()` error handling
- No hardcoded localhost URLs
- Proper status code usage

### Category 13: Supabase (651–700)
- `.single()` on unique queries
- Error handling on all operations
- Auth checks in API routes
- No hardcoded Supabase URLs
- RLS policy considerations

### Category 14: Security (701–740)
- No hardcoded secrets/API keys
- XSS prevention (`dangerouslySetInnerHTML`)
- CSRF protection
- Auth on mutation endpoints
- Input sanitization

### Category 15: Accessibility (741–770)
- Image alt text
- Form labels
- Button accessibility
- Keyboard navigation
- ARIA attributes

### Category 16: Performance (771–810)
- File size limits (>2000 lines = split)
- Inline object re-creation in JSX
- Heavy library alternatives
- Memory leak prevention (intervals, listeners)
- Bundle size awareness

### Category 17: Build & Deploy (811–860)
- TypeScript compilation (`tsc --noEmit`)
- Next.js build simulation
- Static file sizes
- Vercel output limits
- Config file validation

### Category 18: Git & Version Control (861–900+)
- `.gitignore` completeness
- Merge conflict markers
- Debug statement count
- TODO/FIXME audit
- Commit hygiene

---

## Quick Reference: The Bugs We Actually Hit

| Bug | Check # | What Happened | Root Cause |
|-----|---------|---------------|------------|
| `setQuickSMSSending` not found | 401–403 | useState declared `sendingQuickSMS` but called `setQuickSMSSending` | Setter name mismatch |
| `handleLogSMSCommunication` before declaration | 66–69 | `useCallback` at line 397 referenced a `const` at line 996 | Block-scoped before declaration |
| `problemsMedications.allergies` doesn't exist | 86–87 | Accessed `.allergies` on hook that doesn't have that property | Property not on type |
| Extra `)` and `}` at EOF | 1–6 | File had orphaned closing brackets at bottom | Bracket imbalance |
| `null !== undefined` is `true` | 64 | Supabase `null` columns passed `!== undefined` check | Wrong equality check |
| React setState is async | 372 | Read state immediately after `setState` — got stale value | Async state update |

---

## Installation Files

| File | Purpose | Install Location |
|------|---------|------------------|
| `vercel-proof.sh` | Main verification script (500+ checks) | Project root |
| `pre-push` | Git hook — blocks push on errors | `.git/hooks/pre-push` |
| `vercel-proof-setup.sh` | One-command installer | Project root (run once) |
| `VERCEL-PROOF-CHECKLIST.md` | This document — full reference | Project root |

---

*VERCEL-PROOF™ v2.0 — Built from real Vercel failures, not theory.*
