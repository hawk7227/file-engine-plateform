# 🏗️ FILE ENGINE PLATFORM — MASTER REFERENCE

> **For every AI contributor, every session, every commit.**
> Read this file first. No exceptions. No shortcuts.

---

## ⚡ BUILD GATE — RUNS BEFORE EVERY SINGLE COMMIT

```bash
npm run build        # ✓ Compiled successfully — zero errors required
npx tsc --noEmit     # zero output = zero type errors
npx playwright test  # all E2E tests must pass
```

**All three pass = allowed to commit. Any one fails = fix first.**

---

## 🚫 LOCKED FILES — DO NOT TOUCH WITHOUT MARCUS APPROVAL

| File | Why It's Locked |
|------|----------------|
| `src/lib/supabase/client.ts` | Fixes `navigator.locks` deadlock — uses `fe-auth-v3` storageKey + lock override. The hang is gone. Don't reintroduce it. |
| `src/lib/supabase.ts` | Lazy proxy singleton — prevents double Supabase init on SSR/CSR boundary. |
| `src/app/admin/workplace/page.tsx` | Uses mock user + raw GoTrue REST auth (bypasses Supabase JS SDK entirely). DO NOT add Supabase SDK auth back until `navigator.locks` is 100% resolved. |

---

## 📁 PROJECT STRUCTURE — EVERY FILE, WHAT IT DOES

### `src/app/` — Next.js Pages & API Routes

#### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/` | `page.tsx` | Public landing page with typing animation, pricing CTAs |
| `/pricing` | `pricing/page.tsx` | Plan comparison — Free / Pro / Enterprise |
| `/dashboard` | `dashboard/page.tsx` | User project list + quick-start |
| `/dashboard/[chatId]` | `dashboard/[chatId]/page.tsx` | Individual chat session view |
| `/projects/[id]` | `projects/[id]/page.tsx` | Project detail with file tree |
| `/system-status` | `system-status/page.tsx` | **Admin-only** health dashboard — auto-refreshes every 30s, fails red |
| `/admin` | `admin/page.tsx` | Admin control panel — users, keys, analytics |
| `/admin/workplace` | `admin/workplace/page.tsx` | **Main IDE** — loads `WorkplaceLayout` via dynamic import. Uses raw GoTrue REST auth (no SDK). Mock user fallback for dev. |
| `/auth/login` | `auth/login/page.tsx` | Email/password login form |
| `/auth/signup` | `auth/signup/page.tsx` | New account creation |
| `/auth/forgot-password` | `auth/forgot-password/page.tsx` | Password reset request |
| `/auth/reset-password` | `auth/reset-password/page.tsx` | Set new password (token from email) |
| `/auth/verify-otp` | `auth/verify-otp/page.tsx` | OTP verification step |
| `/contact` | `contact/page.tsx` | Contact form → email delivery |

#### API Routes — Code Generation Core
| Endpoint | File | What It Does |
|----------|------|-------------|
| `POST /api/generate` | `api/generate/route.ts` | Basic AI code generation. Auth required. Validates input via Zod. Returns parsed code blocks. |
| `POST /api/generate-validated` | `api/generate-validated/route.ts` | **10-layer validated generation** — AI generates → validate → auto-fix loop → returns clean code. `maxDuration: 120`. Rate-limited. |
| `POST /api/chat` | `api/chat/route.ts` | **Agentic streaming chat** — JWT decoded locally (zero latency), tool-use loop, white-labeled (no provider names exposed), streaming SSE response. Anonymous users allowed with degraded features. |
| `GET /api/validate` | `api/validate/route.ts` | Validates code quality without generation |

#### API Routes — File Engine Operations
| Endpoint | File | What It Does |
|----------|------|-------------|
| `POST /api/file-engine/auto-fix` | `api/file-engine/auto-fix/route.ts` | AI-powered auto-fix loop for build errors |
| `POST /api/file-engine/user-fix` | `api/file-engine/user-fix/route.ts` | Apply user-requested fix to specific file |
| `POST /api/file-engine/verify-build` | `api/file-engine/verify-build/route.ts` | Run build verification check on project |
| `POST /api/file-engine/push-github` | `api/file-engine/push-github/route.ts` | Push generated files to GitHub repo |
| `POST /api/file-engine/deploy-vercel` | `api/file-engine/deploy-vercel/route.ts` | Trigger Vercel deployment |
| `POST /api/file-engine/deploy-both` | `api/file-engine/deploy-both/route.ts` | GitHub push + Vercel deploy in sequence |

#### API Routes — Admin
| Endpoint | File | What It Does |
|----------|------|-------------|
| `GET/POST/DELETE /api/admin/keys` | `api/admin/keys/route.ts` | **API Key Manager** — list/create/delete keys. AES-256 encryption. Admin-only (profile check + `X-Admin-Secret` header). |
| `GET /api/admin/keys/debug` | `api/admin/keys/debug/route.ts` | Diagnose key storage issues — shows table state, encryption status |
| `GET /api/admin/health` | `api/admin/health/route.ts` | Detailed service health — Supabase, AI providers, queues |
| `GET/POST /api/admin/permissions` | `api/admin/permissions/route.ts` | Feature flag management — grant/revoke per user |
| `GET/PUT /api/admin/settings` | `api/admin/settings/route.ts` | Global platform settings |
| `POST /api/admin/ai-edit` | `api/admin/ai-edit/route.ts` | Admin-triggered AI code editing |

