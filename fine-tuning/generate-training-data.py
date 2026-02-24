#!/usr/bin/env python3
"""
File Engine — Training Data Generator (REAL VERSION)
Actually reads the 7 knowledge JSON files and generates training examples
from every data point inside them.

Usage:
  python3 generate-training-data.py
  # Outputs: training-data.jsonl
"""
import json, os, itertools, random

KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "knowledge")
OUTPUT = os.path.join(os.path.dirname(__file__), "training-data.jsonl")

SYS = "You are Aether, a world-class AI software engineer inside File Engine. You write production-quality code, debug systematically, and design with intention. Output code via ```language:filepath blocks. HTML must include <!DOCTYPE html>. Always mobile responsive. Brief intro then full code."

def ex(u, a):
    return {"messages":[{"role":"system","content":SYS},{"role":"user","content":u},{"role":"assistant","content":a}]}

def load(name):
    with open(os.path.join(KNOWLEDGE_DIR, name)) as f:
        return json.load(f)

ALL = []

# ============================================================
# 1. design-philosophy.json — fonts, colors, spacing, shadows
# ============================================================
design = load("design-philosophy.json")

# --- 1a. Font pairings from actual data ---
pairings = design["typography"]["pairings"]
for p in pairings:
    display = p["display"]
    body = p["body"]
    mood = p.get("mood", "versatile")
    d_cat = "serif" if any(s in display for s in ["Playfair","Cormorant","Lora","Fraunces","Bodoni"]) else "sans-serif"
    b_cat = "monospace" if "Mono" in body else ("serif" if any(s in body for s in ["Lora","Fraunces"]) else "sans-serif")
    ALL.append(ex(
        f"What font pairing feels {mood}?",
        f"""**{display}** (display) + **{body}** (body) — {mood}.

```css
@import url('https://fonts.googleapis.com/css2?family={display.replace(" ","+")}&family={body.replace(" ","+")}&display=swap');
:root {{
  --font-display: '{display}', {d_cat};
  --font-body: '{body}', {b_cat};
}}
h1 {{ font-family: var(--font-display); }}
body {{ font-family: var(--font-body); font-size: 16px; line-height: 1.6; }}
```"""
    ))

# --- 1b. Every display font category ---
for category, fonts in design["typography"]["display_fonts"].items():
    cat_label = category.replace("_", " ")
    font_list = ", ".join(fonts) if isinstance(fonts, list) else str(fonts)
    ALL.append(ex(
        f"What are good {cat_label} fonts?",
        f"""For {cat_label} typography, these are my go-to options: {font_list}.

Each works well as a display/heading font. Pair with a clean body font like DM Sans or Source Sans 3 for contrast. Load via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family={fonts[0].replace(' ','+') if isinstance(fonts,list) else ''}&display=swap" rel="stylesheet">
```"""
    ))

# --- 1c. Typography scale from actual data ---
scale = design["typography"]["scale"]
sizes_px = scale["sizes_px"]
sizes_rem = scale["sizes_rem"]
line_heights = scale["line_heights"]
letter_spacing = scale["letter_spacing"]
weights = scale["weights"]

ALL.append(ex(
    "What typography scale should I use?",
    f"""Here's the complete type scale I work from:

**Sizes (px):** {', '.join(str(s) for s in sizes_px)}
**Sizes (rem):** {', '.join(str(s) for s in sizes_rem)}

**Line heights:**
{chr(10).join(f'- {k}: {v}' for k,v in line_heights.items())}

**Letter spacing:**
{chr(10).join(f'- {k}: {v}' for k,v in letter_spacing.items())}

**Weights:**
{chr(10).join(f'- {k}: {v}' for k,v in weights.items())}

Rule: large text gets tighter line-height and letter-spacing. Small text gets looser. Body at 16px/1.6 is the sweet spot for readability."""
))

# --- 1d. Every accent palette from actual data ---
for name, palette in design["color"]["accent_palettes"].items():
    label = name.replace("_", " ")
    primary = palette.get("primary","")
    hover = palette.get("hover","")
    subtle = palette.get("subtle","")
    ALL.append(ex(
        f"Give me a {label} color palette",
        f"""```css
--primary: {primary};
--primary-hover: {hover};
--primary-subtle: {subtle};
```

Use `--primary` for buttons and links, `--primary-hover` for hover states, `--primary-subtle` for tag backgrounds and light tints. Pair with a dark background (#0a0a0f) or light (#fafafa) depending on theme."""
    ))

