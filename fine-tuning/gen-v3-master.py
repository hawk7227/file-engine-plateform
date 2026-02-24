#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════
FILE ENGINE V3 — MASTER TRAINING DATA GENERATOR
Reads ALL 15 knowledge files. Generates:
  - Full-page HTML examples (from v2 page engine)
  - Q&A knowledge examples (from v1 generator)
  - NEW: Interactive component examples
  - NEW: App template examples
  - NEW: Conversation pattern examples
  - NEW: Copywriting examples
  - NEW: Accessibility examples
  - NEW: Image-to-code examples
  - NEW: React/Next.js pattern examples
  - NEW: Advanced CSS animation examples
═══════════════════════════════════════════════════════════
"""
import json, os, subprocess, sys

BASE = os.path.dirname(__file__)
KNOWLEDGE = os.path.join(os.path.dirname(BASE), "file-engine-plateform", "src", "lib", "knowledge")
if not os.path.exists(KNOWLEDGE):
    KNOWLEDGE = os.path.join(BASE, "..", "src", "lib", "knowledge")

OUTPUT = os.path.join(BASE, "v3-complete-training-data.jsonl")

SYS = """You are Aether, a world-class AI software engineer inside File Engine. You generate production-quality, visually stunning code with intentional design choices.

RESPONSE FLOW: 1-2 line design plan stating aesthetic direction → complete code → brief note after if needed.
RULES:
- Code blocks use ```html:filepath format. The :filepath is REQUIRED.
- HTML has <!DOCTYPE html>, viewport meta, ALL CSS in <style>, ALL JS in <script>
- Mobile responsive ALWAYS. Dark themes: #0a0a0f base, never pure black. Light themes: off-white, never #fff.
- COMPLETE code only. Zero placeholders, zero TODOs. Every file immediately runnable.
- Every design choice is INTENTIONAL — fonts, colors, spacing, animations all serve a purpose."""

ALL = []
seen_keys = set()

def ex(prompt, response, category="general"):
    """Add example with dedup check"""
    key = prompt[:120]
    if key in seen_keys:
        return False
    seen_keys.add(key)
    ALL.append({"messages": [
        {"role": "system", "content": SYS},
        {"role": "user", "content": prompt},
        {"role": "assistant", "content": response}
    ]})
    return True

def load_json(filename):
    """Load a knowledge JSON file"""
    path = os.path.join(KNOWLEDGE, filename)
    if not os.path.exists(path):
        print(f"  ⚠ {filename} not found")
        return None
    with open(path) as f:
        return json.load(f)

print("═══════════════════════════════════════════════════════")
print("FILE ENGINE V3 MASTER TRAINING DATA GENERATOR")
print("═══════════════════════════════════════════════════════\n")

# ═══════════════════════════════════════════════════════════
# STEP 1: Import existing v1 and v2 training data
# ═══════════════════════════════════════════════════════════

for fname in ["training-data.jsonl", "v2-training-data.jsonl"]:
    fpath = os.path.join(BASE, fname)
    if os.path.exists(fpath):
        count = 0
        with open(fpath) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    e = json.loads(line)
                    key = e["messages"][1]["content"][:120]
                    if key not in seen_keys:
                        seen_keys.add(key)
                        ALL.append(e)
                        count += 1
                except:
                    pass
        print(f"Imported {count} examples from {fname}")

print(f"After imports: {len(ALL)} examples\n")

# ═══════════════════════════════════════════════════════════
# STEP 2: Generate examples from NEW knowledge files
# ═══════════════════════════════════════════════════════════

# --- APP TEMPLATES ---
print("Generating from app-templates.json...")
app = load_json("app-templates.json")
count_before = len(ALL)
if app:
    template_prompts = {
        "dashboard_admin_panel": [
            "Build a dark admin dashboard with sidebar navigation, stat cards, and a data table",
            "Create an analytics dashboard with sidebar, charts area, and recent activity",
        ],
        "auth_login": [
            "Create a login page with email/password, social login buttons, and forgot password link",
            "Build a dark sign-in page with Google and GitHub OAuth buttons",
        ],
        "auth_signup": [
            "Create a registration page with name, email, password strength indicator, and terms checkbox",
            "Build a sign up form with real-time password strength validation",
        ],
        "auth_forgot_password": [
            "Make a forgot password page with email input and success confirmation state",
            "Build a password reset request form with email sent confirmation",
        ],
        "settings_page": [
            "Create a settings page with profile section, notification toggles, API keys, and danger zone",
            "Build an account settings page with tabs for profile, notifications, and billing",
        ],
        "blog_layout": [
            "Build a blog page with featured post, grid of article cards, and sidebar with categories",
            "Create a dark blog listing with featured hero post and category filtering sidebar",
        ],
        "error_404": [
            "Design a creative 404 page with animated text and back-to-home button",
            "Build a dark 404 error page with floating animation and navigation links",
        ],
        "onboarding_wizard": [
            "Create a multi-step onboarding wizard with progress bar and step navigation",
            "Build a 3-step setup wizard with selectable options and progress indicators",
        ],
        "email_template": [
            "Create a welcome email template with steps, CTA button, and footer",
            "Build an HTML email template for transactional welcome messages",
        ],
        "documentation_page": [
            "Build a documentation page with sidebar nav, code blocks, callouts, and table of contents",
            "Create a dark docs layout with sidebar navigation and syntax-highlighted code examples",
        ],
    }
    for key, prompts in template_prompts.items():
        if key in app and "html" in app[key]:
            html = app[key]["html"]
            for prompt in prompts:
                intro = f"Building a {app[key].get('description', key.replace('_',' '))}."
                response = f"{intro}\n\n```html:index.html\n{html}\n```"
                ex(prompt, response, "app-template")
print(f"  → {len(ALL) - count_before} app template examples")

# --- INTERACTIVE COMPONENTS ---
print("Generating from interactive-components.json...")
ic = load_json("interactive-components.json")
count_before = len(ALL)
if ic:
    component_prompts = {
        "tabs_component": [
            "Build a tab component with animated underline indicator",
            "Create tabs that switch content with smooth sliding indicator animation",
        ],
        "modal_dialog": [
            "Create a modal popup with backdrop blur, close on escape, and form inside",
            "Build a confirmation dialog with blur backdrop and animated entrance",
        ],
        "dropdown_menu": [
            "Build a dropdown menu with icons, keyboard shortcuts, and click-outside-to-close",
            "Create an actions dropdown with dividers, danger items, and keyboard navigation",
        ],
        "search_filter": [
            "Create a search input with real-time filtering of a list, filter buttons, and empty state",
            "Build a searchable team member list with department filter tags",
        ],
        "theme_toggle": [
            "Create a dark/light theme toggle that switches CSS variables with smooth transition",
            "Build a theme switcher with sun/moon icons and CSS variable-based theming",
        ],
        "accordion_faq": [
            "Build an FAQ accordion where only one item is open at a time with smooth animation",
            "Create an expandable FAQ section with animated chevron and smooth height transitions",
        ],
        "form_validation": [
            "Create a contact form with real-time validation, error messages, and loading submit state",
            "Build a validated form with inline errors, character count, and success confirmation",
        ],
        "toast_notifications": [
            "Build a toast notification system with success/error/warning types and auto-dismiss",
            "Create stacking toast notifications with progress bar and manual close button",
        ],
        "carousel_slider": [
            "Create a content carousel with dots, arrows, autoplay, and touch swipe support",
            "Build an image slider with smooth transitions, dot indicators, and keyboard navigation",
        ],
        "animated_counter": [
            "Build animated number counters that count up when scrolled into view with formatting",
            "Create stat counters with IntersectionObserver trigger and eased counting animation",
        ],
    }
    for key, prompts in component_prompts.items():
        if key in ic and "html" in ic[key]:
            html = ic[key]["html"]
            for prompt in prompts:
                intro = f"Building {ic[key].get('description', key.replace('_',' '))}."
                response = f"{intro}\n\n```html:{key.replace('_','-')}.html\n{html}\n```"
                ex(prompt, response, "interactive-component")
print(f"  → {len(ALL) - count_before} interactive component examples")

# --- CONVERSATION PATTERNS ---
print("Generating from conversation-patterns.json...")
conv = load_json("conversation-patterns.json")
count_before = len(ALL)
if conv:
    # Vague prompt handling
    if "clarifying_questions" in conv:
        cq = conv["clarifying_questions"]
        if "vague_prompt_handling" in cq:
            for key, data in cq["vague_prompt_handling"].items():
                prompt = key.replace("_", " ")
                ex(prompt, data["response"], "conversation")
    
    # Iteration patterns
    if "iteration_patterns" in conv:
        for key, data in conv["iteration_patterns"].get("translations", {}).items():
            prompt = key.replace("_", " ")
            actions = "\n".join(f"- {a}" for a in data["actions"])
            response = f"When users say '{prompt}', they typically mean: {data['what_they_mean']}.\n\nHere's what I'd change:\n{actions}"
            ex(f"The design looks fine but can you {prompt}?", response, "iteration")
    
    # Design explanations
    if "design_explanations" in conv:
        for pattern_name, template in conv["design_explanations"].get("patterns", {}).items():
            ex(f"Why did you choose that {pattern_name.replace('_', ' ')}?", 
               f"The {pattern_name.replace('_', ' ')} was chosen intentionally. {template}", "explanation")
print(f"  → {len(ALL) - count_before} conversation pattern examples")

# --- COPYWRITING ---
print("Generating from copywriting-content.json...")
copy = load_json("copywriting-content.json")
count_before = len(ALL)
if copy:
    # Headline formulas
    if "headline_formulas" in copy:
        for style, examples in copy["headline_formulas"].get("hero_headline_patterns", {}).items():
            ex(f"Write a {style.replace('_', ' ')} hero headline", 
               f"Pattern: {examples}\n\nExamples:\n- {examples.replace('{Product}', 'Nexus').replace('{Category}', 'project management tool').replace('{Tool}', 'PM tool').replace('{Pain}', 'switching between 5 different tools')}", 
               "copywriting")
    
    # CTA patterns
    if "cta_patterns" in copy:
        ctas = copy["cta_patterns"]
        strong = ", ".join(ctas.get("primary_ctas", {}).get("strong", []))
        rules = "\n".join(f"- {r}" for r in ctas.get("cta_copy_rules", []))
        ex("What are good CTA button texts for a SaaS landing page?",
           f"Strong primary CTAs: {strong}\n\nRules for effective CTAs:\n{rules}", "copywriting")
    
    # Industry language
    if "industry_specific_language" in copy:
        for industry, data in copy["industry_specific_language"].items():
            keywords = ", ".join(data.get("keywords", []))
            pain_points = ", ".join(data.get("pain_points", []))
            ex(f"What language and keywords should I use for a {industry.replace('_', ' ')} landing page?",
               f"For {industry.replace('_', ' ')}, use action words like: {keywords}\n\nAddress pain points: {pain_points}", "copywriting")
    
    # Anti-patterns
    if "anti_patterns" in copy:
        never = "\n".join(f"- {n}" for n in copy["anti_patterns"].get("never_use", []))
        replacements = "\n".join(f"- '{k}' → '{v}'" for k, v in copy["anti_patterns"].get("replace_with", {}).items())
        ex("What are common copywriting mistakes on landing pages?",
           f"Never use these:\n{never}\n\nReplace with:\n{replacements}", "copywriting")
print(f"  → {len(ALL) - count_before} copywriting examples")

# --- ACCESSIBILITY & PERFORMANCE ---
print("Generating from accessibility-performance.json...")
a11y = load_json("accessibility-performance.json")
count_before = len(ALL)
if a11y:
    # Semantic HTML
    if "semantic_html" in a11y:
        landmarks = a11y["semantic_html"].get("landmark_regions", {})
        items = "\n".join(f"- {k}: {v}" for k, v in landmarks.items())
        ex("What semantic HTML elements should I use for proper page structure?",
           f"Use these landmark regions:\n{items}\n\nRule: One <main> per page, don't skip heading levels (h1→h2→h3), use <button> for actions and <a> for navigation.", "accessibility")
    
    # ARIA
    if "aria_attributes" in a11y:
        for pattern_name, code in a11y["aria_attributes"].get("common_patterns", {}).items():
            ex(f"How do I make a {pattern_name.replace('_', ' ')} accessible with ARIA?",
               f"Here's the accessible pattern for {pattern_name.replace('_', ' ')}:\n\n```html\n{code}\n```", "accessibility")
    
    # SEO meta tags
    if "seo_meta_tags" in a11y:
        meta = a11y["seo_meta_tags"].get("essential_head", "")
        ex("What meta tags should every HTML page have for SEO?",
           f"Here's the complete head section with all essential meta tags:\n\n```html\n{meta}\n```", "seo")
    
    # Performance
    if "performance_optimization" in a11y:
        perf = a11y["performance_optimization"]
        # Font loading
        font_tips = "\n".join(f"- {k}: {v}" for k, v in perf.get("font_loading", {}).items())
        ex("How should I optimize font loading for web performance?",
           f"Font loading best practices:\n{font_tips}", "performance")
        
        # Core Web Vitals
        if "core_web_vitals" in perf:
            cwv = perf["core_web_vitals"]
            for metric, data in cwv.items():
                fixes = "\n".join(f"- {f}" for f in data.get("fixes", []))
                ex(f"How do I optimize {metric} (Core Web Vitals)?",
                   f"**{metric}** — {data['what']}\nTarget: {data['target']}\n\nFixes:\n{fixes}", "performance")
    
    # Reduced motion
    if "reduced_motion" in a11y:
        ex("How do I handle prefers-reduced-motion for accessibility?",
           f"Always include this media query:\n\n```css\n{a11y['reduced_motion']['media_query']}\n```\n\n{a11y['reduced_motion']['rule']}", "accessibility")
print(f"  → {len(ALL) - count_before} accessibility/performance examples")

# --- ADVANCED CSS ---
print("Generating from advanced-css-animation.json...")
css_adv = load_json("advanced-css-animation.json")
count_before = len(ALL)
if css_adv:
    # Layouts
    if "complex_layouts" in css_adv:
        for name, css in css_adv["complex_layouts"].items():
            ex(f"How do I create a {name.replace('_', ' ')} layout in CSS?",
               f"Here's the CSS for {name.replace('_', ' ')}:\n\n```css\n{css}\n```", "css")
    
    # Keyframes
    if "keyframes" in css_adv:
        for name, code in css_adv["keyframes"].items():
            ex(f"Create a {name.replace('_', ' ').replace('Up', ' up').replace('In', ' in')} animation in CSS",
               f"```css\n{code}\n```", "css")
    
    # Gradients
    if "gradients" in css_adv:
        for name, css in css_adv["gradients"].items():
            if isinstance(css, str) and len(css) > 20:
                ex(f"How do I create a {name.replace('_', ' ')} effect in CSS?",
                   f"```css\n{css}\n```", "css")
    
    # Micro interactions
    if "micro_interactions" in css_adv:
        for name, css in css_adv["micro_interactions"].items():
            ex(f"Create a {name.replace('_', ' ')} micro-interaction in CSS",
               f"```css\n{css}\n```", "css")
    
    # Motion principles
    if "motion_principles" in css_adv:
        rules = "\n".join(f"- {r}" for r in css_adv["motion_principles"].get("rules", []))
        timing = "\n".join(f"- {k}: {v}" for k, v in css_adv["motion_principles"].get("timing_guide", {}).items())
        easing = "\n".join(f"- {k}: {v}" for k, v in css_adv["motion_principles"].get("easing_guide", {}).items())
        ex("What are the best practices for animation timing and easing in web design?",
           f"Timing guide:\n{timing}\n\nEasing functions:\n{easing}\n\nRules:\n{rules}", "css")
print(f"  → {len(ALL) - count_before} advanced CSS examples")

# --- IMAGE TO CODE ---
print("Generating from image-to-code.json...")
i2c = load_json("image-to-code.json")
count_before = len(ALL)
if i2c:
    # Screenshot analysis steps
    if "screenshot_analysis" in i2c:
        steps = i2c["screenshot_analysis"]["steps"]
        step_text = "\n".join(f"{s['step']}. **{s['name']}**: Look for {', '.join(s['what_to_look_for'][:3])}" for s in steps)
        ex("How do you convert a screenshot/design into code?",
           f"I follow a systematic 6-step process:\n\n{step_text}\n\nThe key is extracting the DESIGN SYSTEM (colors, fonts, spacing) not trying to pixel-match.", "image-to-code")
    
    # Visual patterns
    if "visual_pattern_recognition" in i2c:
        for name, impl in i2c["visual_pattern_recognition"].get("patterns", {}).items():
            ex(f"How do I implement a {name.replace('_', ' ')} effect?",
               f"```css\n{impl}\n```", "css")
    
    # Clone patterns
    if "clone_website_approach" in i2c:
        for site, data in i2c["clone_website_approach"].get("common_sites_to_clone", {}).items():
            elements = ", ".join(data["key_elements"])
            ex(f"How would I recreate a {site.replace('_', ' ')}-style design?",
               f"Key design elements of {site.replace('_', ' ')}: {elements}\nPalette: {data['palette']}\nFonts: {data['fonts']}", "image-to-code")
print(f"  → {len(ALL) - count_before} image-to-code examples")

# --- REACT / NEXT.JS ---
print("Generating from react-nextjs-patterns.json...")
react = load_json("react-nextjs-patterns.json")
count_before = len(ALL)
if react:
    # Hooks
    if "react_component_patterns" in react:
        hooks = react["react_component_patterns"].get("hooks_patterns", {})
        for hook_name, patterns in hooks.items():
            if isinstance(patterns, dict):
                for variant, code in patterns.items():
                    ex(f"Show me how to use {hook_name} for {variant.replace('_', ' ')} in React",
                       f"```tsx\n{code}\n```", "react")
            elif isinstance(patterns, str):
                ex(f"How do I use {hook_name} in React?",
                   f"```tsx\n{patterns}\n```", "react")
    
    # Custom hooks
    if "react_component_patterns" in react:
        custom = react["react_component_patterns"].get("custom_hooks", {})
        for hook, code in custom.items():
            ex(f"Write a {hook} custom hook in React/TypeScript",
               f"```tsx\n{code}\n```", "react")
    
    # Next.js conventions
    if "nextjs_app_router" in react:
        conventions = react["nextjs_app_router"].get("file_conventions", {})
        for file, desc in conventions.items():
            ex(f"What goes in {file} in Next.js App Router?",
               f"{desc}", "nextjs")
        
        # Server vs client
        svc = react["nextjs_app_router"].get("server_vs_client", {})
        if "data_fetching_server" in svc:
            ex("How do I fetch data in a Next.js server component?",
               f"```tsx\n{svc['data_fetching_server']}\n```", "nextjs")
        if "data_fetching_client" in svc:
            ex("How do I fetch data in a Next.js client component?",
               f"```tsx\n{svc['data_fetching_client']}\n```", "nextjs")
    
    # Tailwind patterns
    if "tailwind_patterns" in react:
        tw = react["tailwind_patterns"]
        for name, classes in tw.items():
            if isinstance(classes, str) and name != "description":
                ex(f"What Tailwind classes make a good {name.replace('_', ' ')}?",
                   f"```html\n<div class=\"{classes}\">...</div>\n```", "tailwind")
    
    # TypeScript
    if "typescript_patterns" in react:
        ts = react["typescript_patterns"]
        for category, patterns in ts.get("interfaces", {}).items():
            ex(f"Write a TypeScript interface for {category.replace('_', ' ')}",
               f"```typescript\n{patterns}\n```", "typescript")
    
    # State management
    if "state_management" in react:
        for lib, code in react["state_management"].items():
            ex(f"Show me a {lib.replace('_', ' ')} example for state management",
               f"```tsx\n{code}\n```", "react")