#### API Routes — Conversations
| Endpoint | File | What It Does |
|----------|------|-------------|
| `GET/POST /api/conversations` | `api/conversations/route.ts` | List or create conversations |
| `GET/PATCH/DELETE /api/conversations/[id]` | `api/conversations/[id]/route.ts` | Single conversation CRUD |
| `GET/POST /api/conversations/[id]/messages` | `…/messages/route.ts` | Message history for a conversation |
| `DELETE /api/conversations/[id]/messages/[messageId]` | `…/[messageId]/route.ts` | Delete single message |
| `PATCH /api/conversations/[id]/title` | `…/title/route.ts` | Rename conversation |
| `GET /api/conversations/search` | `…/search/route.ts` | Full-text search across messages |

#### API Routes — Infrastructure
| Endpoint | File | What It Does |
|----------|------|-------------|
| `GET /api/system-status` | `api/system-status/route.ts` | **JSON health endpoint** — checks Supabase, AI keys, queue, disk. Returns `{ status: 'healthy'|'degraded'|'down', checks: [...] }`. Admin-only. |
| `GET /api/status` | `api/status/route.ts` | Public minimal status — `{ ok: true }` |
| `GET /api/usage` | `api/usage/route.ts` | User usage stats — builds today, tokens, limits |
| `GET /api/queue/stats` | `api/queue/stats/route.ts` | Queue depth (disabled — returns `queuesEnabled: false`) |
| `POST /api/pb-image-gen` | `api/pb-image-gen/route.ts` | **Replicate proxy** — browser can't call Replicate (CORS). This server-side proxy creates prediction + polls until done. `maxDuration: 90`. |
| `GET /api/github/tree` | `api/github/tree/route.ts` | Fetch file tree from GitHub repo |
| `GET /api/github/file` | `api/github/file/route.ts` | Fetch single file content from GitHub |
| `GET /api/download` | `api/download/route.ts` | Download project as ZIP. `maxDuration: 60`. |
| `POST /api/deploy` | `api/deploy/route.ts` | Trigger deployment |
| `POST /api/checkout` | `api/checkout/route.ts` | Stripe checkout session creation |
| `POST /api/webhook/stripe` | `api/webhook/stripe/route.ts` | Stripe webhook handler — updates subscription records |
| `POST /api/sandbox/create` | `api/sandbox/create/route.ts` | Create isolated code sandbox |
| `POST /api/sandbox/execute` | `api/sandbox/execute/route.ts` | Execute code in sandbox. `maxDuration: 120`. |
| `GET /api/sandbox/status` | `api/sandbox/status/route.ts` | Poll sandbox execution status |
| `GET /api/sandbox/files` | `api/sandbox/files/route.ts` | List files in sandbox |
| `GET /api/builds` | `api/builds/route.ts` | Build history for user |
| `GET /api/builds/[id]/status` | `api/builds/[id]/status/route.ts` | Poll build status |
| `POST /api/fetch-url` | `api/fetch-url/route.ts` | Server-side URL fetch (bypasses client CORS) |
| `POST /api/contact` | `api/contact/route.ts` | Contact form submission handler |
| `GET/POST /api/projects` | `api/projects/route.ts` | Project CRUD |
| `GET/POST /api/project-files` | `api/project-files/route.ts` | Files within a project |
| `GET /api/chats` | `api/chats/route.ts` | Saved chat history |
| `GET /api/team` | `api/team/route.ts` | Team members for workspace |
| `POST /api/ai/fix-errors` | `api/ai/fix-errors/route.ts` | AI error fixer endpoint |
| `POST /api/ai/vision` | `api/ai/vision/route.ts` | Vision analysis (image → text) |
| `GET /api/knowledge/search` | `api/knowledge/search/route.ts` | Semantic knowledge base search |
| `POST /api/memory/bootstrap` | `api/memory/bootstrap/route.ts` | Initialize user memory context |
| `POST /api/memory/update` | `api/memory/update/route.ts` | Update memory with new context |
| `POST /api/audit` | `api/audit/route.ts` | Log audit events |
| `GET /api/media` | `api/media/route.ts` | Media file serving |
| `GET /api/user/settings` | `api/user/settings/route.ts` | User preferences CRUD |
| `GET /api/search/web` | `api/search/web/route.ts` | Web search integration |
| `GET /api/debug` | `api/debug/route.ts` | Dev diagnostic endpoint — env var checks |

---

### `src/components/workplace/` — The IDE

#### 🏛️ `WorkplaceLayout.tsx` — 1,095 lines — **Main IDE Orchestrator**
**The root component. Owns all state. Passes props down to every panel.**