# --- 1e. Dark theme values from actual data ---
dark = design["color"]["dark_themes"]
ALL.append(ex(
    "What colors should I use for dark mode?",
    f"""From my dark theme system:

**Backgrounds:**
{chr(10).join(f'- {k}: `{v}`' for k,v in dark["backgrounds"].items())}

**Surfaces:**
{chr(10).join(f'- {k}: `{v}`' for k,v in dark["surfaces"].items())}

**Text:**
{chr(10).join(f'- {k}: `{v}`' for k,v in dark["text"].items())}

**Borders:** `{dark["borders"]}`

Key rules: never pure #000 background, never pure #fff text, surfaces via rgba opacity not solid grays, shadows don't work on dark — use border elevation instead."""
))

# --- 1f. Light theme values ---
light = design["color"]["light_themes"]
ALL.append(ex(
    "What colors for a light theme?",
    f"""**Backgrounds:**
{chr(10).join(f'- {k}: `{v}`' for k,v in light["backgrounds"].items())}

**Surfaces:**
{chr(10).join(f'- {k}: `{v}`' for k,v in light["surfaces"].items())}

**Text:**
{chr(10).join(f'- {k}: `{v}`' for k,v in light["text"].items())}

**Borders:** `{light["borders"]}`

Use warm off-white, not pure #fff. Dark text should be #1a1a1a not pure #000. Layered shadows for depth."""
))

# --- 1g. Color rules ---
for rule in design["color"]["rules"]:
    ALL.append(ex(
        "What are the rules for choosing colors?",
        f"Key principle: {rule}"
    ))

# --- 1h. Spacing from actual data ---
spacing = design["spacing"]
semantic = spacing["semantic"]
ALL.append(ex(
    "What spacing system should I use?",
    f"""**Scale (px):** {', '.join(str(s) for s in spacing['scale_px'])}

**Semantic spacing:**
{chr(10).join(f'- {k}: {v}' for k,v in semantic.items())}

**Responsive adjustments:**
- Mobile: {spacing['responsive_adjustments']['mobile']}
- Tablet: {spacing['responsive_adjustments']['tablet']}
- Desktop: {spacing['responsive_adjustments']['desktop']}

Related items = tight spacing. Unrelated = wide. Most common mistake: not enough vertical space between sections."""
))

# --- 1i. Shadows from actual data ---
shadows = design["shadows"]
ALL.append(ex(
    "What shadow values should I use?",
    f"""**Light theme shadow layers:**
{chr(10).join(f'- {k}: `{v}`' for k,v in shadows["layers"].items())}

**Dark theme:** {shadows["dark_theme"]}

Use two-layer shadows (contact + ambient) for realistic light. On dark backgrounds, use border elevation instead of shadows."""
))

# --- 1j. Animation timing/easing from actual data ---
anim = design["animation"]
ALL.append(ex(
    "What animation timing and easing should I use?",
    f"""**Timing:**
{chr(10).join(f'- {k}: {v}' for k,v in anim["timing"].items())}

**Easing curves:**
{chr(10).join(f'- {k}: `{v}`' for k,v in anim["easing"].items())}

**Patterns:**
{chr(10).join(f'- {k}: `{v}`' for k,v in anim["patterns"].items())}

**Accessibility:** `{anim["accessibility"]}`

Only animate `transform` and `opacity` for 60fps performance."""
))

# --- 1k. Aesthetic directions from actual data ---
directions = design["design_thinking_process"]["step_2_aesthetic_direction"]["directions"]
for direction_name, direction_data in directions.items():
    label = direction_name.replace("_", " ")
    if isinstance(direction_data, dict):
        details = ", ".join(f"{k}: {v}" for k,v in direction_data.items())
    else:
        details = str(direction_data)
    ALL.append(ex(
        f"How do I design something that feels {label}?",
        f"""For a {label} aesthetic:\n\n{details}\n\nCommit fully to this direction. Every choice — font, color, spacing, animation — should reinforce the same feeling. Don't blend aesthetics."""
    ))

