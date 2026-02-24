# File Engine — Fine-Tuning Pipeline

## Overview

This pipeline fine-tunes GPT-4o on File Engine's knowledge base so the model produces expert-level code generation, debugging, and design without requiring the 18K token knowledge injection.

## Current Status

- **18K injection**: LIVE (deployed, working on every request)
- **Fine-tuning**: Training data ready, pipeline ready, waiting for OpenAI API key

## Setup

```bash
# 1. Install OpenAI SDK
pip install openai

# 2. Set API key
export OPENAI_API_KEY=sk-your-key-here

# 3. Validate training data
python3 fine-tune.py validate

# 4. Start training
python3 fine-tune.py train

# 5. Watch progress (polls every 30 seconds)
python3 fine-tune.py watch

# 6. Test the model
python3 fine-tune.py test "Build me a landing page with dark theme"
```

## Training Data

`training-data.jsonl` — JSONL format, one conversation per line.

### Current coverage (13 examples):

| Intent | Examples | Description |
|--------|----------|-------------|
| generate_code | 4 | SaaS pricing, photographer portfolio, search UI, dashboard |
| fix_code | 3 | Button not working, undefined map, hover on mobile |
| style_question | 1 | Font recommendation for fintech |
| explain | 2 | useEffect, useMemo vs useCallback |
| iteration | 1 | Make cards bigger |
| platform_error | 1 | Creating file failed (token truncation) |
| react_code | 1 | Todo app with animations |

### Recommended: Expand to 50-100+ examples

Need more examples for:
- More generate_code (different aesthetics, React apps, full-stack)
- More fix_code (React errors, CSS bugs, API issues)
- refactor examples
- deploy_action examples
- Image-to-code examples
- Multi-file project examples

## Cost Estimate

| Examples | Tokens | Training Cost | Time |
|----------|--------|---------------|------|
| 13 (current) | ~12K | ~$0.90 | 15-30 min |
| 50 | ~50K | ~$3.75 | 30-45 min |
| 100 | ~100K | ~$7.50 | 45-60 min |
| 300 | ~300K | ~$22.50 | 1-2 hours |

(3 epochs default, $25/1M training tokens for GPT-4o)

## After Training

The fine-tuned model ID looks like: `ft:gpt-4o-2024-08-06:your-org:file-engine-v1:abc123`

To use in File Engine, add it as a model option in the API route. The fine-tuned model can run WITHOUT the 18K knowledge injection, saving ~$0.05 per request on input tokens.

## Strategy

1. **Now**: 18K injection on Claude Sonnet (live, working)
2. **Next**: Fine-tune GPT-4o with expanded training data
3. **Then**: A/B test: Claude+injection vs fine-tuned GPT-4o
4. **Goal**: Fine-tuned model as "Fast" tier, Claude Sonnet as "Pro" tier