| Feature | How It Works |
|---------|-------------|
| **Left Panel** | Fixed 300px wide. Contains: tool rail (40px) + tab bar + active tab content. Horizontally resizable via drag handle. |
| **Center Canvas** | `WPPreviewCanvas` — device frame preview. Expands to fill remaining space. |
| **Bottom Panel** | Collapsible. Default 48px (collapsed). Drag handle to expand. Contains doc/code/console/diff tabs. |
| **Tool Rail** | 40px vertical strip on far left. 8 icon buttons. See tool rail table below. |
| **Tool Panels** | Slide-in overlay panels (240px wide) anchored to tool rail. Contain: Device/Zoom, Theme, Admin Keys, Settings. |
| **GitHub Connection** | `owner/repo/branch` stored in `localStorage`. Used by File Editor for live file browsing. |
| **Preview URL** | Optional live URL overrides Babel preview — points iframe at real staging server. |
| **Page Builder Toggle** | ⊞ button in tool rail — mounts `WPPageBuilder` over the center canvas. |
| **Real-time Presence** | `useWorkspaceRealtime` — shows team members, cursors, active files via Supabase Realtime. |
| **Toast System** | Fixed bottom-right stack. 3s auto-dismiss. `toast(title, msg, type)` function. |
| **Mobile Responsive** | Sidebar becomes fixed overlay at `≤768px`. Hamburger toggle. |

**Left Panel Tabs:**

| Tab | Icon | Component | What It Shows |
|-----|------|-----------|---------------|
| Chat | 💬 | `WPChatPanel` | AI chat — send messages, see streaming responses, generated files |
| Routes | 🗂 | `WPRoutesPanel` | All app routes with live/WIP status — click to open file |
| Video | 🎬 | `WPVideoStudio` | Video generation prompt UI (pipeline placeholder) |
| Images | — | `WPImageStudio` | Image generation prompt UI (pipeline placeholder) |
| Team | 👥 | `WPTeamPanel` | Live presence — who's online, what file they're editing |

**Tool Rail Buttons (left-to-right, top to bottom):**

| Icon | Title | What It Does |
|------|-------|-------------|
| 📱 | Device & Zoom | Opens Device panel — pick device, set zoom level |
| ＋ | Zoom In | Increase preview zoom by 10% |
| － | Zoom Out | Decrease preview zoom by 10% |
| `%` | Zoom: X% | Shows current zoom. Click to reset to 100%. |
| ↻ | Rotate landscape | Toggle portrait/landscape on phone/tablet devices |
| 🌐 | Browser overlay | Toggle floating Chrome browser overlay on canvas |
| 📂 | Open file from device | Upload local file → opens in File Editor, fetches import tree from GitHub |
| 🎨 | Theme | Opens Theme panel — color scheme picker (9 schemes) |
| 🔑 | Admin Keys | Opens Admin Keys panel — manage encrypted API keys |
| ⚙️ | Settings | Opens Settings panel — GitHub config, preview URL |
| ⊞ | Page Builder | Toggle Page Builder mode — full visual editor takes over center canvas |

**Device List:**

| ID | Name | Viewport | Frame Type |
|----|------|----------|-----------|
| `se` | iPhone SE | 375×667 | Home button |
| `14pm` | iPhone 14 Pro Max | 430×932 | Dynamic Island |
| `15pro` | iPhone 15 Pro | 393×852 | Dynamic Island |
| `16pm` | iPhone 16 Pro Max | 440×956 | Dynamic Island |
| `pixel` | Pixel 8 | 412×915 | Android |
| `galaxy` | Galaxy S24 | 360×780 | Android |
| `ipad` | iPad Air | 820×1180 | Tablet |
| `chrome` | Chrome Browser | 1280×800 | Browser chrome |

**Bottom Panel Tabs:**

| Tab ID | Label | Component | What It Shows |
|--------|-------|-----------|---------------|
| `sql` | SQL | `WPDocViewer` | SQL query editor + table browser |
| `md` | MD | `WPDocViewer` | Markdown editor with live preview |
| `doc` | Doc | `WPDocViewer` | Document viewer |
| `git` | Git | `WPDocViewer` | Git log / diff viewer |
| `diff` | Diff | `WPDiffPreview` | Pre-edit diff approval — Approve/Reject before AI writes |
| `logs` | Logs | `WPDocViewer` | System logs viewer |
| `console` | Console | `WPConsolePanel` | Captures `console.log/warn/error` from preview iframe |

---

#### 💬 `WPChatPanel.tsx` — 282 lines — **AI Chat Interface**
**Streaming chat UI. Receives hook props from WorkplaceLayout.**

| Feature | How It Works |
|---------|-------------|
| **Message rendering** | Maps `messages[]` — user bubbles right, AI bubbles left. No role labels. No avatars. Clean. |
| **Streaming cursor** | Blinking `▋` appended to last token while streaming |
| **Generated files** | Files from AI appear as chips below message — click to open in File Editor |
| **Auto-scroll** | `useEffect` scrolls to bottom on every new message |
| **Auto-grow textarea** | Textarea expands up to 160px as user types |
| **Keyboard shortcuts** | `Enter` = send. `Shift+Enter` = new line. |
| **Attach files** | `AttachButton` — supports PDF, images, ZIP, code files |
| **Model selector** | Dropdown — `auto` / `claude-sonnet-4` / `claude-opus-4` / `gpt-4o` etc. White-labeled. |
| **Conversation history** | `WPSidebar` — previous chats via `useConversation` |

---