# --- 1l. Glass morphism ---
glass = design["glass_morphism"]
ALL.append(ex(
    "How do I create a glassmorphism effect?",
    f"""**Recipe:** `{glass["recipe"]}`

**When to use:** {glass["when_to_use"]}

**Fallback:** `{glass["fallback"]}`

Requirements: something behind the card (gradient/image), low opacity, high blur, subtle border. GPU-intensive — use sparingly."""
))

# --- 1m. Responsive patterns ---
resp = design["responsive_design"]
for pattern_name, pattern_val in resp["patterns"].items():
    label = pattern_name.replace("_", " ")
    ALL.append(ex(
        f"How should {label} work on mobile?",
        f"""{pattern_val}"""
    ))

# --- 1n. Breakpoints ---
ALL.append(ex(
    "What breakpoints should I use?",
    f"""{chr(10).join(f'- {k}: {v}px' for k,v in resp["breakpoints"].items())}

Approach: {resp["approach"]}"""
))

print(f"  design-philosophy.json → {len(ALL)} examples")

# ============================================================
# 2. css-mastery.json — every CSS pattern
# ============================================================
css = load("css-mastery.json")
count_before = len(ALL)

# --- 2a. Layout patterns ---
for system in ["grid", "flexbox", "positioning", "container"]:
    patterns = css["layout"].get(system, {})
    for name, value in patterns.items():
        label = name.replace("_", " ")
        ALL.append(ex(
            f"How do I use CSS {system} {label}?",
            f"""`{value}`"""
        ))

# --- 2b. Typography CSS ---
for name, value in css["typography_css"].items():
    label = name.replace("_", " ")
    ALL.append(ex(
        f"How do I do {label} in CSS?",
        f"""`{value}`"""
    ))

# --- 2c. Selectors ---
for name, value in css["selectors"].items():
    label = name.replace("_", " ")
    ALL.append(ex(
        f"How does the CSS {label} selector work?",
        f"""`{value}`"""
    ))

# --- 2d. Modern CSS features ---
for name, value in css["modern_features"].items():
    label = name.replace("_", " ")
    ALL.append(ex(
        f"How do I use CSS {label}?",
        f"""`{value}`"""
    ))

# --- 2e. Animations ---
for name, value in css["animations_css"]["keyframes"].items():
    label = name.replace("_", " ")
    ALL.append(ex(
        f"How do I create a {label} animation?",
        f"""```css\n{value}\n```"""
    ))

# --- 2f. Animation rules ---
for key in ["rule", "performance", "will_change"]:
    val = css["animations_css"]["transitions"].get(key, "")
    if val:
        ALL.append(ex(
            f"What's the rule for CSS transition {key}?",
            f"""{val}"""
        ))

# --- 2g. Media queries ---
for name, value in css["responsive"]["media_queries"].items():
    label = name.replace("_", " ")
    ALL.append(ex(
        f"How do I use the {label} media query?",
        f"""`{value}`"""
    ))

# --- 2h. CSS Units ---
for name, value in css["responsive"]["units"].items():
    ALL.append(ex(
        f"When should I use the {name} CSS unit?",
        f"""{value}"""
    ))

# --- 2i. Forms ---
for name, value in css["forms"].items():
    label = name.replace("_", " ")
    ALL.append(ex(
        f"How do I style form {label} in CSS?",
        f"""`{value}`"""
    ))

# --- 2j. Performance ---
for name, value in css["performance"].items():
    label = name.replace("_", " ")
    ALL.append(ex(
        f"What is CSS {label}?",
        f"""{value}"""
    ))

# --- 2k. Accessibility ---
for name, value in css["accessibility"].items():
    label = name.replace("_", " ")
    ALL.append(ex(
        f"How do I handle {label} in CSS?",
        f"""{value}"""
    ))

print(f"  css-mastery.json → {len(ALL) - count_before} examples")

# ============================================================
# 3. javascript-typescript.json — every JS/TS pattern
# ============================================================
js = load("javascript-typescript.json")
count_before = len(ALL)

# --- 3a. Core language patterns ---
for section in ["variables", "functions", "destructuring", "template_literals", "operators"]:
    data = js["core_language"].get(section, {})
    for name, value in data.items():
        label = f"{section.replace('_',' ')} {name.replace('_',' ')}"
        ALL.append(ex(
            f"How do I use JavaScript {label}?",
            f"""`{value}`"""
        ))

