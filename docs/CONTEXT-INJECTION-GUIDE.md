# File Engine — AI Behavior Logic & Context Injection Guide

## Architecture Overview

```
User types message
        │
        ▼
┌─────────────────┐
│  classifyIntent  │  ← "build a login page" → generate_code
│  (0 tokens, 0ms) │  ← "explain useEffect"  → explain  
│                   │  ← "thanks!"            → general_chat
└────────┬──────────┘
         │
         ▼
┌─────────────────────┐
│  CONTEXT_BUDGETS     │  ← intent determines what to fetch
│  (lookup table)      │
└────────┬─────────────┘
         │
         ▼  Only fetch what's needed
┌─────────────────────────────────────────────┐
│  Parallel Supabase Queries (0-4 queries)    │
│                                              │
│  generate_code: style + prefs + files + corr │ ← 4 queries
│  fix_code:      style + files + corrections  │ ← 3 queries  
│  explain:       (nothing)                    │ ← 0 queries
│  general_chat:  (nothing)                    │ ← 0 queries
│  style_question: style + prefs               │ ← 2 queries
└────────┬─────────────────────────────────────┘
         │
         ▼  Compact format, skip defaults
┌──────────────────────────────────┐
│  Assemble Context                │
│                                  │
│  System prompt:  ~200 tokens     │ ← Compact (was 341)
│  Style overrides: 0-50 tokens    │ ← Only non-defaults (was 300)
│  Skill (if any):  0-250 tokens   │ ← Only if confidence > 0.3
│  Project files:   0-500 tokens   │ ← Truncated to signatures
│  Corrections:     0-100 tokens   │ ← Max 3-5 recent
│                                  │
│  TOTAL: 200-1100 tokens          │ ← Was 1349-2599
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  API Call (Claude or OpenAI)     │
│  via round-robin key pool        │
└──────────────────────────────────┘
```

---

## What Gets Injected Per Intent

| Intent | System Prompt | Coding Style | Preferences | Skills | Project Files | Corrections | DB Queries | Est. Tokens |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `general_chat` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 0 | ~200 |
| `explain` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 0 | ~200 |
| `deploy_action` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 0 | ~200 |
| `style_question` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 2 | ~280 |
| `project_question` | ✅ | ❌ | ❌ | ❌ | ✅ (names only) | ❌ | 1 | ~300 |
| `fix_code` | ✅ | ✅ | ❌ | ✅ | ✅ (500 chars) | ✅ (5) | 4 | ~900 |
| `generate_code` | ✅ | ✅ | ✅ | ✅ | ✅ (300 chars) | ✅ (3) | 4 | ~800 |
| `refactor` | ✅ | ✅ | ❌ | ✅ | ✅ (400 chars) | ❌ | 3 | ~700 |

**Old system:** Every request got 1349-2599 tokens of context + 4 DB queries.
**New system:** Simple questions get ~200 tokens + 0 DB queries.

---

## Supabase Storage Structure

### Table: `user_memories`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to auth.users |
| `type` | TEXT | `style`, `preference`, `correction`, `project`, `context`, `skill` |
| `category` | TEXT | Sub-grouping (e.g., `coding`, `app`, `user_feedback`) |
| `key` | TEXT | Specific item (e.g., `default`, `correction_1706123456`) |
| `value` | JSONB | The actual data |
| `confidence` | REAL | 0.0 = guess, 1.0 = user explicitly confirmed |
| `usage_count` | INTEGER | How many times this memory was used in context |
| `last_used` | TIMESTAMPTZ | For relevance ranking and cleanup |

### Key Records Per User

```
type: style      | key: default    → { indentation, quotes, framework, ... }
type: preference  | key: default    → { defaultModel, autoFix, commenting, ... }
type: correction  | key: corr_*    → { original, corrected, context }
type: project     | key: {projId}  → { name, type, framework, keyFiles }
type: context     | key: {convId}  → { summary, topics, decisions }
```

### What Does NOT Go In Supabase

- Full file contents (those stay in the `files` table per project)
- Chat message history (stays in the `messages` table or client state)
- API keys (stays in `profiles` table, encrypted at rest)
- Session state (stays in React state, not persisted per message)

---

## Rules for the AI (System Prompt Logic)

### The Compact System Prompt (200 tokens)