#### 📝 `WPFileEditor.tsx` — 637 lines — **GitHub-Connected File Browser + Editor**
**Browse any GitHub repo, edit files, save back. Fully connected.**

| Feature | How It Works |
|---------|-------------|
| **File tree** | `GET /api/github/tree` → renders expandable tree of repo files |
| **File open** | Click file → `GET /api/github/file` → loads content into Monaco editor |
| **Live editing** | Monaco editor (same as Page Builder). Changes tracked in state. |
| **Save back** | `PUT /api/github/file` via `deploy.ts` — commits directly to GitHub branch |
| **Open from device** | Triggered by WorkplaceLayout's layout upload ref — opens local file |
| **Download** | Downloads current file content as local file |
| **Import tree** | When file opened, `dependency-resolver.ts` walks import graph and fetches all local deps |
| **Diff preview** | Before saving, shows `WPDiffPreview` for approval |
| **Unsaved indicator** | Dot on tab when file has unsaved changes |

---

#### 🖼️ `WPPreviewCanvas.tsx` — 389 lines — **Device Frame Preview**
**Renders any HTML/TSX inside accurate device frames with safe zones.**

| Feature | How It Works |
|---------|-------------|
| **Preview sources** | 1) Generated HTML from chat, 2) Uploaded file assembled by `preview-assembler.ts`, 3) Live preview URL |
| **Device frames** | CSS-drawn frames matching real device bezels. Dynamic Island / notch / home button variants. |
| **Safe area CSS vars** | Injects `--sat/--sab/--sal/--sar` CSS vars into iframe on every device change |
| **Zoom** | CSS `transform: scale(zoom)` on iframe wrapper |
| **Rotation** | Swaps `cssW/cssH` and safe area values on landscape toggle |
| **Browser overlay** | Floating Chrome-style address bar overlay for web preview |
| **Inspector** | `injectInspector()` injects click-to-inspect overlay into iframe — element click postMessages back to visual editor |
| **postMessage bridge** | Two-way: inspector sends `fe-element-selected`, visual editor sends `fe-apply-style` / `fe-apply-text` |

---

#### ✏️ `WPVisualEditor.tsx` — 525 lines — **Webflow-style Visual Edit Panel**
**Click element in preview → edit properties → changes write back to source.**

| Feature | How It Works |
|---------|-------------|
| **Element selection** | User clicks element in preview iframe. Inspector postMessages `{ uid, tag, text, rect, style }` to parent. |
| **Style editing** | Color, fontSize, fontWeight, padding, margin, borderRadius inputs. Live preview on change. |
| **Text editing** | Inline text edit — updates element text in preview instantly |
| **Write-back** | `visual-edit-patcher.ts` — finds element in source file by tag+text locator, injects/merges inline style |
| **Diff before apply** | Accumulates edits, shows full diff in `WPDiffPreview` before writing to GitHub |
| **Undo** | Edit history stack — Ctrl+Z reverts last change |

---

#### 🔍 `WPDiffPreview.tsx` — 263 lines — **Pre-Edit Diff Approval**
**Shows exactly what will change before any edit is applied. User must approve.**

| Feature | How It Works |
|---------|-------------|
| **Side-by-side diff** | Original left, proposed right. Line-level highlights. |
| **Inline diff** | Toggle to unified diff view |
| **Approve** | `onApprove()` → writes changes, closes panel |
| **Reject** | `onReject()` → discards changes, no file touched |
| **File info** | Shows filename, line count delta, change summary |

---

#### 🏗️ `WPPageBuilder.tsx` — 1,348 lines — **Visual Page Builder**
**Full standalone visual builder inside the workplace. Own device frames, own editor, own AI.**

**Four Modes (tab bar at top):**

##### 🔵 Preview Mode
| Feature | How It Works |
|---------|-------------|
| **Device frames** | 14 devices across iPhone / Android / iPad / Desktop groups. Own device database with spec-accurate safe zones. |
| **Safe zone overlay** | Toggle — red highlight shows status bar / home indicator / notch areas |
| **Browser chrome** | Toggle — shows browser address bar simulation |
| **Zoom controls** | ＋/－/reset. Device frame scales with CSS transform. |
| **Rotation** | Swaps portrait/landscape with correct safe area values |
| **Live preview** | iframe renders code. Updates within 400ms debounce of code change. |
| **Safe area CSS injection** | `--sat/--sab/--sal/--sar` injected into iframe `<head>` on every device/rotation change |

##### 🟠 Editor Mode
| Feature | How It Works |
|---------|-------------|
| **Monaco editor** | Loaded from CDN (`cdnjs.cloudflare.com/monaco-editor/0.45.0`). TypeScript language. Dark theme. |
| **CDN failure fallback** | `script.onerror` → `monacoLoadFailed = true` → fallback textarea shown with amber warning banner |
| **Dedup guard** | `data-monaco` attribute on script tag — second toggle never injects duplicate `<script>` |
| **Stale closure fix** | `codeRef` mirrors `code` state. `initMonaco` reads `codeRef.current` — dep array is `[]` — no recreation on keystroke. |
| **Fallback textarea** | Always available if Monaco fails. Full editing capability. |
| **Code → preview** | `useEffect` on `code` state — 400ms debounce → `preview-assembler.ts` → iframe |
| **Download** | Download current code as `.tsx` file |
| **Resize handle** | Drag `.pb-resize-h` to adjust editor/preview split |
| **Filename** | Editable filename used for download and code gen context |