# --- 3b. Async patterns ---
for name, value in js["async_patterns"].items():
    if isinstance(value, dict):
        if "pattern" in value:
            ALL.append(ex(f"How do I use {name.replace('_',' ')} in JavaScript?", f"""`{value['pattern']}`"""))
        for subname, subval in value.items():
            if subname not in ("pattern","rules") and isinstance(subval, str):
                ALL.append(ex(f"How do I use {name.replace('_',' ')} {subname.replace('_',' ')}?", f"""`{subval}`"""))
    elif isinstance(value, str):
        ALL.append(ex(f"How do I implement {name.replace('_',' ')} in JavaScript?", f"""`{value}`"""))

# --- 3c. Array methods ---
for category in ["transform", "filter", "accumulate", "sort"]:
    methods = js["array_methods"].get(category, {})
    for name, value in methods.items():
        ALL.append(ex(
            f"How do I use Array.{name}() in JavaScript?",
            f"""`{value}`"""
        ))

# --- 3d. DOM patterns ---
for category in ["selection", "manipulation", "events", "observers"]:
    patterns = js["dom_patterns"].get(category, {})
    for name, value in patterns.items():
        label = name.replace("_", " ")
        ALL.append(ex(
            f"How do I do DOM {label}?",
            f"""`{value}`"""
        ))

# --- 3e. Modern APIs ---
for name, value in js["modern_apis"].items():
    label = name.replace("_", " ")
    ALL.append(ex(
        f"How do I use {label} in JavaScript?",
        f"""`{value}`"""
    ))

# --- 3f. TypeScript utility types ---
for name, value in js["typescript"]["utility_types"].items():
    ALL.append(ex(
        f"When should I use TypeScript {name}?",
        f"""{value}"""
    ))

# --- 3g. TypeScript patterns ---
for name, value in js["typescript"]["patterns"].items():
    label = name.replace("_", " ")
    ALL.append(ex(
        f"How do I use TypeScript {label}?",
        f"""`{value}`"""
    ))

# --- 3h. Error handling ---
for name, value in js["error_handling"]["patterns"].items():
    label = name.replace("_", " ")
    ALL.append(ex(
        f"How should I handle errors with {label}?",
        f"""`{value}`"""
    ))

print(f"  javascript-typescript.json → {len(ALL) - count_before} examples")

# ============================================================
# 4. debugging-error-recovery.json — every error pattern
# ============================================================
debug = load("debugging-error-recovery.json")
count_before = len(ALL)

# --- 4a. Methodology steps ---
for step_name, step_data in debug["methodology"]["steps"].items():
    label = step_name.replace("_", " ")
    action = step_data.get("action", "")
    detail = step_data.get("detail", step_data.get("output", step_data.get("tools", "")))
    ALL.append(ex(
        f"What is debugging step '{label}'?",
        f"""**{label}:** {action}\n\n{detail}"""
    ))

# --- 4b. Every error pattern ---
for category, errors in debug["error_patterns"].items():
    cat_label = category.replace("_", " ")
    for error_name, error_data in errors.items():
        label = error_name.replace("_", " ")
        if isinstance(error_data, dict):
            cause = error_data.get("cause", error_data.get("causes", ""))
            fix = error_data.get("fix", error_data.get("fixes", error_data.get("solution", "")))
            prevention = error_data.get("prevention", "")
            
            cause_str = cause if isinstance(cause, str) else "\n".join(f"- {c}" for c in cause) if isinstance(cause, list) else str(cause)
            fix_str = fix if isinstance(fix, str) else "\n".join(f"- {f}" for f in fix) if isinstance(fix, list) else str(fix)
            
            ALL.append(ex(
                f"I'm getting a {cat_label} error: {label}",
                f"""**Cause:** {cause_str}\n\n**Fix:** {fix_str}{chr(10)+chr(10)+'**Prevention:** '+str(prevention) if prevention else ''}"""
            ))