```
You are File Engine, an AI code generation assistant.

IDENTITY: You are "File Engine". Never mention Claude, GPT, OpenAI, Anthropic, or any other AI.

RULES:
- Generate complete, production-ready code
- TypeScript + Tailwind CSS by default
- Include error handling
- Be concise — explain decisions, not basics
- Code blocks with language tags
- Follow user's coding style when provided
```

**Why this is enough:** The models (Claude/GPT-4) already know React, TypeScript, Tailwind, Supabase, Next.js. You don't need to teach them. The system prompt just sets identity + overrides their defaults. Everything else comes from the smart context injection.

### What the Skills System Adds (When Triggered)

Skills only inject when:
1. The user's message matches trigger keywords (confidence > 0.3)
2. The intent requires skills (`generate_code`, `fix_code`, `refactor`)

Example: User says "build me a React component with auth"
→ `matchSkills` matches: react (0.6), supabase (0.4)
→ Only the top match (react) gets injected
→ Full template with code examples (~250 tokens)

Example: User says "what's the weather?"
→ `matchSkills` matches: nothing above 0.3
→ Nothing injected (0 tokens)

### Coding Style Injection (Smart Diff)

**Old way:** Always inject the full style object:
```json
{ "indentation": "spaces", "indentSize": 2, "semicolons": false, "quotes": "single", ... }
```
~300 chars every request, even if all values are defaults.

**New way:** Only inject non-default values:
```xml
<style>semicolons: true, quotes: double</style>
```
~50 chars, only when user has changed something. If they use all defaults → nothing injected.

### Corrections (Learning From Mistakes)

When the user edits generated code, the system can learn:
```json
{
  "original": "const [data, setData] = useState([])",
  "corrected": "const [data, setData] = useState<User[]>([])",
  "context": "Always type useState generics"
}
```

These only inject for `generate_code` and `fix_code` intents, capped at 3-5 most recent. Old corrections (>90 days, low usage) get cleaned up automatically.

---

## How to Wire It Up

### 1. Run the Supabase schema
```bash
# In Supabase SQL Editor, run:
supabase/schema-memory.sql
```

### 2. Update signup flow
In your `signUp()` function in `lib/supabase.ts`, after creating the user:
```typescript
// After successful signup
await supabase.rpc('seed_user_memories', { p_user_id: data.user.id })
```

### 3. The chat API route already uses buildSmartContext
The `/api/chat/route.ts` now imports and calls `buildSmartContext()` instead of the old `buildContext()`. No changes needed.

### 4. Learn from user edits (optional, future)
When a user manually edits generated code in the preview panel, call:
```typescript
await supabase.from('user_memories').insert({
  user_id: userId,
  type: 'correction',
  category: 'user_feedback',
  key: `correction_${Date.now()}`,
  value: { original, corrected, context: "User edited this" },
  confidence: 1.0
})
```

### 5. Learn coding style from generated code (optional, future)
After a successful generation, analyze the output:
```typescript
await supabase.rpc('learn_coding_style', {
  p_user_id: userId,
  p_uses_semicolons: code.includes(';'),
  p_uses_tabs: code.includes('\t'),
  p_indent_size: 2,
  p_quote_style: code.includes("'") ? 'single' : 'double',
  p_framework: 'react',
  p_styling: 'tailwind'
})
```

---

## Cost Savings Summary

| Scenario | Old Tokens | New Tokens | Savings |
|----------|-----------|-----------|---------|
| "Hello, how are you?" | 1,349 | 200 | **85%** |
| "Explain useEffect" | 1,349 | 200 | **85%** |
| "What color for my button?" | 1,349 | 280 | **79%** |
| "Build a login page" | 2,599 | 800 | **69%** |
| "Fix the error in my API" | 2,599 | 900 | **65%** |
| "Deploy this" | 1,349 | 200 | **85%** |

**At 1000 requests/day, ~$15-25/day saved on API costs.**

---

## Files Changed / Created

| File | Status | Purpose |
|------|--------|---------|
| `src/lib/smart-context.ts` | **NEW** | Intent classifier + smart context builder |
| `supabase/schema-memory.sql` | **NEW** | Supabase schema for memory tables |
| `src/app/api/chat/route.ts` | **MODIFIED** | Now uses `buildSmartContext()` |
| `src/lib/memory.ts` | **UNCHANGED** | Still works, smart-context uses Supabase directly for speed |
| `src/lib/skills.ts` | **UNCHANGED** | matchSkills() still used by smart-context |
| `src/lib/ai-config.ts` | **UNCHANGED** | sanitizeResponse() still used |