##### 🟣 Analyzer Mode
| Feature | How It Works |
|---------|-------------|
| **Image drop zone** | Drag & drop or click to upload any image |
| **AI analysis (OpenAI)** | GPT-4o vision — extracts design tokens as JSON: colors, typography, spacing, shadows |
| **AI analysis (Claude)** | Claude vision fallback — same JSON extraction prompt |
| **Standalone analysis** | No AI needed. Canvas pixel sampling: resize to 200px max → sample all pixels → quantize to 32-step RGB buckets → top 12 colors → infer usage from luminance (>0.85=background, <0.15=text, 0=dominant, else=accent) |
| **Token display** | Color swatches, typography scale, spacing tokens — all extracted and shown |
| **Generate code** | Takes extracted tokens → AI generates pixel-perfect TSX component → loads into Editor mode |
| **Standalone TSX gen** | No AI needed — `generateTSXStandalone()` builds template React component from extracted tokens |

##### 🟢 Image Gen Mode
| Feature | How It Works |
|---------|-------------|
| **Prompt input** | Textarea. `Cmd+Enter` to generate. Button disabled when empty. |
| **DALL-E 3** | Direct browser → `api.openai.com/v1/images/generations`. `model: dall-e-3`, `size: 1024x1024`, `quality: hd`, `response_format: b64_json`. Returns `data:image/png;base64,...` |
| **Stability AI SD3.5** | Direct browser → `api.stability.ai/v2beta/stable-image/generate/sd3`. FormData. `model: sd3.5-large`. |
| **Replicate FLUX** | Browser → `/api/pb-image-gen` proxy (CORS workaround) → Replicate API → polls until done |
| **AbortController** | Every request wrapped. Previous request aborted on new request. Unmount cleanup. No stale state. |
| **Result display** | Image preview + Download PNG button + "Analyze This Image" button (routes to Analyzer) |
| **Error messages** | Standalone mode → clear message explaining which key to add. API errors → full message shown. |

**Provider System:**

| Provider | Priority | Coverage |
|----------|----------|----------|
| OpenAI | Primary | Text completion, vision analysis, DALL-E 3 image gen |
| Claude | Fallback | Auto-used if OpenAI disabled or fails. Text + vision. |
| Standalone | Always available | Canvas pixel sampling + template TSX. Zero API calls. |

| Setting | Stored In | Key |
|---------|-----------|-----|
| All provider config | `localStorage` | `pb-ai-provider-config` |
| OpenAI enabled + key | localStorage | in config object |
| Claude enabled + key | localStorage | in config object |
| Image provider | localStorage | `imageProvider: 'dalle3'|'stability'|'replicate'|'none'` |
| Stability / Replicate keys | localStorage | in config object |

---

#### 🔑 `WPAdminKeysPanel.tsx` — 353 lines — **API Key Manager**
**Add, edit, delete encrypted API keys. Stable layout — no reflow on edit.**

| Feature | How It Works |
|---------|-------------|
| **List keys** | `GET /api/admin/keys` → shows masked keys (last 4 chars visible) |
| **Add key** | Form → `POST /api/admin/keys` → AES-256-GCM encrypted in Supabase |
| **Edit key** | Row slides open in-place. Same row height — no layout jump. |
| **Save key** | `PUT /api/admin/keys` → re-encrypts and updates |
| **Delete key** | `DELETE /api/admin/keys` with confirmation |
| **Auth** | Requires `ADMIN_SECRET` header + admin profile check |
| **Key providers** | `anthropic` / `openai` / `stability` / `replicate` / custom |

---

#### 🎨 `WPThemePanel.tsx` — 99 lines — **Color Scheme Picker**
**9 built-in themes. Switch live. Persisted in localStorage.**

| Theme | Style |
|-------|-------|
| midnight | Default dark — deep navy base |
| carbon | Pure black terminal |
| slate | Cool grey professional |
| forest | Deep green natural |
| ocean | Deep teal/blue |
| rose | Warm rose dark |
| violet | Purple tech |
| amber | Warm amber dark |
| light | Light mode — white base |

---

#### 🗂️ `WPSidebar.tsx` — 275 lines — **Conversation History Sidebar**
**Claude-style collapsible navigation. Shows all past conversations.**

| Feature | How It Works |
|---------|-------------|
| **Conversation list** | `useConversation` → loads history from Supabase |
| **New chat** | Creates new conversation record, clears message state |
| **Search** | Filter conversations by title |
| **Rename** | Inline edit on conversation title |
| **Delete** | Remove conversation + all its messages |
| **Pin** | Pin conversation to top of list |
| **Collapse** | Slides off-screen. Backdrop click closes. Animated. |

---

#### 🖥️ `WPConsolePanel.tsx` — 121 lines — **Preview Console**
**Captures `console.log/warn/error` from the preview iframe. Shows in bottom panel.**