print(f"  → {len(ALL) - count_before} React/Next.js/TypeScript examples")

# ═══════════════════════════════════════════════════════════
# STEP 3: Write output
# ═══════════════════════════════════════════════════════════

# Validate all examples
errors = 0
for i, e in enumerate(ALL):
    if len(e.get("messages", [])) != 3:
        errors += 1
    for m in e.get("messages", []):
        if "role" not in m or "content" not in m:
            errors += 1

# Write
with open(OUTPUT, 'w') as f:
    for e in ALL:
        f.write(json.dumps(e, ensure_ascii=False) + '\n')

# Stats
total_chars = sum(sum(len(m["content"]) for m in e["messages"]) for e in ALL)
total_tokens = total_chars // 4
file_size = os.path.getsize(OUTPUT)

print(f"\n{'═'*55}")
print(f"V3 COMPLETE TRAINING DATA")
print(f"{'═'*55}")
print(f"Total examples: {len(ALL)}")
print(f"Validation errors: {errors}")
print(f"Total tokens: ~{total_tokens:,}")
print(f"Est cost (3 epochs): ~${total_tokens * 3 * 0.000025:.2f}")
print(f"File size: {file_size:,} bytes ({file_size/1024/1024:.1f} MB)")
print(f"Output: {OUTPUT}")
print(f"{'═'*55}")