# --- 4c. Error recovery patterns ---
for pattern_name, pattern_data in debug["error_recovery_patterns"].items():
    label = pattern_name.replace("_", " ")
    principle = pattern_data.get("principle", "")
    if isinstance(pattern_data, dict) and "patterns" in pattern_data:
        patterns_list = "\n".join(f"- {p}" for p in pattern_data["patterns"])
        ALL.append(ex(
            f"How do I implement {label}?",
            f"""{principle}\n\nPatterns:\n{patterns_list}"""
        ))
    elif isinstance(pattern_data, dict):
        details = "\n".join(f"- **{k}:** {v}" for k,v in pattern_data.items() if k != "principle")
        ALL.append(ex(
            f"How should I handle {label}?",
            f"""{principle}\n\n{details}"""
        ))

print(f"  debugging-error-recovery.json → {len(ALL) - count_before} examples")

# ============================================================
# 5. technology-knowledge.json — React, Next.js, Tailwind, etc
# ============================================================
tech = load("technology-knowledge.json")
count_before = len(ALL)

# --- 5a. React hooks ---
for hook_name, hook_data in tech["react_18"]["hooks"].items():
    if isinstance(hook_data, dict):
        pattern = hook_data.get("pattern", hook_data.get("usage", ""))
        gotchas = hook_data.get("gotchas", hook_data.get("rules", ""))
        gotcha_str = ""
        if isinstance(gotchas, list):
            gotcha_str = "\n\n**Gotchas:**\n" + "\n".join(f"- {g}" for g in gotchas)
        elif isinstance(gotchas, str) and gotchas:
            gotcha_str = f"\n\n**Gotchas:** {gotchas}"
        ALL.append(ex(
            f"How do I use {hook_name} in React?",
            f"""`{pattern}`{gotcha_str}"""
        ))

# --- 5b. React patterns ---
for name, value in tech["react_18"]["patterns"].items():
    label = name.replace("_", " ")
    ALL.append(ex(f"What is the React {label} pattern?", f"""{value}"""))

# --- 5c. React anti-patterns ---
for anti in tech["react_18"]["anti_patterns"]:
    ALL.append(ex(f"What's a common React anti-pattern?", f"""Avoid: {anti}"""))

# --- 5d. Next.js file conventions ---
for filename, description in tech["nextjs_14_app_router"]["file_conventions"].items():
    ALL.append(ex(f"What does {filename} do in Next.js App Router?", f"""{description}"""))

# --- 5e. Next.js server vs client ---
for comp_type, description in tech["nextjs_14_app_router"]["server_vs_client"].items():
    label = comp_type.replace("_", " ")
    ALL.append(ex(f"When should I use {label} in Next.js?", f"""{description}"""))

# --- 5f. Tailwind patterns ---
for name, value in tech["tailwind_css"]["core_patterns"].items():
    label = name.replace("_", " ")
    ALL.append(ex(f"What Tailwind classes for {label}?", f"""`{value}`"""))

# --- 5g. Common libraries ---
for category in ["ui", "data", "utilities", "charts"]:
    libs = tech["common_libraries"].get(category, {})
    for lib_name, description in libs.items():
        label = lib_name.replace("_", " ")
        ALL.append(ex(f"When should I use {label}?", f"""{description}"""))

# --- 5h. HTML APIs ---
for api_name, description in tech["html_apis"].items():
    label = api_name.replace("_", " ")
    ALL.append(ex(f"How do I use {label}?", f"""{description}"""))

# --- 5i. Performance patterns ---
for category in ["loading", "rendering", "caching"]:
    patterns = tech["performance_patterns"].get(category, {})
    for name, value in patterns.items():
        label = name.replace("_", " ")
        ALL.append(ex(f"How do I optimize {label}?", f"""{value}"""))

# --- 5j. Security ---
for item in tech["security"]["xss_prevention"]:
    ALL.append(ex("How do I prevent XSS?", f"""{item}"""))

print(f"  technology-knowledge.json → {len(ALL) - count_before} examples")

# ============================================================
# 6. cognitive-patterns.json — thinking patterns
# ============================================================
cog = load("cognitive-patterns.json")
count_before = len(ALL)

# --- 6a. Understanding request patterns ---
for pattern in cog["understanding_requests"]["patterns"]:
    if isinstance(pattern, dict):
        user_says = pattern.get("user_says", pattern.get("request", ""))
        real_need = pattern.get("real_need", pattern.get("what_they_actually_need", ""))
        if user_says and real_need:
            ALL.append(ex(
                f"A user says: '{user_says}'",
                f"""What they actually need: {real_need}\n\n{cog['understanding_requests']['principle']}"""
            ))

