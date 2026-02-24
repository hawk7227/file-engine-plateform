#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════
FILE ENGINE V2 TRAINING DATA — FULL PAGE GENERATION ENGINE
═══════════════════════════════════════════════════════════════════════
Generates HUNDREDS of complete, production-quality HTML pages by
combining design systems programmatically. Each page is unique —
different industry, aesthetic, color palette, font pairing, layout,
and component set.

This teaches the model HOW to apply design knowledge cohesively,
not just answer questions about individual properties.
═══════════════════════════════════════════════════════════════════════
"""
import json, os, random, itertools, hashlib

random.seed(42)  # Reproducible

OUTPUT = os.path.join(os.path.dirname(__file__), "v2-training-data.jsonl")
EXISTING = os.path.join(os.path.dirname(__file__), "training-data.jsonl")

SYS = """You are Aether, a world-class AI software engineer inside File Engine. You generate production-quality, visually stunning code with intentional design choices.

RESPONSE FLOW: 1-2 line design plan stating aesthetic direction → complete code → brief note after if needed.
RULES:
- Code blocks use ```html:filepath format. The :filepath is REQUIRED.
- HTML has <!DOCTYPE html>, viewport meta, ALL CSS in <style>, ALL JS in <script>
- Mobile responsive ALWAYS. Dark themes: #0a0a0f base, never pure black. Light themes: off-white, never #fff.
- COMPLETE code only. Zero placeholders, zero TODOs. Every file immediately runnable.
- Every design choice is INTENTIONAL — fonts, colors, spacing, animations all serve a purpose."""

ALL = []

def ex(prompt, response):
    ALL.append({"messages": [
        {"role": "system", "content": SYS},
        {"role": "user", "content": prompt},
        {"role": "assistant", "content": response}
    ]})

# ═══════════════════════════════════════════════════════════════════════
# DESIGN SYSTEM KNOWLEDGE BASE
# Every combination creates a unique, intentional page
# ═══════════════════════════════════════════════════════════════════════

FONT_PAIRINGS = {
    "tech-modern": {
        "display": "Space Grotesk", "body": "DM Sans",
        "import": "Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500",
        "display_stack": "'Space Grotesk', sans-serif", "body_stack": "'DM Sans', sans-serif",
        "vibe": "geometric, technical, startup"
    },
    "editorial-warm": {
        "display": "Cormorant Garamond", "body": "DM Sans",
        "import": "Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500",
        "display_stack": "'Cormorant Garamond', serif", "body_stack": "'DM Sans', sans-serif",
        "vibe": "elegant, editorial, premium"
    },
    "bold-statement": {
        "display": "Sora", "body": "Inter",
        "import": "Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600",
        "display_stack": "'Sora', sans-serif", "body_stack": "'Inter', sans-serif",
        "vibe": "bold, punchy, modern"
    },
    "minimal-clean": {
        "display": "Inter", "body": "Inter",
        "import": "Inter:wght@300;400;500;600;700;800",
        "display_stack": "'Inter', sans-serif", "body_stack": "'Inter', sans-serif",
        "vibe": "minimal, Swiss, clean"
    },
    "creative-playful": {
        "display": "Outfit", "body": "Plus Jakarta Sans",
        "import": "Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600",
        "display_stack": "'Outfit', sans-serif", "body_stack": "'Plus Jakarta Sans', sans-serif",
        "vibe": "friendly, rounded, approachable"
    },
    "luxury-serif": {
        "display": "Playfair Display", "body": "Source Sans 3",
        "import": "Playfair+Display:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600",
        "display_stack": "'Playfair Display', serif", "body_stack": "'Source Sans 3', sans-serif",
        "vibe": "luxury, classic, refined"
    },
    "tech-mono": {
        "display": "JetBrains Mono", "body": "Inter",
        "import": "JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600",
        "display_stack": "'JetBrains Mono', monospace", "body_stack": "'Inter', sans-serif",
        "vibe": "developer, technical, code"
    },
    "humanist-warm": {
        "display": "Fraunces", "body": "Commissioner",
        "import": "Fraunces:wght@400;500;600;700&family=Commissioner:wght@400;500;600",
        "display_stack": "'Fraunces', serif", "body_stack": "'Commissioner', sans-serif",
        "vibe": "warm, organic, trustworthy"
    },
}

DARK_PALETTES = {
    "indigo": {
        "bg": "#0a0a0f", "surface": "#12121a", "surface_hover": "#1a1a25",
        "text": "#f0f0f5", "muted": "#71717a", "secondary": "#a1a1aa",
        "primary": "#6366f1", "primary_hover": "#818cf8",
        "primary_subtle": "rgba(99,102,241,0.1)", "primary_glow": "rgba(99,102,241,0.3)",
        "border": "rgba(255,255,255,0.06)", "border_hover": "rgba(255,255,255,0.12)",
    },
    "emerald": {
        "bg": "#0a0f0d", "surface": "#111a16", "surface_hover": "#162420",
        "text": "#f0f5f2", "muted": "#6b8078", "secondary": "#94b0a5",
        "primary": "#10b981", "primary_hover": "#34d399",
        "primary_subtle": "rgba(16,185,129,0.1)", "primary_glow": "rgba(16,185,129,0.3)",
        "border": "rgba(255,255,255,0.06)", "border_hover": "rgba(255,255,255,0.12)",
    },
    "amber": {
        "bg": "#0f0d0a", "surface": "#1a1711", "surface_hover": "#252016",
        "text": "#f5f2f0", "muted": "#807868", "secondary": "#b0a594",
        "primary": "#f59e0b", "primary_hover": "#fbbf24",
        "primary_subtle": "rgba(245,158,11,0.1)", "primary_glow": "rgba(245,158,11,0.3)",
        "border": "rgba(255,255,255,0.06)", "border_hover": "rgba(255,255,255,0.12)",
    },
    "rose": {
        "bg": "#0f0a0c", "surface": "#1a1115", "surface_hover": "#25161d",
        "text": "#f5f0f2", "muted": "#806878", "secondary": "#b094a5",
        "primary": "#f43f5e", "primary_hover": "#fb7185",
        "primary_subtle": "rgba(244,63,94,0.1)", "primary_glow": "rgba(244,63,94,0.3)",
        "border": "rgba(255,255,255,0.06)", "border_hover": "rgba(255,255,255,0.12)",
    },
    "cyan": {
        "bg": "#0a0d0f", "surface": "#111619", "surface_hover": "#161e22",
        "text": "#f0f4f5", "muted": "#687880", "secondary": "#94adb5",
        "primary": "#06b6d4", "primary_hover": "#22d3ee",
        "primary_subtle": "rgba(6,182,212,0.1)", "primary_glow": "rgba(6,182,212,0.3)",
        "border": "rgba(255,255,255,0.06)", "border_hover": "rgba(255,255,255,0.12)",
    },
    "violet": {
        "bg": "#0d0a0f", "surface": "#16111a", "surface_hover": "#1e1625",
        "text": "#f4f0f5", "muted": "#786880", "secondary": "#ad94b5",
        "primary": "#8b5cf6", "primary_hover": "#a78bfa",
        "primary_subtle": "rgba(139,92,246,0.1)", "primary_glow": "rgba(139,92,246,0.3)",
        "border": "rgba(255,255,255,0.06)", "border_hover": "rgba(255,255,255,0.12)",
    },
    "blue": {
        "bg": "#0a0b0f", "surface": "#11131a", "surface_hover": "#161a25",
        "text": "#f0f2f5", "muted": "#687080", "secondary": "#94a3b5",
        "primary": "#3b82f6", "primary_hover": "#60a5fa",
        "primary_subtle": "rgba(59,130,246,0.1)", "primary_glow": "rgba(59,130,246,0.3)",
        "border": "rgba(255,255,255,0.06)", "border_hover": "rgba(255,255,255,0.12)",
    },
    "orange": {
        "bg": "#0f0c0a", "surface": "#1a1511", "surface_hover": "#251e16",
        "text": "#f5f3f0", "muted": "#807060", "secondary": "#b09a88",
        "primary": "#f97316", "primary_hover": "#fb923c",
        "primary_subtle": "rgba(249,115,22,0.1)", "primary_glow": "rgba(249,115,22,0.3)",
        "border": "rgba(255,255,255,0.06)", "border_hover": "rgba(255,255,255,0.12)",
    },
}

LIGHT_PALETTES = {
    "warm-cream": {
        "bg": "#faf9f6", "surface": "#ffffff", "surface_hover": "#f5f3ef",
        "text": "#1a1a1a", "muted": "#71717a", "secondary": "#52525b",
        "primary": "#e07a5f", "primary_hover": "#d4664a",
        "primary_subtle": "rgba(224,122,95,0.08)", "primary_glow": "rgba(224,122,95,0.2)",
        "border": "rgba(0,0,0,0.06)", "border_hover": "rgba(0,0,0,0.12)",
    },
    "cool-white": {
        "bg": "#f8f9fc", "surface": "#ffffff", "surface_hover": "#f0f2f8",
        "text": "#111827", "muted": "#6b7280", "secondary": "#4b5563",
        "primary": "#4f46e5", "primary_hover": "#4338ca",
        "primary_subtle": "rgba(79,70,229,0.06)", "primary_glow": "rgba(79,70,229,0.15)",
        "border": "rgba(0,0,0,0.06)", "border_hover": "rgba(0,0,0,0.12)",
    },
    "sage-soft": {
        "bg": "#f6f9f7", "surface": "#ffffff", "surface_hover": "#eef4f0",
        "text": "#1a2420", "muted": "#6b806f", "secondary": "#4a5e4e",
        "primary": "#2d8659", "primary_hover": "#236b47",
        "primary_subtle": "rgba(45,134,89,0.06)", "primary_glow": "rgba(45,134,89,0.15)",
        "border": "rgba(0,0,0,0.06)", "border_hover": "rgba(0,0,0,0.12)",
    },
    "blush-minimal": {
        "bg": "#fdf8f6", "surface": "#ffffff", "surface_hover": "#f9f0ed",
        "text": "#2d1f1a", "muted": "#8c7268", "secondary": "#6b524a",
        "primary": "#c2524a", "primary_hover": "#a3403a",
        "primary_subtle": "rgba(194,82,74,0.06)", "primary_glow": "rgba(194,82,74,0.15)",
        "border": "rgba(0,0,0,0.06)", "border_hover": "rgba(0,0,0,0.12)",
    },
    "ocean-clean": {
        "bg": "#f6f9fb", "surface": "#ffffff", "surface_hover": "#edf3f8",
        "text": "#0f1d2e", "muted": "#5a7490", "secondary": "#3d5a78",
        "primary": "#0369a1", "primary_hover": "#075985",
        "primary_subtle": "rgba(3,105,161,0.06)", "primary_glow": "rgba(3,105,161,0.15)",
        "border": "rgba(0,0,0,0.06)", "border_hover": "rgba(0,0,0,0.12)",
    },
}

# ═══════════════════════════════════════════════════════════════════════
# INDUSTRIES & BUSINESS TYPES
# ═══════════════════════════════════════════════════════════════════════

BUSINESSES = [
    {"name": "Nexus", "type": "Project Management SaaS", "tagline": "Ship Projects 10x Faster", "desc": "The project management platform that adapts to how your team actually works.", "features": [("📋","Smart Boards","Kanban, timeline, and table views that auto-organize."),("⚡","AI Workflows","Automate tasks with natural language rules."),("📊","Live Dashboards","Real-time metrics on velocity and burndown."),("🔗","50+ Integrations","GitHub, Slack, Figma — two-way sync."),("🛡️","Enterprise Security","SOC 2, SSO, RBAC, and audit logs."),("🌐","Global Collab","Real-time editing with presence and timezone awareness.")]},
    {"name": "Forma", "type": "Design Agency", "tagline": "Digital Experiences That Matter", "desc": "A design studio crafting brands and products for companies that want to stand out.", "features": [("🎨","Brand Identity","Logo, color system, and visual language."),("💻","Web Design","Responsive sites built for conversion."),("📱","Product Design","User research, prototyping, UI for SaaS."),("✨","Motion Design","Animations and micro-interactions."),("📐","Design Systems","Scalable component libraries."),("🔬","User Research","Data-driven design decisions.")]},
    {"name": "Pulse", "type": "Health & Fitness App", "tagline": "Your Body, Quantified", "desc": "AI-powered health tracking that connects your workouts, nutrition, and sleep.", "features": [("❤️","Heart Rate Zones","Optimize training with real-time HR zones."),("🥗","Smart Nutrition","AI meal plans based on your goals."),("😴","Sleep Insights","Track sleep cycles and get improvement tips."),("🏃","Workout Builder","Custom routines with video guides."),("📈","Progress Tracking","Visualize gains with smart charts."),("👥","Social Challenges","Compete with friends on weekly goals.")]},
    {"name": "Zenith", "type": "AI Analytics Platform", "tagline": "Data Intelligence, Simplified", "desc": "Turn raw data into actionable insights with AI-powered analytics.", "features": [("🧠","AI Insights","Automatic pattern detection and anomaly alerts."),("📊","Custom Dashboards","Drag-and-drop dashboard builder."),("🔄","Real-time Sync","Live data from 200+ connectors."),("🎯","Predictive Models","Forecast trends with built-in ML."),("👥","Team Sharing","Collaborative reports with comments."),("🔒","Data Governance","Row-level security and audit trails.")]},
    {"name": "Luminary", "type": "Online Education Platform", "tagline": "Learn From the Best, Anywhere", "desc": "Expert-led courses with interactive coding environments and AI tutoring.", "features": [("🎓","Expert Instructors","Learn from industry professionals."),("💻","Live Coding","Interactive environments in every lesson."),("🤖","AI Tutor","Get instant help when you're stuck."),("📜","Certificates","Verified credentials for your resume."),("👥","Study Groups","Peer learning with discussion forums."),("📱","Mobile Learning","Download lessons for offline access.")]},
    {"name": "Vault", "type": "Fintech / Banking App", "tagline": "Banking That Works For You", "desc": "Modern banking with smart budgets, instant transfers, and zero hidden fees.", "features": [("💳","Smart Cards","Virtual and physical cards with spending controls."),("📊","Auto Budgets","AI categorizes spending and tracks goals."),("💸","Instant Transfers","Send money globally in seconds."),("🏦","High-Yield Savings","Earn 4.5% APY on your balance."),("🔒","Bank-Grade Security","256-bit encryption, biometric auth."),("📱","Pay Anywhere","Apple Pay, Google Pay, and contactless.")]},
    {"name": "Grove", "type": "E-commerce / DTC Brand", "tagline": "Sustainable Living, Delivered", "desc": "Curated eco-friendly products for a better home, delivered to your door.", "features": [("🌱","100% Sustainable","Every product meets our eco standards."),("🚚","Carbon-Neutral Shipping","Free delivery, zero footprint."),("♻️","Refill Program","Subscribe & save with refills."),("🔬","Lab Tested","Independently verified ingredients."),("💚","B Corp Certified","Business as a force for good."),("📦","Plastic-Free Packaging","Fully compostable materials.")]},
    {"name": "Signal", "type": "Marketing Automation SaaS", "tagline": "Grow Revenue on Autopilot", "desc": "Email, SMS, and push campaigns that write and send themselves.", "features": [("📧","AI Copywriter","Generate high-converting copy instantly."),("🎯","Smart Segments","Auto-segment based on behavior."),("📊","A/B Testing","Test everything, scale winners."),("🔄","Workflow Builder","Visual drag-and-drop automations."),("📱","Omni-Channel","Email, SMS, push, and in-app."),("📈","Revenue Attribution","Track every dollar to its source.")]},
    {"name": "Atlas", "type": "Developer Tools / API Platform", "tagline": "Ship APIs in Minutes, Not Months", "desc": "The fastest way to build, test, and deploy production APIs.", "features": [("⚡","Instant APIs","Generate REST and GraphQL from your schema."),("🧪","Built-in Testing","Automated test suites with zero config."),("📖","Auto Documentation","Always up-to-date API docs."),("🔑","Auth & Rate Limiting","JWT, OAuth, API keys out of the box."),("📊","Usage Analytics","Real-time monitoring and alerting."),("🌐","Edge Deployment","Deploy to 200+ locations globally.")]},
    {"name": "Haven", "type": "Real Estate Platform", "tagline": "Find Your Perfect Home", "desc": "AI-powered home search that learns your preferences and finds hidden gems.", "features": [("🏠","Smart Search","AI learns what you love and suggests matches."),("🗺️","Neighborhood Intel","Crime, schools, transit, walkability data."),("💰","Price Predictions","ML-powered price trajectory forecasts."),("📸","3D Virtual Tours","Explore homes without leaving yours."),("📋","Offer Builder","Generate competitive offers in minutes."),("🔔","Instant Alerts","Be first to know about new listings.")]},
    {"name": "Tempo", "type": "Music Production / DAW", "tagline": "Create Music, Anywhere", "desc": "Browser-based music production with AI-powered instruments and collaboration.", "features": [("🎹","AI Instruments","Intelligent synths that follow your style."),("🎚️","Pro Mixer","Studio-grade mixing and mastering."),("🤝","Live Collab","Make music with anyone, anywhere."),("📦","Sound Library","50,000+ royalty-free samples."),("🔌","Plugin Support","VST and AU plugin compatibility."),("☁️","Cloud Projects","Access your work from any device.")]},
    {"name": "Shield", "type": "Cybersecurity Platform", "tagline": "Security That Never Sleeps", "desc": "Enterprise threat detection and response powered by AI.", "features": [("🛡️","Threat Detection","AI-powered anomaly detection in real-time."),("🔍","Vulnerability Scanning","Continuous scanning of your infrastructure."),("📋","Compliance","SOC 2, HIPAA, GDPR compliance automation."),("🚨","Incident Response","Automated playbooks for rapid response."),("👥","Team Training","Phishing simulations and security awareness."),("📊","Risk Dashboards","Executive-level security posture views.")]},
    {"name": "Bloom", "type": "HR / People Platform", "tagline": "Where Great Teams Grow", "desc": "Modern people management — from hiring to engagement to growth.", "features": [("👋","Smart Onboarding","Automated workflows that welcome new hires."),("📊","People Analytics","Insights on engagement, retention, and growth."),("🎯","Performance Reviews","360° feedback with AI-assisted writing."),("💰","Payroll","One-click payroll in 50+ countries."),("📅","Time & Attendance","Auto-tracking with flexible PTO policies."),("🌱","Growth Plans","Personalized development paths for every employee.")]},
    {"name": "Orbit", "type": "CRM Platform", "tagline": "Close Deals Faster", "desc": "AI-powered CRM that predicts, prioritizes, and personalizes every touchpoint.", "features": [("🎯","Lead Scoring","AI ranks leads by conversion likelihood."),("📧","Auto Outreach","Personalized sequences at scale."),("📊","Pipeline Viz","Visual deal stages with forecasting."),("🔗","Integrations","Sync with Gmail, Outlook, Slack, HubSpot."),("📱","Mobile CRM","Full functionality on the go."),("📋","Smart Reports","Auto-generated sales insights weekly.")]},
    {"name": "Horizon", "type": "Travel Platform", "tagline": "Adventures, Curated For You", "desc": "AI-planned itineraries with exclusive deals from verified local guides.", "features": [("🗺️","AI Itineraries","Personalized trip plans in seconds."),("🏨","Best-Price Guarantee","We match or beat any booking price."),("🧭","Local Guides","Vetted guides for authentic experiences."),("📸","Visual Search","Upload a photo, find the destination."),("💳","Flexible Booking","Free cancellation up to 24 hours."),("📱","Offline Maps","Navigate without internet abroad.")]},
    {"name": "Prism", "type": "Data Visualization Tool", "tagline": "See Your Data Clearly", "desc": "Beautiful charts and dashboards from any data source in minutes.", "features": [("📊","Smart Charts","AI suggests the best visualization for your data."),("🔗","200+ Connectors","SQL, Sheets, APIs — connect anything."),("🎨","Custom Themes","Brand your dashboards with your colors."),("👥","Team Sharing","Collaborate with comments and annotations."),("📱","Responsive","Dashboards that work on any screen."),("⚡","Real-time","Live data updates without refresh.")]},
]

# ═══════════════════════════════════════════════════════════════════════
# PROMPT VARIATIONS
# ═══════════════════════════════════════════════════════════════════════

PROMPT_TEMPLATES = [
    "Build a dark SaaS landing page for a {type} called {name} with a hero section, animated stats counter, feature cards with hover effects, and a pricing section",
    "Create a landing page for {name} — a {type}. Include navigation, hero, features grid, testimonials, and CTA",
    "Make a modern landing page for {name} ({type}). Dark theme, glass morphism nav, gradient headings, animated feature cards, and pricing tiers",
    "Build a {theme} landing page for a {type} called {name}. Hero with badge, stats row, 6 feature cards, 3 pricing tiers, footer",
    "Create a professional website for {name}, a {type}. Needs hero, features, pricing, FAQ accordion, and footer",
    "Design a conversion-focused landing page for {name} ({type}). Include social proof, feature breakdown, pricing comparison, and strong CTA",
    "Build a sleek {theme} page for {name} ({type}) with animated hero, scrolling stats, feature grid with icons, and a call-to-action section",
    "Make a high-end landing page for {name} — it's a {type}. Use professional typography, subtle animations, feature cards, and pricing",
]

# ═══════════════════════════════════════════════════════════════════════
# HTML TEMPLATE ENGINE
# ═══════════════════════════════════════════════════════════════════════

def make_page(biz, fonts, palette, is_dark, has_pricing=True, has_stats=True, has_testimonials=False, has_faq=False, hero_style="centered", card_style="standard"):
    """Generate a complete, unique HTML page from design system components."""
    
    theme = "dark" if is_dark else "light"
    p = palette  # shorthand
    f = fonts
    b = biz
    
    # Pricing data
    pricing_html = ""
    if has_pricing:
        plans = [
            ("Starter", "$0", "/mo", "For individuals & small teams", ["Up to 3 users","Core features","Community support","1GB storage"]),
            ("Pro", "$19", "/user/mo", "For growing teams", ["Unlimited users", "Advanced features", "Priority support", "100GB storage", "API access"]),
            ("Enterprise", "Custom", "", "For large organizations", ["Everything in Pro", "SSO & SAML", "Dedicated support", "Custom SLA", "Data residency"]),
        ]
        cards_html = ""
        for i, (name, price, period, desc, feats) in enumerate(plans):
            featured = ' featured' if i == 1 else ''
            badge = f'\n        <div class="price-badge">Most Popular</div>' if i == 1 else ''
            feat_items = "".join(f"<li>{feat}</li>" for feat in feats)
            btn_class = "btn-primary" if i == 1 else "btn-ghost"
            btn_text = "Start Free Trial →" if i == 1 else ("Get Started" if i == 0 else "Contact Sales")
            cards_html += f"""
      <div class="price-card{featured}">{badge}
        <div class="price-name">{name}</div>
        <div class="price-amount">{price}<span>{period}</span></div>
        <div class="price-desc">{desc}</div>
        <ul class="price-features">{feat_items}</ul>
        <button class="btn {btn_class}">{btn_text}</button>
      </div>"""
        pricing_html = f"""
  <section class="pricing" id="pricing">
    <div class="section-header"><h2>Simple, transparent pricing</h2><p>Start free. Scale when you're ready.</p></div>
    <div class="pricing-grid">{cards_html}
    </div>
  </section>"""

    # Stats data
    stats_html = ""
    if has_stats:
        stats_data = [("12,000+","Active Teams"),("99.9%","Uptime SLA"),("< 50ms","Avg Response"),("150+","Countries")]
        items = "".join(f'<div class="stat"><div class="stat-number" data-target="{s[0]}">{s[0]}</div><div class="stat-label">{s[1]}</div></div>' for s in stats_data)
        stats_html = f'\n  <section class="stats">{items}</section>'

    # Features
    feat_cards = ""
    for icon, title, desc in b["features"]:
        feat_cards += f"""
      <div class="feature-card fade-in">
        <div class="feature-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>"""
    
    features_html = f"""
  <section class="features" id="features">
    <div class="section-header"><h2>Everything you need</h2><p>Powerful features that grow with your team</p></div>
    <div class="features-grid">{feat_cards}
    </div>
  </section>"""

    # Testimonials
    testimonials_html = ""
    if has_testimonials:
        quotes = [
            (f"{b['name']} transformed how our team works. We shipped 3x faster in the first month.", "Sarah Chen", "CTO at Meridian"),
            ("The best tool we've adopted this year. Period.", "Marcus Reeves", "VP Engineering at Scale"),
            (f"We evaluated 12 tools before choosing {b['name']}. No regrets.", "Priya Patel", "Founder at Lumina"),
        ]
        cards = ""
        for quote, name, role in quotes:
            cards += f"""
      <div class="testimonial-card">
        <p>"{quote}"</p>
        <div class="testimonial-author"><strong>{name}</strong><span>{role}</span></div>
      </div>"""
        testimonials_html = f"""
  <section class="testimonials">
    <div class="section-header"><h2>Loved by teams everywhere</h2></div>
    <div class="testimonials-grid">{cards}
    </div>
  </section>"""

    # FAQ
    faq_html = ""
    if has_faq:
        faqs = [
            ("Is there a free plan?", f"Yes! {b['name']} offers a generous free tier for individuals and small teams. No credit card required."),
            ("Can I cancel anytime?", "Absolutely. No contracts, no cancellation fees. You can downgrade or cancel at any time."),
            ("Is my data secure?", "We use bank-grade encryption, are SOC 2 Type II certified, and offer data residency controls."),
            ("Do you offer discounts for startups?", "Yes! We offer 50% off for the first year for qualifying startups. Contact us to learn more."),
        ]
        items = ""
        for i, (q, a) in enumerate(faqs):
            items += f"""
      <div class="faq-item" onclick="this.classList.toggle('open')">
        <div class="faq-question"><span>{q}</span><span class="faq-toggle">+</span></div>
        <div class="faq-answer"><p>{a}</p></div>
      </div>"""
        faq_html = f"""
  <section class="faq">
    <div class="section-header"><h2>Frequently asked questions</h2></div>
    <div class="faq-list">{items}
    </div>
  </section>"""

    # Hero variations
    if hero_style == "centered":
        hero_content = f"""
    <div class="hero-badge">✨ New: AI-powered features</div>
    <h1>{b['tagline'].split(' ')[0]} <span>{' '.join(b['tagline'].split(' ')[1:])}</span></h1>
    <p>{b['desc']}</p>
    <div class="hero-cta">
      <button class="btn btn-primary">Get Started Free →</button>
      <button class="btn btn-ghost">▶ Watch Demo</button>
    </div>"""
        hero_css_extra = "text-align: center;"
        hero_h1_max = "max-width: 700px; margin: 0 auto 20px;"
        hero_p_max = "max-width: 520px; margin: 0 auto 40px;"
    elif hero_style == "left-aligned":
        hero_content = f"""
    <div class="hero-badge">✨ Now in public beta</div>
    <h1>{b['tagline']}</h1>
    <p>{b['desc']}</p>
    <div class="hero-cta">
      <button class="btn btn-primary">Start Free Trial →</button>
      <button class="btn btn-ghost">Learn More</button>
    </div>"""
        hero_css_extra = ""
        hero_h1_max = "max-width: 600px; margin-bottom: 20px;"
        hero_p_max = "max-width: 480px; margin-bottom: 40px;"
    else:  # split
        hero_content = f"""
    <div class="hero-text">
      <div class="hero-badge">✨ Trusted by 10,000+ teams</div>
      <h1>{b['tagline']}</h1>
      <p>{b['desc']}</p>
      <div class="hero-cta">
        <button class="btn btn-primary">Get Started →</button>
        <button class="btn btn-ghost">See Pricing</button>
      </div>
    </div>
    <div class="hero-visual"></div>"""
        hero_css_extra = "display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center;"
        hero_h1_max = "margin-bottom: 20px;"
        hero_p_max = "margin-bottom: 40px;"

    # Card style variations
    if card_style == "glass":
        card_bg = f"background: rgba({'255,255,255' if is_dark else '0,0,0'},{'0.03' if is_dark else '0.02'}); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);"
    elif card_style == "bordered":
        card_bg = f"background: transparent; border: 1.5px solid {p['border_hover']};"
    else:
        card_bg = f"background: {p['surface']};"

    # Testimonial CSS
    testimonial_css = """
  .testimonials { max-width: 1200px; margin: 0 auto; padding: 80px 24px; }
  .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
  .testimonial-card { padding: 28px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
  .testimonial-card p { font-size: 15px; font-style: italic; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.7; }
  .testimonial-author { font-size: 14px; }
  .testimonial-author strong { color: var(--text); display: block; }
  .testimonial-author span { color: var(--muted); }""" if has_testimonials else ""

    # FAQ CSS
    faq_css = """
  .faq { max-width: 700px; margin: 0 auto; padding: 80px 24px; }
  .faq-list { display: flex; flex-direction: column; gap: 8px; }
  .faq-item { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; cursor: pointer; transition: border-color 0.2s; }
  .faq-item:hover { border-color: var(--border-hover); }
  .faq-question { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 15px; }
  .faq-toggle { font-size: 20px; color: var(--muted); transition: transform 0.2s; }
  .faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.3s ease, padding 0.3s ease; }
  .faq-answer p { padding: 0 20px; font-size: 14px; color: var(--muted); line-height: 1.7; }
  .faq-item.open .faq-answer { max-height: 200px; }
  .faq-item.open .faq-answer p { padding: 0 20px 16px; }
  .faq-item.open .faq-toggle { transform: rotate(45deg); }""" if has_faq else ""

    # Hero split CSS
    hero_visual_css = ""
    if hero_style == "split":
        hero_visual_css = f"""
  .hero-visual {{ aspect-ratio: 4/3; background: {'linear-gradient(135deg, ' + p['surface'] + ', ' + p['surface_hover'] + ')'}; border-radius: var(--radius-lg); border: 1px solid var(--border); }}
  @media (max-width: 768px) {{ .hero {{ grid-template-columns: 1fr !important; }} .hero-visual {{ display: none; }} }}"""

    # ── BUILD THE FULL PAGE ──
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{b['name']} — {b['type']}</title>
<link href="https://fonts.googleapis.com/css2?family={f['import']}&display=swap" rel="stylesheet">
<style>
  :root {{
    --bg: {p['bg']}; --surface: {p['surface']}; --surface-hover: {p['surface_hover']};
    --text: {p['text']}; --muted: {p['muted']}; --text-secondary: {p['secondary']};
    --primary: {p['primary']}; --primary-hover: {p['primary_hover']};
    --primary-subtle: {p['primary_subtle']}; --primary-glow: {p['primary_glow']};
    --border: {p['border']}; --border-hover: {p['border_hover']};
    --font-display: {f['display_stack']}; --font-body: {f['body_stack']};
    --radius: 12px; --radius-lg: 16px;
  }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: var(--font-body); background: var(--bg); color: var(--text); line-height: 1.6; overflow-x: hidden; }}
  a {{ text-decoration: none; color: inherit; }}

  /* Navigation */
  nav {{ position: fixed; top: 0; width: 100%; z-index: 100; padding: 16px 24px; background: {'rgba(10,10,15,0.8)' if is_dark else 'rgba(255,255,255,0.85)'}; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); }}
  .nav-inner {{ max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }}
  .logo {{ font-family: var(--font-display); font-size: 22px; font-weight: 700; {'background: linear-gradient(135deg, var(--primary), var(--primary-hover)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;' if is_dark else 'color: var(--text);'} }}
  .nav-links {{ display: flex; gap: 32px; align-items: center; }}
  .nav-links a {{ font-size: 14px; color: var(--muted); transition: color 0.2s; }}
  .nav-links a:hover {{ color: var(--text); }}
  .btn {{ padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; font-family: var(--font-body); }}
  .btn-primary {{ background: var(--primary); color: white; }}
  .btn-primary:hover {{ background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 0 20px var(--primary-glow); }}
  .btn-ghost {{ background: transparent; color: var(--text); border: 1px solid var(--border); }}
  .btn-ghost:hover {{ border-color: var(--border-hover); background: var(--surface); }}

  /* Hero */
  .hero {{ padding: 160px 24px 80px; max-width: 1200px; margin: 0 auto; {hero_css_extra} position: relative; }}
  .hero::before {{ content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 600px; height: 600px; background: radial-gradient(circle, var(--primary-subtle), transparent 70%); pointer-events: none; }}
  .hero-badge {{ display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; background: var(--primary-subtle); border: 1px solid {'rgba(255,255,255,0.08)' if is_dark else 'rgba(0,0,0,0.06)'}; border-radius: 100px; font-size: 13px; color: var(--primary-hover); margin-bottom: 24px; }}
  .hero h1 {{ font-family: var(--font-display); font-size: clamp(36px, 6vw, 64px); font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; {hero_h1_max} }}
  .hero h1 span {{ {'background: linear-gradient(135deg, var(--primary), var(--primary-hover)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;' if is_dark else 'color: var(--primary);'} }}
  .hero p {{ font-size: 18px; color: var(--muted); {hero_p_max} }}
  .hero-cta {{ display: flex; gap: 12px; {'justify-content: center;' if hero_style == 'centered' else ''} flex-wrap: wrap; }}
  {hero_visual_css}

  /* Section Header */
  .section-header {{ text-align: center; margin-bottom: 60px; }}
  .section-header h2 {{ font-family: var(--font-display); font-size: 36px; font-weight: 700; margin-bottom: 12px; }}
  .section-header p {{ color: var(--muted); font-size: 16px; }}

  /* Stats */
  .stats {{ display: flex; justify-content: center; gap: 48px; padding: 60px 24px; flex-wrap: wrap; }}
  .stat {{ text-align: center; }}
  .stat-number {{ font-family: var(--font-display); font-size: 42px; font-weight: 700; color: var(--primary-hover); }}
  .stat-label {{ font-size: 14px; color: var(--muted); margin-top: 4px; }}

  /* Features */
  .features {{ max-width: 1200px; margin: 0 auto; padding: 80px 24px; }}
  .features-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }}
  .feature-card {{ padding: 32px; {card_bg} border: 1px solid var(--border); border-radius: var(--radius-lg); transition: all 0.3s; }}
  .feature-card:hover {{ border-color: var(--border-hover); transform: translateY(-4px); box-shadow: 0 12px 24px {'rgba(0,0,0,0.3)' if is_dark else 'rgba(0,0,0,0.06)'}; }}
  .feature-icon {{ width: 48px; height: 48px; border-radius: 12px; background: var(--primary-subtle); display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 16px; }}
  .feature-card h3 {{ font-family: var(--font-display); font-size: 18px; font-weight: 600; margin-bottom: 8px; }}
  .feature-card p {{ font-size: 14px; color: var(--muted); line-height: 1.6; }}

  /* Pricing */
  .pricing {{ max-width: 1000px; margin: 0 auto; padding: 80px 24px; }}
  .pricing-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }}
  .price-card {{ padding: 32px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); position: relative; }}
  .price-card.featured {{ border-color: var(--primary); {'background: linear-gradient(180deg, var(--primary-subtle), var(--surface));' if is_dark else ''} }}
  .price-badge {{ position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--primary); color: white; padding: 4px 16px; border-radius: 100px; font-size: 12px; font-weight: 600; }}
  .price-name {{ font-family: var(--font-display); font-size: 20px; font-weight: 600; margin-bottom: 8px; }}
  .price-amount {{ font-family: var(--font-display); font-size: 48px; font-weight: 700; margin-bottom: 4px; }}
  .price-amount span {{ font-size: 16px; color: var(--muted); font-weight: 400; }}
  .price-desc {{ font-size: 14px; color: var(--muted); margin-bottom: 24px; }}
  .price-features {{ list-style: none; margin-bottom: 32px; }}
  .price-features li {{ padding: 8px 0; font-size: 14px; color: var(--text-secondary); display: flex; align-items: center; gap: 8px; }}
  .price-features li::before {{ content: '✓'; color: var(--primary-hover); font-weight: 700; }}
  .price-card .btn {{ width: 100%; text-align: center; display: block; }}
  {testimonial_css}
  {faq_css}

  /* CTA */
  .cta-section {{ max-width: 800px; margin: 0 auto; padding: 80px 24px; text-align: center; }}
  .cta-section h2 {{ font-family: var(--font-display); font-size: 40px; font-weight: 700; margin-bottom: 16px; }}
  .cta-section p {{ color: var(--muted); font-size: 17px; margin-bottom: 32px; }}

  /* Footer */
  footer {{ max-width: 1200px; margin: 0 auto; padding: 32px 24px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; color: var(--muted); font-size: 13px; flex-wrap: wrap; gap: 8px; }}

  /* Animations */
  .fade-in {{ opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }}
  .fade-in.visible {{ opacity: 1; transform: translateY(0); }}

  /* Mobile */
  @media (max-width: 768px) {{
    .nav-links {{ display: none; }}
    .hero {{ padding-top: 100px; }}
    .hero h1 {{ font-size: 32px; }}
    .stats {{ gap: 24px; }}
    .stat-number {{ font-size: 32px; }}
    .features-grid, .pricing-grid, .testimonials-grid {{ grid-template-columns: 1fr; }}
    footer {{ flex-direction: column; }}
  }}
  @media (prefers-reduced-motion: reduce) {{ .fade-in {{ opacity: 1; transform: none; transition: none; }} }}
</style>
</head>
<body>
  <nav><div class="nav-inner">
    <a href="#" class="logo">{b['name']}</a>
    <div class="nav-links">
      <a href="#features">Features</a>{'<a href="#pricing">Pricing</a>' if has_pricing else ''}<a href="#">Docs</a>
      <button class="btn btn-ghost">Sign In</button>
      <button class="btn btn-primary">Get Started →</button>
    </div>
  </div></nav>

  <section class="hero">{hero_content}
  </section>
  {stats_html}
  {features_html}
  {testimonials_html}
  {pricing_html}
  {faq_html}

  <section class="cta-section">
    <h2>Ready to get started?</h2>
    <p>Join thousands of teams already using {b['name']} to {b['desc'].split('.')[0].lower().replace(b['name'].lower(), 'their workflow')}.</p>
    <button class="btn btn-primary">Start Free Trial →</button>
  </section>

  <footer><span>© 2026 {b['name']}. All rights reserved.</span><span>Privacy · Terms · Status</span></footer>

  <script>
    // Fade-in on scroll
    const faders = document.querySelectorAll('.fade-in');
    const fadeObs = new IntersectionObserver(entries => {{
      entries.forEach(e => {{ if (e.isIntersecting) {{ e.target.classList.add('visible'); fadeObs.unobserve(e.target); }} }});
    }}, {{ threshold: 0.1, rootMargin: '0px 0px -50px 0px' }});
    faders.forEach(f => fadeObs.observe(f));
  </script>
</body>
</html>"""
    return html

# ═══════════════════════════════════════════════════════════════════════
# GENERATE ALL COMBINATIONS
# ═══════════════════════════════════════════════════════════════════════

print("Generating full-page training data v2...")
print(f"Businesses: {len(BUSINESSES)}")
print(f"Font pairings: {len(FONT_PAIRINGS)}")
print(f"Dark palettes: {len(DARK_PALETTES)}")
print(f"Light palettes: {len(LIGHT_PALETTES)}")

count = 0

# Dark theme pages — every business × every font × every palette
dark_font_keys = list(FONT_PAIRINGS.keys())
dark_palette_keys = list(DARK_PALETTES.keys())
hero_styles = ["centered", "left-aligned", "split"]
card_styles = ["standard", "glass", "bordered"]

for biz in BUSINESSES:
    # Each business gets multiple dark and light variations
    for fi, font_key in enumerate(dark_font_keys):
        fonts = FONT_PAIRINGS[font_key]
        
        # Pick palette based on deterministic rotation
        pal_key = dark_palette_keys[(fi + BUSINESSES.index(biz)) % len(dark_palette_keys)]
        palette = DARK_PALETTES[pal_key]
        
        # Vary components per combination
        hero = hero_styles[(fi + BUSINESSES.index(biz)) % 3]
        cards = card_styles[fi % 3]
        has_pricing = fi % 3 != 2  # 2/3 have pricing
        has_stats = fi % 4 != 3    # 3/4 have stats
        has_testimonials = fi % 3 == 1
        has_faq = fi % 4 == 2
        
        # Generate the page
        html = make_page(biz, fonts, palette, True, has_pricing, has_stats, has_testimonials, has_faq, hero, cards)
        
        # Pick a prompt template
        tmpl = PROMPT_TEMPLATES[(fi + BUSINESSES.index(biz)) % len(PROMPT_TEMPLATES)]
        prompt = tmpl.format(name=biz['name'], type=biz['type'], theme="dark")
        
        # Build the intro line (design plan)
        intro = f"Building a dark {biz['type'].lower()} page with {fonts['display']} + {fonts['body']}, {pal_key} accent palette, {hero} hero, {cards} cards{', glass morphism nav' if cards == 'glass' else ''}{', animated stats' if has_stats else ''}{', pricing tiers' if has_pricing else ''}{', testimonials' if has_testimonials else ''}{', FAQ accordion' if has_faq else ''}."
        
        response = f"{intro}\n\n```html:index.html\n{html}\n```"
        ex(prompt, response)
        count += 1

    # Light theme variations (fewer — 3 per business)
    light_pal_keys = list(LIGHT_PALETTES.keys())
    for li in range(min(3, len(light_pal_keys))):
        font_key = dark_font_keys[(li + BUSINESSES.index(biz) * 2) % len(dark_font_keys)]
        fonts = FONT_PAIRINGS[font_key]
        pal_key = light_pal_keys[(li + BUSINESSES.index(biz)) % len(light_pal_keys)]
        palette = LIGHT_PALETTES[pal_key]
        
        hero = hero_styles[(li + 1) % 3]
        cards = card_styles[(li + 1) % 3]
        
        html = make_page(biz, fonts, palette, False, True, li != 1, li == 0, li == 2, hero, cards)
        
        prompt_templates_light = [
            f"Create a clean, light-themed landing page for {biz['name']} — a {biz['type']}",
            f"Build a professional light {biz['type'].lower()} website for {biz['name']} with modern design",
            f"Design a minimal light-mode landing page for a {biz['type']} called {biz['name']}",
        ]
        prompt = prompt_templates_light[li % 3]
        
        intro = f"Building a light {biz['type'].lower()} page with {fonts['display']} + {fonts['body']}, {pal_key} palette, {hero} hero, {cards} cards, warm off-white background."
        response = f"{intro}\n\n```html:index.html\n{html}\n```"
        ex(prompt, response)
        count += 1

print(f"\nGenerated {count} full-page examples")

# ═══════════════════════════════════════════════════════════════════════
# COMPONENT-SPECIFIC EXAMPLES (how to build individual sections)
# ═══════════════════════════════════════════════════════════════════════

# Navigation variations
nav_variations = [
    ("Build a glass morphism navbar with logo, links, and CTA button — dark theme",
     """Building a frosted glass nav with backdrop blur, subtle border, and hover transitions.

```html:nav.html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Glass Nav</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #0a0a0f; color: #f0f0f5; min-height: 200vh; background-image: radial-gradient(circle at 30% 20%, rgba(99,102,241,0.08), transparent 50%); }
  nav { position: fixed; top: 0; width: 100%; z-index: 100; padding: 14px 24px; background: rgba(10,10,15,0.75); backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%); border-bottom: 1px solid rgba(255,255,255,0.06); }
  .nav-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
  .logo { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; background: linear-gradient(135deg, #6366f1, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .nav-center { display: flex; gap: 8px; padding: 4px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; }
  .nav-center a { padding: 8px 16px; font-size: 13px; font-weight: 500; color: #71717a; border-radius: 8px; transition: all 0.2s; text-decoration: none; }
  .nav-center a:hover { color: #f0f0f5; background: rgba(255,255,255,0.05); }
  .nav-center a.active { color: #f0f0f5; background: rgba(255,255,255,0.08); }
  .nav-right { display: flex; gap: 10px; align-items: center; }
  .btn-ghost { padding: 8px 16px; background: transparent; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: #a1a1aa; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: inherit; }
  .btn-ghost:hover { border-color: rgba(255,255,255,0.15); color: #f0f0f5; }
  .btn-primary { padding: 8px 20px; background: #6366f1; border: none; border-radius: 8px; color: white; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; }
  .btn-primary:hover { background: #818cf8; transform: translateY(-1px); box-shadow: 0 0 20px rgba(99,102,241,0.3); }
  @media (max-width: 768px) { .nav-center { display: none; } }
</style>
</head>
<body>
  <nav><div class="nav-inner">
    <div class="logo">Nexus</div>
    <div class="nav-center">
      <a href="#" class="active">Product</a><a href="#">Features</a><a href="#">Pricing</a><a href="#">Docs</a>
    </div>
    <div class="nav-right">
      <button class="btn-ghost">Sign In</button>
      <button class="btn-primary">Get Started</button>
    </div>
  </div></nav>
</body>
</html>
```"""),

    ("Create a minimal transparent navbar for a light theme website",
     """Building a minimal nav with transparent background, gentle shadow on scroll, and clean typography.

```html:nav-light.html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Light Nav</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DM Sans', sans-serif; background: #faf9f6; color: #1a1a1a; min-height: 200vh; }
  nav { position: fixed; top: 0; width: 100%; z-index: 100; padding: 16px 24px; background: rgba(250,249,246,0.9); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); transition: box-shadow 0.3s; }
  nav.scrolled { box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .nav-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
  .logo { font-size: 20px; font-weight: 700; letter-spacing: -0.03em; }
  .nav-links { display: flex; gap: 28px; }
  .nav-links a { font-size: 14px; color: #71717a; text-decoration: none; font-weight: 500; transition: color 0.2s; }
  .nav-links a:hover { color: #1a1a1a; }
  .btn { padding: 9px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
  .btn-fill { background: #1a1a1a; color: #faf9f6; border: none; }
  .btn-fill:hover { background: #333; transform: translateY(-1px); }
  @media (max-width: 768px) { .nav-links { display: none; } }
</style>
</head>
<body>
  <nav id="nav"><div class="nav-inner">
    <div class="logo">Forma</div>
    <div class="nav-links"><a href="#">Work</a><a href="#">Services</a><a href="#">About</a><a href="#">Contact</a></div>
    <button class="btn btn-fill">Get in Touch</button>
  </div></nav>
  <script>
    window.addEventListener('scroll', () => {
      document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 10);
    });
  </script>
</body>
</html>
```"""),
]

for prompt, response in nav_variations:
    ex(prompt, response)
    count += 1

# Hero section variations
hero_variations = [
    ("Make a hero section with gradient text, badge, and animated background glow",
     """Building a centered hero with gradient heading, pill badge, dual CTAs, and a radial glow effect behind the heading.

```html:hero.html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hero Section</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DM Sans', sans-serif; background: #0a0a0f; color: #f0f0f5; }
  .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 80px 24px; position: relative; overflow: hidden; }
  .hero::before { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 800px; height: 800px; background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.06) 40%, transparent 70%); pointer-events: none; animation: pulse 4s ease-in-out infinite alternate; }
  @keyframes pulse { from { opacity: 0.6; transform: translate(-50%,-50%) scale(0.95); } to { opacity: 1; transform: translate(-50%,-50%) scale(1.05); } }
  .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px 6px 8px; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); border-radius: 100px; font-size: 13px; color: #818cf8; margin-bottom: 28px; position: relative; z-index: 1; }
  .badge-dot { width: 8px; height: 8px; border-radius: 50%; background: #6366f1; animation: blink 2s infinite; }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  h1 { font-family: 'Space Grotesk', sans-serif; font-size: clamp(40px, 7vw, 72px); font-weight: 700; line-height: 1.05; letter-spacing: -0.03em; max-width: 750px; margin-bottom: 20px; position: relative; z-index: 1; }
  h1 span { background: linear-gradient(135deg, #6366f1 0%, #a78bfa 50%, #c084fc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .subtitle { font-size: 18px; color: #71717a; max-width: 500px; margin-bottom: 40px; line-height: 1.6; position: relative; z-index: 1; }
  .cta-group { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; position: relative; z-index: 1; }
  .btn { padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; font-family: 'DM Sans', sans-serif; }
  .btn-primary { background: #6366f1; color: white; }
  .btn-primary:hover { background: #818cf8; transform: translateY(-2px); box-shadow: 0 4px 24px rgba(99,102,241,0.4); }
  .btn-secondary { background: rgba(255,255,255,0.06); color: #f0f0f5; border: 1px solid rgba(255,255,255,0.1); }
  .btn-secondary:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.15); }
  .trusted { margin-top: 60px; font-size: 13px; color: #52525b; position: relative; z-index: 1; }
  .trusted-logos { display: flex; gap: 32px; align-items: center; margin-top: 16px; opacity: 0.4; }
  .trusted-logos span { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
</style>
</head>
<body>
  <section class="hero">
    <div class="badge"><span class="badge-dot"></span> Now with AI-powered features</div>
    <h1>Build Something <span>Extraordinary</span></h1>
    <p class="subtitle">The all-in-one platform for teams that ship fast. From idea to production in record time.</p>
    <div class="cta-group">
      <button class="btn btn-primary">Start Building Free →</button>
      <button class="btn btn-secondary">▶ Watch Demo</button>
    </div>
    <div class="trusted">
      Trusted by teams at
      <div class="trusted-logos"><span>Stripe</span><span>Vercel</span><span>Linear</span><span>Notion</span></div>
    </div>
  </section>
</body>
</html>
```"""),
]

for prompt, response in hero_variations:
    ex(prompt, response)
    count += 1

# Pricing section variations
pricing_variations = [
    ("Create a dark pricing section with 3 tiers and a highlighted popular plan",
     """Building a 3-tier pricing section with indigo accent, featured middle card with gradient border, and check-mark feature lists.

```html:pricing.html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pricing</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DM Sans', sans-serif; background: #0a0a0f; color: #f0f0f5; padding: 80px 24px; }
  .header { text-align: center; margin-bottom: 60px; }
  .header h2 { font-family: 'Space Grotesk', sans-serif; font-size: 40px; font-weight: 700; margin-bottom: 12px; }
  .header p { color: #71717a; font-size: 16px; }
  .toggle { display: flex; justify-content: center; gap: 8px; margin-top: 24px; }
  .toggle button { padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #71717a; font-family: inherit; transition: all 0.2s; }
  .toggle button.active { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.3); color: #818cf8; }
  .grid { max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .card { padding: 36px 28px; background: #12121a; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; display: flex; flex-direction: column; }
  .card.featured { border-color: #6366f1; background: linear-gradient(180deg, rgba(99,102,241,0.08) 0%, #12121a 50%); position: relative; }
  .card.featured .badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #6366f1, #a78bfa); color: white; padding: 4px 16px; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .plan-name { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 600; margin-bottom: 12px; }
  .price { font-family: 'Space Grotesk', sans-serif; font-size: 48px; font-weight: 700; line-height: 1; }
  .price span { font-size: 16px; font-weight: 400; color: #71717a; }
  .plan-desc { font-size: 14px; color: #71717a; margin: 12px 0 24px; }
  .features { list-style: none; flex: 1; margin-bottom: 28px; }
  .features li { padding: 10px 0; font-size: 14px; color: #a1a1aa; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.03); }
  .features li:last-child { border: none; }
  .check { color: #6366f1; font-weight: 700; font-size: 14px; }
  .btn { padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; font-family: inherit; transition: all 0.2s; text-align: center; }
  .btn-primary { background: #6366f1; color: white; }
  .btn-primary:hover { background: #818cf8; transform: translateY(-1px); }
  .btn-outline { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #f0f0f5; }
  .btn-outline:hover { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.03); }
  @media (max-width: 768px) { .grid { grid-template-columns: 1fr; max-width: 400px; } }
</style>
</head>
<body>
  <div class="header">
    <h2>Simple pricing for everyone</h2>
    <p>No hidden fees. No surprises. Cancel anytime.</p>
    <div class="toggle"><button class="active">Monthly</button><button>Annual (Save 20%)</button></div>
  </div>
  <div class="grid">
    <div class="card">
      <div class="plan-name">Starter</div>
      <div class="price">$0<span>/mo</span></div>
      <div class="plan-desc">Perfect for side projects</div>
      <ul class="features">
        <li><span class="check">✓</span> Up to 3 projects</li>
        <li><span class="check">✓</span> 1GB storage</li>
        <li><span class="check">✓</span> Community support</li>
        <li><span class="check">✓</span> Basic analytics</li>
      </ul>
      <button class="btn btn-outline">Get Started</button>
    </div>
    <div class="card featured">
      <div class="badge">Most Popular</div>
      <div class="plan-name">Pro</div>
      <div class="price">$19<span>/mo</span></div>
      <div class="plan-desc">For growing teams</div>
      <ul class="features">
        <li><span class="check">✓</span> Unlimited projects</li>
        <li><span class="check">✓</span> 100GB storage</li>
        <li><span class="check">✓</span> Priority support</li>
        <li><span class="check">✓</span> Advanced analytics</li>
        <li><span class="check">✓</span> API access</li>
        <li><span class="check">✓</span> Team collaboration</li>
      </ul>
      <button class="btn btn-primary">Start Free Trial →</button>
    </div>
    <div class="card">
      <div class="plan-name">Enterprise</div>
      <div class="price">Custom</div>
      <div class="plan-desc">For large organizations</div>
      <ul class="features">
        <li><span class="check">✓</span> Everything in Pro</li>
        <li><span class="check">✓</span> SSO & SAML</li>
        <li><span class="check">✓</span> Dedicated support</li>
        <li><span class="check">✓</span> SLA guarantee</li>
        <li><span class="check">✓</span> Custom contracts</li>
      </ul>
      <button class="btn btn-outline">Contact Sales</button>
    </div>
  </div>
</body>
</html>
```"""),
]

for prompt, response in pricing_variations:
    ex(prompt, response)
    count += 1

# Feature card variations
feature_variations = [
    ("Build a features grid with icon cards, hover lift effect, and glass morphism — dark theme",
     """Building a 3×2 feature grid with glass morphism cards, 48px icon containers, hover lift with shadow spread, and staggered fade-in animation.

```html:features.html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Features Grid</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #0a0a0f; color: #f0f0f5; padding: 80px 24px; }
  .header { text-align: center; margin-bottom: 60px; }
  .header .label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #10b981; margin-bottom: 12px; }
  .header h2 { font-family: 'Sora', sans-serif; font-size: 40px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 12px; }
  .header p { color: #71717a; font-size: 16px; max-width: 480px; margin: 0 auto; }
  .grid { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
  .card { padding: 32px; background: rgba(255,255,255,0.02); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0; transform: translateY(16px); animation: fadeUp 0.5s ease forwards; }
  .card:nth-child(1) { animation-delay: 0s; } .card:nth-child(2) { animation-delay: 0.08s; }
  .card:nth-child(3) { animation-delay: 0.16s; } .card:nth-child(4) { animation-delay: 0.24s; }
  .card:nth-child(5) { animation-delay: 0.32s; } .card:nth-child(6) { animation-delay: 0.4s; }
  @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
  .card:hover { border-color: rgba(255,255,255,0.12); transform: translateY(-6px); box-shadow: 0 16px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08); }
  .icon { width: 48px; height: 48px; border-radius: 14px; background: rgba(16,185,129,0.1); display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 20px; }
  .card h3 { font-family: 'Sora', sans-serif; font-size: 17px; font-weight: 600; margin-bottom: 8px; letter-spacing: -0.01em; }
  .card p { font-size: 14px; color: #71717a; line-height: 1.65; }
  @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
  <div class="header">
    <div class="label">Features</div>
    <h2>Built for modern teams</h2>
    <p>Every feature designed to help you ship faster and collaborate better.</p>
  </div>
  <div class="grid">
    <div class="card"><div class="icon">⚡</div><h3>Lightning Fast</h3><p>Sub-50ms response times globally. Your users never wait.</p></div>
    <div class="card"><div class="icon">🔒</div><h3>Secure by Default</h3><p>SOC 2, encryption at rest, and RBAC built into every layer.</p></div>
    <div class="card"><div class="icon">📊</div><h3>Smart Analytics</h3><p>Real-time dashboards with AI-powered insights and anomaly detection.</p></div>
    <div class="card"><div class="icon">🔗</div><h3>API-First</h3><p>RESTful and GraphQL APIs with auto-generated documentation.</p></div>
    <div class="card"><div class="icon">👥</div><h3>Team Collaboration</h3><p>Real-time editing with presence indicators and threaded comments.</p></div>
    <div class="card"><div class="icon">🌐</div><h3>Global CDN</h3><p>Deployed to 200+ edge locations for instant access worldwide.</p></div>
  </div>
</body>
</html>
```"""),
]

for prompt, response in feature_variations:
    ex(prompt, response)
    count += 1

# ═══════════════════════════════════════════════════════════════════════
# STYLE / AESTHETIC DIRECTION EXAMPLES
# ═══════════════════════════════════════════════════════════════════════

style_examples = [
    ("What fonts pair well for a dark SaaS landing page?",
     "For dark SaaS, the strongest pairings are: **Space Grotesk + DM Sans** (geometric, technical), **Sora + Inter** (bold, modern), **Outfit + Plus Jakarta Sans** (friendly, rounded). Space Grotesk for headlines gives you that technical authority — geometric letterforms with just enough personality. DM Sans for body text is clean and highly readable at small sizes. Use the display font at 600-700 weight for headings, body font at 400-500 for paragraphs."),

    ("How do I make feature cards look premium and not generic?",
     "The difference between generic and premium cards comes down to intentionality. Here's the checklist: **Border treatment** — use `rgba(255,255,255,0.06)` not solid gray. **Hover** — combine `translateY(-4px)` with `box-shadow: 0 12px 24px rgba(0,0,0,0.3)` and `border-color` change. **Icon containers** — 48px with 12px radius and primary-subtle background, not just raw emoji. **Spacing** — 32px padding, not 16 or 24. **Typography** — display font for h3 at 18px/600, body font for p at 14px with muted color. **Background** — glass morphism (`rgba(255,255,255,0.02)` + `backdrop-filter: blur(20px)`) or solid surface (`#12121a`), never pure transparent."),

    ("What color palette works for a dark theme with green accent?",
     "For dark green (emerald) themes: Background `#0a0f0d` (very dark with green tint, NOT pure black). Surface `#111a16`. Text `#f0f5f2`. Muted `#6b8078`. Primary `#10b981` (emerald-500). Primary hover `#34d399`. Primary subtle `rgba(16,185,129,0.1)`. Borders `rgba(255,255,255,0.06)`. The key is tinting your dark backgrounds toward the accent — `#0a0f0d` has a slight green warmth that makes the emerald accent feel cohesive. Pure `#000` or `#111` with green looks disconnected."),

    ("Give me a good spacing scale for web design",
     "Use a base-4 scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120, 160px. For component internals: 8-12px for tight spacing (icon to text), 16-20px for related elements, 24-32px for card padding. For sections: 60-80px vertical padding between sections, 24px horizontal page padding. For typography: 4-8px between heading and subtext, 12-16px between paragraphs. Border radius: 8px for buttons, 12px for cards, 16px for large cards, 100px for pills. Never use 5, 7, 13 or other non-scale values."),

    ("How should I structure CSS custom properties for a design system?",
     "Group into layers: `--bg` (page background), `--surface` (card/component background), `--surface-hover` (interactive surfaces). Text: `--text` (primary), `--text-secondary`, `--muted` (least emphasis). Accent: `--primary`, `--primary-hover`, `--primary-subtle` (backgrounds), `--primary-glow` (box-shadow). Borders: `--border` (resting), `--border-hover` (interactive). Typography: `--font-display` (headings), `--font-body` (paragraphs). Radii: `--radius` (standard 12px), `--radius-lg` (16px). This gives you a complete theme you can swap between dark and light by changing only the variable values."),

    ("What makes a hero section feel premium vs generic AI output?",
     "Premium heroes have these details that generic AI output misses: **Radial glow** — `radial-gradient(circle, rgba(primary,0.12), transparent 70%)` behind the heading, creates depth. **Letter spacing** — `-0.02em` to `-0.03em` on headings, tightens them for that editorial feel. **Line height** — 1.05-1.1 on hero headings, not the default 1.5. **Badge above heading** — pill-shaped with subtle background and border, establishes context. **Two CTAs** — primary filled + ghost outline, gives visual hierarchy. **Max-width on text** — 700px on h1, 520px on paragraph, prevents lines from running too wide. **Gradient text** — `linear-gradient(135deg, primary, primary-hover)` with `-webkit-background-clip: text`. None of these are individually complex, but together they create intentional design."),
]

for prompt, response in style_examples:
    ex(prompt, response)
    count += 1

# ═══════════════════════════════════════════════════════════════════════
# ITERATION / EDITING EXAMPLES (common user follow-ups)
# ═══════════════════════════════════════════════════════════════════════

iteration_examples = [
    ("Make the hero section bigger with more spacing",
     "Increasing hero padding from 160px to 200px top, bumping heading to clamp(40px, 7vw, 72px), and adding more bottom margin on the subtitle.\n\nUse these CSS changes:\n```css\n.hero { padding: 200px 24px 100px; }\n.hero h1 { font-size: clamp(40px, 7vw, 72px); }\n.hero p { margin-bottom: 48px; }\n```"),

    ("Change the color scheme to purple/violet",
     "Swapping to a violet palette. Here are the CSS variable updates:\n```css\n:root {\n  --bg: #0d0a0f; --surface: #16111a; --surface-hover: #1e1625;\n  --primary: #8b5cf6; --primary-hover: #a78bfa;\n  --primary-subtle: rgba(139,92,246,0.1); --primary-glow: rgba(139,92,246,0.3);\n}\n```\nThe background gets a slight purple tint (`#0d0a0f` instead of neutral `#0a0a0f`) so the violet accent feels cohesive with the dark theme."),

    ("Add a testimonial section between features and pricing",
     """Adding a 3-column testimonials grid with quote cards.

```html:testimonials-section.html
<section style="max-width:1200px;margin:0 auto;padding:80px 24px">
  <div style="text-align:center;margin-bottom:60px">
    <h2 style="font-family:var(--font-display);font-size:36px;font-weight:700;margin-bottom:12px">Loved by teams everywhere</h2>
    <p style="color:var(--muted);font-size:16px">Join thousands of teams already shipping faster.</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px">
    <div style="padding:28px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
      <p style="font-size:15px;font-style:italic;color:var(--text-secondary);margin-bottom:16px;line-height:1.7">"This tool transformed our workflow. We shipped 3x faster in the first month."</p>
      <div><strong style="font-size:14px">Sarah Chen</strong><div style="font-size:13px;color:var(--muted)">CTO at Meridian</div></div>
    </div>
    <div style="padding:28px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
      <p style="font-size:15px;font-style:italic;color:var(--text-secondary);margin-bottom:16px;line-height:1.7">"The best tool we've adopted this year. Period."</p>
      <div><strong style="font-size:14px">Marcus Reeves</strong><div style="font-size:13px;color:var(--muted)">VP Engineering at Scale</div></div>
    </div>
    <div style="padding:28px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
      <p style="font-size:15px;font-style:italic;color:var(--text-secondary);margin-bottom:16px;line-height:1.7">"We evaluated 12 alternatives. This was the clear winner."</p>
      <div><strong style="font-size:14px">Priya Patel</strong><div style="font-size:13px;color:var(--muted)">Founder at Lumina</div></div>
    </div>
  </div>
</section>
```"""),

    ("Make it mobile responsive — the cards stack and nav collapses",
     """Adding mobile breakpoints. Key changes:

```css
@media (max-width: 768px) {
  .nav-links { display: none; }
  .hero { padding-top: 100px; text-align: center; }
  .hero h1 { font-size: 32px; }
  .hero p { font-size: 16px; }
  .features-grid { grid-template-columns: 1fr; }
  .pricing-grid { grid-template-columns: 1fr; }
  .stats { gap: 24px; }
  .stat-number { font-size: 32px; }
  footer { flex-direction: column; gap: 8px; text-align: center; }
}
```

This hides nav links (you'd add a hamburger menu for production), stacks all grids to single column, reduces heading sizes, and centers the footer."""),

    ("The text is too small on mobile, fix the typography",
     """Bumping mobile font sizes for better readability:

```css
@media (max-width: 768px) {
  .hero h1 { font-size: 32px; line-height: 1.15; }
  .hero p { font-size: 16px; line-height: 1.6; }
  .feature-card h3 { font-size: 17px; }
  .feature-card p { font-size: 14px; line-height: 1.6; }
  .price-amount { font-size: 36px; }
  .section-header h2 { font-size: 28px; }
  .section-header p { font-size: 15px; }
}
```

The rule: body text never below 14px on mobile, headings never below 24px. Line heights increase slightly on mobile (1.5→1.6) because narrower columns need more breathing room."""),
]

for prompt, response in iteration_examples:
    ex(prompt, response)
    count += 1

print(f"\nTotal examples: {count}")

# ═══════════════════════════════════════════════════════════════════════
# COMBINE WITH V1 TRAINING DATA
# ═══════════════════════════════════════════════════════════════════════

# Load existing v1 data
v1_examples = []
if os.path.exists(EXISTING):
    with open(EXISTING) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    v1_examples.append(json.loads(line))
                except:
                    pass
    print(f"Loaded {len(v1_examples)} v1 examples")

# Deduplicate by user message (first 100 chars)
seen = set()
combined = []
for e in ALL:
    key = e["messages"][1]["content"][:100]
    if key not in seen:
        seen.add(key)
        combined.append(e)
for e in v1_examples:
    key = e["messages"][1]["content"][:100]
    if key not in seen:
        seen.add(key)
        combined.append(e)

print(f"Combined (after dedup): {len(combined)}")

# Write output
with open(OUTPUT, 'w') as f:
    for e in combined:
        f.write(json.dumps(e, ensure_ascii=False) + '\n')

# Stats
total_chars = sum(sum(len(m["content"]) for m in e["messages"]) for e in combined)
total_tokens = total_chars // 4
print(f"\n═══ V2 TRAINING DATA STATS ═══")
print(f"Total examples: {len(combined)}")
print(f"Full-page examples: {count}")
print(f"V1 examples carried: {len(combined) - count}")
print(f"Total tokens: ~{total_tokens:,}")
print(f"Est cost (3 epochs): ~${total_tokens * 3 * 0.000025:.2f}")
print(f"Output: {OUTPUT}")
print(f"File size: {os.path.getsize(OUTPUT):,} bytes")