| Feature | How It Works |
|---------|-------------|
| **Message capture** | `preview-assembler.ts` injects `postMessage` shim into every preview. Intercepts `console.log/warn/error`. |
| **Display** | Color-coded: log=white, warn=amber, error=red |
| **Clear** | Button to clear all messages |
| **Auto-scroll** | Scrolls to latest on new message |
| **`useConsoleCapture`** | Custom hook exported alongside component. Used by WorkplaceLayout to pass messages down. |

---

#### 📋 Other Workplace Components

| Component | Lines | Purpose |
|-----------|-------|---------|
| `WPRoutesPanel.tsx` | 55 | Route map — all app pages with live/WIP status |
| `WPVideoStudio.tsx` | 72 | Video gen UI placeholder — prompt input + settings |
| `WPImageStudio.tsx` | 99 | Image gen UI — prompt + style settings (separate from Page Builder) |
| `WPTeamPanel.tsx` | 118 | Live presence — avatars, online status, active file per member |
| `WPActivityFeed.tsx` | 144 | Real-time activity — edits, deploys, chat, system events. Filterable. |
| `WPDocViewer.tsx` | 255 | Bottom panel — SQL/MD/Git/Log viewers with tab switching |
| `WPCodeOutput.tsx` | — | Code output panel — shows generated code with syntax highlight |
| `WPChatThemeOverride.tsx` | — | Injects theme CSS vars scoped to chat panel |
| `WPChatFontSizer.tsx` | — | Font size control for chat messages |
| `WPToolbar.tsx` | — | Legacy toolbar (removed — controls now in sidebar) |

---

### `src/lib/` — Core Libraries

#### 🤖 AI & Generation

| File | Lines | Purpose |
|------|-------|---------|
| `ai.ts` | 227 | **AI provider abstraction** — `generate(prompt, model)`. Supports Claude Sonnet 4, Opus 4, Haiku, GPT-4o, GPT-4o-mini, o1. Model map to actual API strings. |
| `ai-config.ts` | 289 | White-label AI config — no provider names in user-facing text. System prompts, context window limits, capability flags per model. |
| `ai-fixer.ts` | — | AI-powered error fixer — takes build error → generates targeted fix |
| `pb-ai-provider.ts` | 632 | **Page Builder client-side AI** — `aiComplete()`, `aiVision()`, `generateImage()`, `extractTokensStandalone()`, `generateTSXStandalone()`. OpenAI→Claude→Standalone priority chain. |
| `orchestrator.ts` | — | Multi-step agentic orchestration — chains tool calls, manages context |
| `tools.ts` | — | Tool definitions for agentic chat — file operations, search, sandbox |
| `smart-prompts.ts` | — | Context-aware prompt construction |
| `smart-context.ts` | — | Context window management — summarization, pruning |
| `vision.ts` | — | Vision analysis helpers — image → text descriptions |

#### 🔑 Key Management & Auth

| File | Lines | Purpose |
|------|-------|---------|
| `key-pool.ts` | 399 | **Multi-key pool manager** — loads keys from env vars + Supabase. Round-robin across keys. Marks rate-limited keys. Failover to next available key. Supports Anthropic + OpenAI pools. |
| `permissions.ts` | 442 | **Feature flag system** — `hasFeature(userId, feature)` server-side check. In-memory cache (5min TTL). Timeout protection on all DB calls. Batch check. |
| `supabase.ts` | — | Lazy proxy singleton — `getUser()`, `getProfile()`, `getSubscription()`. Prevents double-init. **DO NOT MODIFY** |
| `supabase/client.ts` | — | Browser Supabase client — `fe-auth-v3` storageKey + navigator.locks override. **DO NOT MODIFY** |
| `supabase/server.ts` | — | Server-side Supabase client factory |

#### ✅ Validation & Quality

| File | Lines | Purpose |
|------|-------|---------|
| `validation.ts` | 1,576 | **10-layer code validator** — Syntax (AST) → TypeScript types → Import resolution → React/JSX → Dependencies → Security → Performance → Style → Completeness → Integration. Returns error list with severity + fix suggestions. |
| `schemas.ts` | — | Zod schemas for all API request bodies. `parseBody()`, `parseGenerateRequest()` etc. All API routes use these. |
| `env.ts` | 71 | **Env validation on boot** — checks all required vars. Throws in production if missing. |

#### 🚀 Deploy & GitHub

| File | Lines | Purpose |
|------|-------|---------|
| `deploy.ts` | 560 | GitHub API + Vercel API integration. `pushToGitHub()`, `deployToVercel()`, `createPR()`. |
| `file-engine/github-api.ts` | — | GitHub REST API wrapper — file CRUD, tree listing, commit operations |
| `file-engine/vercel-api.ts` | — | Vercel deployment API — trigger deploy, check status |
| `file-engine/auto-fix-engine.ts` | — | Automated build error → fix → re-verify loop |
| `file-engine/preview-manager.ts` | — | Manage preview URLs per project |

#### 🏗️ Preview & Assembly