# --- 6b. Planning checklist ---
checklist = cog["planning_before_coding"]["checklist"]
ALL.append(ex(
    "What should I check before writing code?",
    f"""{cog['planning_before_coding']['principle']}\n\n**Checklist:**\n{chr(10).join(f'{i+1}. {item}' for i, item in enumerate(checklist))}"""
))

# --- 6c. Verification checklists ---
ALL.append(ex(
    "How do I verify HTML code before shipping?",
    f"""{cog['verification_after_coding']['principle']}\n\n**HTML checklist:**\n{chr(10).join(f'- {item}' for item in cog['verification_after_coding']['html_checklist'])}"""
))
ALL.append(ex(
    "How do I verify React code before shipping?",
    f"""**React checklist:**\n{chr(10).join(f'- {item}' for item in cog['verification_after_coding']['react_checklist'])}"""
))

# --- 6d. Decision framework ---
for decision in cog["decision_making"]["framework"]:
    if isinstance(decision, dict):
        scenario = decision.get("scenario", decision.get("situation", ""))
        approach = decision.get("approach", decision.get("decision", ""))
        if scenario and approach:
            ALL.append(ex(f"How should I decide: {scenario}", f"""{approach}"""))

# --- 6e. Token budget rules ---
for rule in cog["token_budget_awareness"]["rules"]:
    ALL.append(ex("How should I manage token budget?", f"""{rule}"""))

print(f"  cognitive-patterns.json → {len(ALL) - count_before} examples")

# ============================================================
# 7. reasoning-patterns.json — mental models
# ============================================================
reason = load("reasoning-patterns.json")
count_before = len(ALL)

for pattern_name in ["first_principles", "divide_and_conquer", "inversion", "steel_thread", 
                      "rubber_duck_debugging", "occams_razor", "working_backwards", 
                      "constraint_analysis", "abstraction_levels"]:
    if pattern_name not in reason:
        continue
    data = reason[pattern_name]
    description = data.get("description", "")
    
    # Build detail from whatever fields exist
    details = []
    for key in ["process", "applications", "example", "categories", "levels"]:
        val = data.get(key)
        if isinstance(val, list):
            for item in val:
                if isinstance(item, str):
                    details.append(f"- {item}")
                elif isinstance(item, dict):
                    details.append("- " + ", ".join(f"{k}: {v}" for k,v in item.items()))
        elif isinstance(val, dict):
            for k, v in val.items():
                if isinstance(v, str):
                    details.append(f"- **{k}:** {v}")
                elif isinstance(v, list):
                    details.append(f"- **{k}:** {', '.join(str(i) for i in v)}")
    
    label = pattern_name.replace("_", " ")
    ALL.append(ex(
        f"Explain the {label} approach to problem solving",
        f"""{description}\n\n{chr(10).join(details[:10])}"""
    ))

print(f"  reasoning-patterns.json → {len(ALL) - count_before} examples")

# ============================================================
# COMBINE: hand-crafted + generated
# ============================================================
hand_crafted = []
existing = os.path.join(os.path.dirname(__file__), "training-data.jsonl")
if os.path.exists(existing):
    with open(existing) as f:
        for line in f:
            try:
                hand_crafted.append(json.loads(line))
            except:
                pass

# Deduplicate by user message
seen = set()
final = []
for e in hand_crafted + ALL:
    user_msg = e["messages"][1]["content"][:100]
    if user_msg not in seen:
        seen.add(user_msg)
        final.append(e)

# Write
with open(OUTPUT, 'w') as f:
    for e in final:
        f.write(json.dumps(e, ensure_ascii=False) + '\n')

# Stats
total_tokens = sum(sum(len(m["content"]) for m in e["messages"]) // 4 for e in final)
print(f"\n{'='*50}")
print(f"TOTAL: {len(final)} examples")
print(f"  Hand-crafted: {len(hand_crafted)}")
print(f"  Generated from knowledge JSONs: {len(ALL)}")
print(f"  After dedup: {len(final)}")
print(f"  Tokens: ~{total_tokens:,}")
print(f"  Est cost (3 epochs): ~${total_tokens * 25 * 3 / 1_000_000:.2f}")
print(f"  Output: {OUTPUT}")
print(f"{'='*50}")
