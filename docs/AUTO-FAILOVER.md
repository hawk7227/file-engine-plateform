# File Engine - Auto-Failover System

## How It Works

```
USER SENDS PROMPT
       ↓
   Try Anthropic Key #1 → Success? → Return response
       ↓ (failed)
   Try Anthropic Key #2 → Success? → Return response
       ↓ (failed)
   Try Anthropic Key #3 → Success? → Return response
       ↓ (all failed)
   AUTO-SWITCH TO OPENAI
       ↓
   Try OpenAI Key #1 → Success? → Return response
       ↓ (failed)
   Try OpenAI Key #2 → Success? → Return response
       ↓ (failed)
   Try OpenAI Key #3 → Success? → Return response
       ↓ (all failed)
   Return error with retry ETA
```

**User sees nothing. Switching is invisible and automatic.**

---

## Environment Setup

```bash
# Primary Provider: Anthropic (at least 1, ideally 3 keys)
ANTHROPIC_API_KEY_1=sk-ant-xxxxx
ANTHROPIC_API_KEY_2=sk-ant-xxxxx
ANTHROPIC_API_KEY_3=sk-ant-xxxxx

# Backup Provider: OpenAI (at least 1, ideally 3 keys)
OPENAI_API_KEY_1=sk-xxxxx
OPENAI_API_KEY_2=sk-xxxxx
OPENAI_API_KEY_3=sk-xxxxx
```

---

## What Triggers a Switch

| Error Type | Action | Cooldown |
|------------|--------|----------|
| Rate limit (429) | Switch to next key | 5 minutes |
| Timeout (>30s) | Switch to next key | 2 minutes |
| Auth error (401) | Mark key invalid | Permanent |
| Server error (500) | Retry once, then switch | 1 minute |
| All Anthropic down | Auto-switch to OpenAI | Immediate |

---

## Model Mapping

When switching providers, equivalent models are used automatically:

| Claude Model | OpenAI Equivalent |
|--------------|-------------------|
| claude-sonnet-4 | gpt-4o |
| claude-opus-4 | gpt-4o |
| claude-3-5-haiku | gpt-4o-mini |

---

## Key Pool Status (Runtime)

```
ANTHROPIC (Primary)           OPENAI (Backup)
├── Key 1: ✅ Ready           ├── Key 1: ✅ Ready
├── Key 2: ⏳ Cooling (3min)  ├── Key 2: ✅ Ready
└── Key 3: ✅ Ready           └── Key 3: ✅ Ready

Request Flow:
1. Key 1 available → USE IT
2. If fails → Key 2 cooling → SKIP
3. Key 3 available → USE IT
4. If all Anthropic fail → OpenAI Key 1 → USE IT
```

---

## Automatic Recovery

Keys automatically recover after their cooldown period:

```
Key rate-limited at 2:00 PM
     ↓
Key marked unavailable
     ↓
5-minute cooldown starts
     ↓
Key available again at 2:05 PM
     ↓
Error count reset to 0
```

---

## Code Location

| File | Purpose |
|------|---------|
| `/src/lib/key-pool.ts` | Key rotation & failover logic |
| `/src/lib/ai.ts` | AI provider abstraction |
| `/src/app/api/generate-validated/route.ts` | Uses failover system |

---

## Quick Reference

| Question | Answer |
|----------|--------|
| Manual switching needed? | **No** |
| When does it switch? | Automatically on any error |
| Does user notice? | **No, invisible** |
| Does it switch back? | **Yes, after cooldown** |
| Preferred provider? | Anthropic (faster) |
| Backup provider? | OpenAI (automatic) |
| Minimum keys needed? | 1 Anthropic + 1 OpenAI |
| Recommended keys? | 3 Anthropic + 3 OpenAI |

---

## User Experience

```
What User Sees              What Happens Behind the Scenes
─────────────────           ─────────────────────────────────
"Build me a dashboard"  →   Try Claude key #1
                        →   Rate limited!
                        →   Try Claude key #2  
                        →   Success!
"Here's your dashboard" ←   Response returned

Total time: ~3 seconds. User never knows a switch happened.
```

---

**Zero configuration. Zero manual intervention. Just works.**