| File | Lines | Purpose |
|------|-------|---------|
| `preview-assembler.ts` | 698 | **Self-contained HTML builder** — Takes `GeneratedFile[]` → builds single HTML with React+Babel CDN loaded, all components inlined, external imports CDN-mapped or stubbed. Injects console capture + inspector overlay. |
| `dependency-resolver.ts` | 155 | **Import graph walker** — given root file + GitHub repo, fetches all local imports recursively. Returns flat `{ path → content }` map. Only resolves local (`./`, `../`, `@/`) — external packages handled by preview-assembler CDN layer. |
| `visual-edit-patcher.ts` | 125 | **AST-free style patcher** — finds element in source by tag+text locator, injects/merges `style=` attribute. Works on TSX and HTML. |

#### 💳 Billing

| File | Lines | Purpose |
|------|-------|---------|
| `stripe.ts` | 22 | Stripe client init + price IDs + `createCheckout()` |
| `stripe-billing.ts` | — | Subscription management — create, update, cancel, webhook handling |
| `usage-limits.ts` | — | Per-user rate limiting + usage tracking. `checkUsageAndRateLimit()`, `recordUsage()`. |

#### 🎨 UI Utilities

| File | Lines | Purpose |
|------|-------|---------|
| `theme-engine.ts` | — | 9 color schemes. `applyTheme()`, `saveThemeId()`. CSS var injection. |
| `brand.ts` | 325 | **Single source of truth for branding** — `BRAND_NAME`, `BRAND_AI_NAME`, colors, URLs. White-label ready: change here → entire platform updates. |
| `utils.ts` | — | General utilities — `cn()`, date formatting, string helpers |

#### Other Lib Files

| File | Purpose |
|------|---------|
| `analytics.ts` | Event tracking — page views, generation events |
| `audit.ts` | Audit log writer — records admin actions |
| `artifacts.ts` | Code artifact management |
| `batch-operations.ts` | Batch Supabase operations |
| `context.ts` | Conversation context management |
| `db-fields.ts` | DB field constants — column names as type-safe strings |
| `export.ts` | Project export helpers |
| `knowledge-loader.ts` | Load knowledge base docs |
| `knowledge-retrieval.ts` | Semantic search over knowledge base |
| `media-route.ts` | Media file routing helpers |
| `media-tools.ts` | Media processing utilities |
| `memory.ts` | User memory context — persistent conversation context |
| `project-memory.ts` | Per-project memory — code context, file history |
| `queue.ts` | **Queue stub — DISABLED** (Redis not configured). Returns `disabled` status. All calls no-op. |
| `sandbox.ts` | Sandbox execution — `createSandbox()`, `executeSandbox()`. Supports E2B provider + mock provider. |
| `sandbox/e2b-provider.ts` | E2B cloud sandbox provider |
| `sandbox/mock-provider.ts` | Local mock sandbox for testing |
| `search.ts` | Web search integration |
| `semantic.ts` | Semantic similarity helpers |
| `skills.ts` | AI skill definitions |
| `team.ts` | Team management — invite, remove, role management |
| `team-collaboration.ts` | Real-time collaboration features |
| `vercel-proof.ts` | Vercel deployment verification |

---

### `src/hooks/` — React Hooks

| Hook | Lines | Purpose |
|------|-------|---------|
| `useAuth.tsx` | 118 | **Auth context** — `user`, `profile`, `subscription`, `loading`. Wraps app in `AuthProvider`. `useAuth()` anywhere for current user. |
| `useChat.ts` | 596 | **Core chat engine** — streaming SSE, tool-use handling, file accumulation, message history, model selection. Returns `{ messages, sendMessage, isStreaming, generatedFiles, ... }` |
| `useConversation.ts` | — | Conversation CRUD — create, load, rename, delete, archive. Syncs with Supabase. |
| `useGenerate.ts` | 276 | Code generation flow — calls `/api/generate-validated`, handles multi-file response, error states |
| `useFileEnginePreview.ts` | — | Preview + deploy flow — verify build → auto-fix loop → deploy. State machine. |
| `useFileUpload.ts` | — | File upload handling — ZIP extraction, type detection, Supabase storage upload |
| `useProjects.ts` | — | Project list with 5s timeout, retry, optimistic CRUD |
| `useBuilds.ts` | — | Build history — load, status polling |
| `useBuildStatus.ts` | — | Poll single build status — `queued → running → completed/failed` |
| `usePermissions.ts` | — | Feature flag client — `has('feature')`, `hasAll([...])`, `hasAny([...])`. Fails closed during load. |
| `useRealtime.ts` | — | Supabase Realtime — presence, broadcast, postgres changes |
| `useWorkspaceRealtime.ts` | — | Workplace-specific realtime — team presence, activity feed, cursor broadcast |
| `useQueueStats.ts` | — | Queue stats polling (returns disabled state) |
| `useSavedChats.ts` | — | Chat history with 5s timeout, retry, optimistic delete/rename |

---

### `src/middleware.ts` — Route Protection

**Protected routes** (redirect to login if no session):
`/dashboard`, `/projects`, `/settings`, `/admin`, `/api/projects`, `/api/builds`, `/api/chat`, `/api/deploy`, `/api/team`, `/api/admin`

**Auth routes** (redirect to dashboard if already logged in):
`/auth/login`, `/auth/signup`

**Public routes** (no auth check):
`/`, `/pricing`, `/api/webhook`

---

### `e2e/` — Playwright Tests

| File | What It Tests |
|------|--------------|
| `smoke.spec.ts` | Public pages load (login, signup). `/api/status` responds. |
| `api-health.spec.ts` | All API routes respond < 500. Auth-gated routes return 401. |
| `workplace-visual.spec.ts` | Workplace layout — all containers visible, tabs work, sidebar toggle, no console errors |
| `chat-autosave.spec.ts` | Chat messages persist, autosave to conversation |
| `dialogs.spec.ts` | Modal and dialog interactions |
| `provider-names.spec.ts` | No provider names (Claude/Anthropic/OpenAI) exposed in UI |
| `page-builder.spec.ts` | **Full Page Builder suite** — toggle, modes, provider pill, settings panel, preview, editor, safe zones, analyzer, image gen, API route, regressions (47 tests) |

---

## 🛡️ ARCHITECTURE RULES — HARD ENFORCED

### No Long-Running HTTP
- Default Vercel limit: **10 seconds**
- Exceptions with explicit `maxDuration`:
  - `generate-validated`: 120s (AI generation + 10-layer validation)
  - `sandbox/execute`: 120s (npm install + build)
  - `pb-image-gen`: 90s (Replicate polling)
  - `download`: 60s (ZIP assembly)
- **Everything else must complete in < 10s. No exceptions.**

### Schema Validation at Every Boundary
```typescript
// ✅ Every API route does this:
const body = await parseBody(req, parseGenerateRequest)
if (!body.success) return validationErrorResponse(body.error)
```

### Auth Pattern
```typescript
// Admin routes: profile check + optional secret header
const { data: { user } } = await supabase.auth.getUser(token)
if (!profile || profile.role !== 'admin') return 401

// Chat route: JWT decoded locally (zero latency)
const token = req.headers.get('Authorization')?.replace('Bearer ', '')
let userId = 'anonymous'
try { if (payload?.sub) userId = payload.sub } catch { }
```

### 4-State Component Rule
**Every component handles all four states:**
```typescript
if (loading) return <Spinner />
if (error) return <ErrorUI message={error} />
if (!data?.length) return <EmptyState />
return <SuccessContent data={data} />
```

### Fetch Discipline
```typescript
// Required on every long-running client fetch:
const controller = new AbortController()
useEffect(() => () => controller.abort(), [])
const res = await fetch('/api/...', { signal: controller.signal })
```

---

## ⚠️ KNOWN ISSUES & DEFERRED WORK

| Issue | Status | Notes |
|-------|--------|-------|
| **159 `any` violations** | Deferred | Was 247. Targeted 1-line fixes only. Do NOT full-rewrite. After all features complete. |
| **Queue disabled** | By design | Redis not configured. `queue.ts` is a null implementation. BullMQ ready to re-enable. |
| **Worker disabled** | By design | `worker.ts` is empty. Activates when queue activates. |
| **Admin-keys Save** | Needs live confirm | Code is correct. Needs verification in production Vercel deployment. |
| **DEV_EMAIL/DEV_PASSWORD in code** | Risk | `src/app/admin/workplace/page.tsx` lines 23-24 have fallback credentials. Should be env-var only. |

---

## 🚨 PRODUCTION RISKS

| Risk | Severity | File | Fix |
|------|----------|------|-----|
| Hardcoded fallback credentials | 🔴 High | `admin/workplace/page.tsx:23-24` | Remove fallback values — env vars only |
| Chat route allows anonymous users | 🟡 Medium | `api/chat/route.ts:936` | Intentional for demo. Premium models gated. |
| `generate-validated` maxDuration 120s | 🟡 Medium | API route | Exceeds Vercel Pro limit (60s). Needs Vercel Pro/Enterprise or refactor to queue. |
| No CSRF protection on mutations | 🟡 Medium | All POST routes | Supabase JWT mitigates but no explicit CSRF token |

---

## 📊 SYSTEM STATUS ENDPOINTS — ALWAYS ON

| URL | Auth | Returns |
|-----|------|---------|
| `/system-status` | Admin session | Visual dashboard — green/red per service |
| `/api/system-status` | Bearer token | JSON — `{ status, checks: [{ name, status, latency }] }` |
| `/public/build-report.json` | None (public) | `{ version, commit, branch, timestamp, status }` — auto-generated by `prebuild` script |

**These three must always work. Never remove. Never disable.**

---

## 📐 UI TOKEN SYSTEM — LOCKED VALUES

All UI must use these values only. No arbitrary values.

| Token | Values |
|-------|--------|
| **Spacing** | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 |
| **Radius** | 8, 12, 16, 20, 24, 999 |
| **Shadows** | `0 4px 14px rgba(0,0,0,.06)` / `0 10px 30px rgba(0,0,0,.08)` / `0 18px 60px rgba(0,0,0,.10)` |
| **Motion** | 150–220ms, `transform` + `opacity` only |
| **No inline styles** in feature code | Constitution §2 — use CSS classes |

---

## 🔁 COMMIT CONVENTION

```
feat(scope):   new feature
fix(scope):    bug fix
chore(scope):  tooling / config only
test(scope):   tests only
refactor:      no behavior change
docs:          documentation only
```

**One commit = one purpose. Atomic. Reviewable.**
