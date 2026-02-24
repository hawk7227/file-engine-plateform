#!/usr/bin/env python3
"""
V4 BATCH 1: MASSIVE PAGE VARIATIONS
Generates 500+ unique full HTML landing pages
30 industries × multiple font/palette/layout combos
"""
import json, os, random, hashlib

OUTPUT = os.path.join(os.path.dirname(__file__), "v4-batch1-pages.jsonl")

SYS = """You are Aether, a world-class AI software engineer inside File Engine. You generate production-quality, visually stunning code with intentional design choices.
RULES:
- Code blocks use ```html:filepath format. The :filepath is REQUIRED.
- HTML has <!DOCTYPE html>, viewport meta, ALL CSS in <style>, ALL JS in <script>
- Mobile responsive ALWAYS. Dark themes: #0a0a0f base. Light themes: off-white base.
- COMPLETE code only. Zero placeholders. Every file immediately runnable.
- Every design choice is INTENTIONAL — fonts, colors, spacing, animations all serve a purpose."""

# ═══════════════════════════════════════════════════════
# DESIGN SYSTEM COMPONENTS
# ═══════════════════════════════════════════════════════

FONTS = [
    ("Space Grotesk", "DM Sans", "geometric-technical"),
    ("Cormorant Garamond", "DM Sans", "editorial-luxury"),
    ("Sora", "Inter", "modern-clean"),
    ("Inter", "Inter", "neutral-professional"),
    ("Outfit", "Plus Jakarta Sans", "friendly-rounded"),
    ("Playfair Display", "Source Sans 3", "classic-elegant"),
    ("JetBrains Mono", "Inter", "developer-technical"),
    ("Fraunces", "Commissioner", "warm-editorial"),
    ("Archivo", "Work Sans", "bold-geometric"),
    ("Manrope", "Nunito", "soft-modern"),
    ("Bricolage Grotesque", "Libre Franklin", "quirky-editorial"),
    ("General Sans", "Satoshi", "contemporary-minimal"),
]

DARK_PALETTES = [
    {"name":"indigo","bg":"#0a0a0f","surface":"#12121a","text":"#f0f0f5","muted":"#71717a","primary":"#6366f1","primary_hover":"#818cf8","glow":"rgba(99,102,241,0.15)"},
    {"name":"emerald","bg":"#060f0a","surface":"#0c1a12","text":"#f0f5f2","muted":"#6b7c72","primary":"#10b981","primary_hover":"#34d399","glow":"rgba(16,185,129,0.15)"},
    {"name":"amber","bg":"#0f0a05","surface":"#1a1208","text":"#f5f0e8","muted":"#8a7a62","primary":"#f59e0b","primary_hover":"#fbbf24","glow":"rgba(245,158,11,0.15)"},
    {"name":"rose","bg":"#0f0508","surface":"#1a0c12","text":"#f5f0f2","muted":"#8a6b75","primary":"#f43f5e","primary_hover":"#fb7185","glow":"rgba(244,63,94,0.15)"},
    {"name":"cyan","bg":"#050d0f","surface":"#0a1820","text":"#f0f5f5","muted":"#6b8088","primary":"#06b6d4","primary_hover":"#22d3ee","glow":"rgba(6,182,212,0.15)"},
    {"name":"violet","bg":"#0a060f","surface":"#140e1f","text":"#f2f0f5","muted":"#7a6b8a","primary":"#8b5cf6","primary_hover":"#a78bfa","glow":"rgba(139,92,246,0.15)"},
    {"name":"orange","bg":"#0f0805","surface":"#1a100a","text":"#f5f2f0","muted":"#8a7562","primary":"#f97316","primary_hover":"#fb923c","glow":"rgba(249,115,22,0.15)"},
    {"name":"teal","bg":"#050f0d","surface":"#0a1a18","text":"#f0f5f4","muted":"#6b8880","primary":"#14b8a6","primary_hover":"#2dd4bf","glow":"rgba(20,184,166,0.15)"},
    {"name":"pink","bg":"#0f050a","surface":"#1f0e18","text":"#f5f0f3","muted":"#8a6b7a","primary":"#ec4899","primary_hover":"#f472b6","glow":"rgba(236,72,153,0.15)"},
    {"name":"lime","bg":"#0a0f05","surface":"#141a0a","text":"#f2f5f0","muted":"#7a8a62","primary":"#84cc16","primary_hover":"#a3e635","glow":"rgba(132,204,22,0.15)"},
    {"name":"sky","bg":"#050a0f","surface":"#0a141f","text":"#f0f2f5","muted":"#6b7a8a","primary":"#0ea5e9","primary_hover":"#38bdf8","glow":"rgba(14,165,233,0.15)"},
    {"name":"red","bg":"#0f0505","surface":"#1a0a0a","text":"#f5f0f0","muted":"#8a6b6b","primary":"#ef4444","primary_hover":"#f87171","glow":"rgba(239,68,68,0.15)"},
]

LIGHT_PALETTES = [
    {"name":"warm","bg":"#faf8f5","surface":"#ffffff","text":"#1a1a1a","muted":"#6b7280","primary":"#4f46e5","primary_hover":"#6366f1","border":"rgba(0,0,0,0.06)"},
    {"name":"cool","bg":"#f5f7fa","surface":"#ffffff","text":"#111827","muted":"#6b7280","primary":"#2563eb","primary_hover":"#3b82f6","border":"rgba(0,0,0,0.06)"},
    {"name":"sage","bg":"#f5f7f5","surface":"#ffffff","text":"#1a1f1a","muted":"#5f7060","primary":"#16a34a","primary_hover":"#22c55e","border":"rgba(0,0,0,0.06)"},
    {"name":"cream","bg":"#fdf8f0","surface":"#ffffff","text":"#292524","muted":"#78716c","primary":"#d97706","primary_hover":"#f59e0b","border":"rgba(0,0,0,0.05)"},
    {"name":"lavender","bg":"#f8f5ff","surface":"#ffffff","text":"#1e1b2e","muted":"#6b6880","primary":"#7c3aed","primary_hover":"#8b5cf6","border":"rgba(0,0,0,0.05)"},
]

BUSINESSES = [
    {"name":"Nexus","tagline":"Ship products 10x faster","desc":"project management platform","industry":"saas","features":["Task Boards","Time Tracking","Team Chat","Sprint Planning","Roadmaps","Integrations"],"stats":[("12,847","Active Teams"),("99.9%","Uptime SLA"),("152","Countries"),("4.9/5","Avg Rating")]},
    {"name":"Forma","tagline":"Design that moves people","desc":"creative design agency","industry":"agency","features":["Brand Identity","Web Design","Motion Design","Product Design","Design Systems","Brand Strategy"],"stats":[("200+","Projects Delivered"),("48","Awards Won"),("15","Years Experience"),("98%","Client Satisfaction")]},
    {"name":"Pulse","tagline":"Healthcare at your fingertips","desc":"telehealth platform","industry":"healthcare","features":["Video Visits","Prescriptions","Lab Results","Health Records","Appointment Booking","Insurance Verification"],"stats":[("50K+","Patients Served"),("500+","Licensed Providers"),("4.8/5","Patient Rating"),("15min","Avg Wait Time")]},
    {"name":"Zenith","tagline":"AI-powered business intelligence","desc":"analytics platform","industry":"ai","features":["Predictive Analytics","Custom Dashboards","Real-time Alerts","Data Pipelines","Natural Language Queries","Automated Reports"],"stats":[("2.4B","Data Points/Day"),("340+","Integrations"),("99.99%","Accuracy"),("3x","Faster Insights")]},
    {"name":"Luminary","tagline":"Learn without limits","desc":"online education platform","industry":"education","features":["Interactive Courses","Live Workshops","AI Tutoring","Certificates","Peer Review","Career Paths"],"stats":[("1M+","Students"),("5,000+","Courses"),("92%","Completion Rate"),("4.7/5","Rating")]},
    {"name":"Vault","tagline":"Your money, secured and growing","desc":"digital banking platform","industry":"fintech","features":["Instant Transfers","Smart Savings","Investment Portfolios","Expense Tracking","Multi-Currency","Fraud Protection"],"stats":[("$4.2B","Assets Managed"),("250K+","Accounts"),("0.00%","Fraud Rate"),("4.9/5","App Rating")]},
    {"name":"Grove","tagline":"Sustainable commerce, simplified","desc":"eco-friendly marketplace","industry":"ecommerce","features":["Curated Products","Carbon-Neutral Shipping","Subscription Boxes","Seller Dashboard","Impact Tracking","Gift Cards"],"stats":[("10K+","Eco Products"),("500+","Verified Sellers"),("2M+","Trees Planted"),("4.8/5","Trust Score")]},
    {"name":"Signal","tagline":"Marketing that converts","desc":"marketing automation platform","industry":"marketing","features":["Email Campaigns","A/B Testing","Lead Scoring","CRM Integration","Analytics Dashboard","Landing Pages"],"stats":[("35%","Avg CTR Increase"),("12K+","Businesses"),("5B+","Emails Sent"),("3.2x","ROI Average")]},
    {"name":"Atlas","tagline":"Build, ship, scale — repeat","desc":"developer platform","industry":"devtools","features":["Cloud Functions","Edge Compute","CI/CD Pipeline","Database","Authentication","Monitoring"],"stats":[("50M+","Deploys/Month"),("200+","Edge Locations"),("<50ms","Cold Start"),("99.99%","Uptime")]},
    {"name":"Haven","tagline":"Find your perfect home","desc":"real estate platform","industry":"realestate","features":["AI Property Matching","Virtual Tours","Mortgage Calculator","Neighborhood Insights","Agent Connect","Smart Alerts"],"stats":[("1.2M","Listings"),("85K","Homes Sold"),("4.6/5","Agent Rating"),("$0","Buyer Fees")]},
    {"name":"Tempo","tagline":"Music creation reimagined","desc":"music production platform","industry":"music","features":["AI Composition","Sample Library","Cloud Collaboration","Mastering Suite","Distribution","Royalty Tracking"],"stats":[("500K+","Artists"),("10M+","Tracks Created"),("200+","Instruments"),("4.9/5","Rating")]},
    {"name":"Shield","tagline":"Zero-trust security for modern teams","desc":"cybersecurity platform","industry":"security","features":["Threat Detection","Access Control","Compliance Monitoring","Incident Response","Vulnerability Scanning","Security Training"],"stats":[("10K+","Orgs Protected"),("99.7%","Threat Detection"),("50ms","Response Time"),("SOC 2","Certified")]},
    {"name":"Bloom","tagline":"People-first HR for growing teams","desc":"HR management platform","industry":"hr","features":["Onboarding Flows","Performance Reviews","Time Off Management","Payroll","Benefits Admin","Employee Surveys"],"stats":[("8K+","Companies"),("500K+","Employees"),("40%","Less Admin Time"),("4.7/5","Rating")]},
    {"name":"Orbit","tagline":"Every relationship, one platform","desc":"CRM platform","industry":"crm","features":["Pipeline Management","Email Sequences","Contact Enrichment","Reporting","Integrations","Mobile App"],"stats":[("25K+","Sales Teams"),("$12B+","Deals Tracked"),("28%","Revenue Increase"),("4.8/5","G2 Rating")]},
    {"name":"Horizon","tagline":"Travel planned. Adventures awaited.","desc":"travel booking platform","industry":"travel","features":["AI Trip Planning","Hotel Booking","Flight Search","Local Experiences","Travel Insurance","Group Trips"],"stats":[("2M+","Trips Planned"),("150+","Countries"),("$400","Avg Savings"),("4.9/5","Rating")]},
    {"name":"Prism","tagline":"See your data in a new light","desc":"data visualization platform","industry":"dataviz","features":["Interactive Charts","Real-time Dashboards","Embedded Analytics","Custom Themes","API Access","Collaboration"],"stats":[("15K+","Teams"),("1B+","Charts Created"),("99.9%","Uptime"),("4.8/5","Rating")]},
    {"name":"Catalyst","tagline":"Launch faster. Iterate smarter.","desc":"no-code app builder","industry":"nocode","features":["Drag & Drop Builder","Database","User Auth","Payments","Custom Domains","API Connectors"],"stats":[("100K+","Apps Built"),("500K+","Users"),("5min","Avg Deploy Time"),("4.7/5","Rating")]},
    {"name":"Meridian","tagline":"Supply chain clarity, end to end","desc":"logistics platform","industry":"logistics","features":["Route Optimization","Inventory Tracking","Warehouse Management","Fleet Monitoring","Demand Forecasting","Supplier Portal"],"stats":[("$8B","Goods Tracked"),("3K+","Warehouses"),("30%","Cost Reduction"),("99.5%","On-Time")]},
    {"name":"Solace","tagline":"Mental wellness, made accessible","desc":"therapy and wellness platform","industry":"wellness","features":["Online Therapy","Meditation Library","Mood Tracking","Journal","Community Support","Crisis Resources"],"stats":[("200K+","Members"),("2K+","Therapists"),("89%","Feel Better in 4 Weeks"),("4.9/5","Rating")]},
    {"name":"Forge","tagline":"Contracts without the chaos","desc":"legal tech platform","industry":"legaltech","features":["Contract Builder","E-Signatures","Clause Library","Compliance Checks","Version Control","Analytics"],"stats":[("5M+","Contracts Signed"),("40K+","Law Firms"),("80%","Faster Drafting"),("4.6/5","Rating")]},
    {"name":"Apex","tagline":"Fitness intelligence for elite performance","desc":"fitness technology platform","industry":"fitness","features":["AI Coaching","Workout Builder","Nutrition Tracking","Recovery Analysis","Wearable Sync","Community Challenges"],"stats":[("1M+","Athletes"),("50M+","Workouts Logged"),("23%","Performance Gain"),("4.8/5","Rating")]},
    {"name":"Mosaic","tagline":"Content that scales with your brand","desc":"content management system","industry":"cms","features":["Visual Editor","Headless API","Media Library","Localization","Workflows","A/B Testing"],"stats":[("30K+","Sites Powered"),("1B+","Page Views/Month"),("99.99%","Uptime"),("4.7/5","Rating")]},
    {"name":"Nimbus","tagline":"Cloud infrastructure, simplified","desc":"cloud hosting platform","industry":"cloud","features":["Auto-scaling","Global CDN","Managed Databases","Serverless Functions","SSL Certificates","DDoS Protection"],"stats":[("100K+","Deployments"),("200+","Edge Nodes"),("<10ms","Latency"),("99.999%","Uptime")]},
    {"name":"Ember","tagline":"Restaurants reimagined for the digital age","desc":"restaurant tech platform","industry":"restaurant","features":["Online Ordering","Table Reservations","Kitchen Display","Menu Management","Loyalty Program","Delivery Integration"],"stats":[("15K+","Restaurants"),("$2B+","Orders Processed"),("25%","Revenue Increase"),("4.8/5","Rating")]},
    {"name":"Quill","tagline":"Write better. Publish faster.","desc":"writing and publishing platform","industry":"publishing","features":["AI Writing Assistant","Collaborative Editor","SEO Optimization","Publishing Tools","Analytics","Newsletter"],"stats":[("500K+","Writers"),("10M+","Articles Published"),("3x","Faster Writing"),("4.9/5","Rating")]},
    {"name":"Radiant","tagline":"Beautiful emails that convert","desc":"email marketing platform","industry":"emailmarketing","features":["Drag & Drop Builder","Automation Flows","Segmentation","A/B Testing","Analytics","Template Library"],"stats":[("80K+","Brands"),("15B+","Emails Sent"),("42%","Higher Open Rate"),("4.7/5","Rating")]},
    {"name":"Keystone","tagline":"Identity management for the modern web","desc":"authentication platform","industry":"auth","features":["Passwordless Login","SSO","MFA","User Management","RBAC","Compliance"],"stats":[("1B+","Authentications/Month"),("50K+","Apps"),("<100ms","Auth Time"),("SOC 2","Compliant")]},
    {"name":"Aether","tagline":"AI that builds with you","desc":"AI code generation platform","industry":"aigen","features":["Code Generation","Design to Code","Bug Detection","Refactoring","Documentation","Deployment"],"stats":[("250K+","Developers"),("10M+","Files Generated"),("95%","Accuracy"),("4.9/5","Rating")]},
    {"name":"Crest","tagline":"Fundraising with confidence","desc":"crowdfunding platform","industry":"crowdfunding","features":["Campaign Builder","Payment Processing","Backer Management","Stretch Goals","Updates","Analytics"],"stats":[("$500M+","Raised"),("25K+","Campaigns"),("72%","Success Rate"),("4.6/5","Rating")]},
    {"name":"Pinnacle","tagline":"Events that leave lasting impressions","desc":"event management platform","industry":"events","features":["Event Builder","Ticketing","Check-in App","Sponsorship Portal","Live Streaming","Post-Event Analytics"],"stats":[("100K+","Events Hosted"),("5M+","Tickets Sold"),("98%","Satisfaction"),("4.8/5","Rating")]},
]

HERO_STYLES = ["centered", "left_aligned", "split", "gradient_bg"]
CARD_STYLES = ["solid", "glass", "bordered", "gradient_border"]

PROMPTS_TEMPLATES = [
    "Build a dark {industry} landing page for {name} — {tagline}",
    "Create a landing page for {name}, a {desc}. Include hero, features, stats, and pricing",
    "Design a premium dark landing page for {name} with animated counters and hover effects",
    "Build a modern {industry} website for {name} with hero section, feature cards, and CTA",
    "Create a sleek dark-themed page for {name} — a {desc} — with pricing tiers and testimonials",
    "Design a high-converting landing page for {name}: {tagline}. Dark theme with animated stats",
    "Build a {industry} SaaS landing page for {name} with gradient hero, feature grid, and FAQ accordion",
]

LIGHT_PROMPTS = [
    "Build a clean light-themed landing page for {name} — {tagline}",
    "Create a minimal light {industry} page for {name} with soft shadows and warm typography",
    "Design an elegant light landing page for {name}, a {desc}",
]

def google_font_url(f1, f2):
    fam1 = f1.replace(" ", "+")
    fam2 = f2.replace(" ", "+")
    if fam1 == fam2:
        return f"https://fonts.googleapis.com/css2?family={fam1}:wght@400;500;600;700&display=swap"
    return f"https://fonts.googleapis.com/css2?family={fam1}:wght@500;600;700&family={fam2}:wght@400;500&display=swap"

def make_features_html(features, card_style, pal, is_dark):
    icons = ["⚡","🎯","🔒","📊","🚀","💡","🔗","🛡️","📱","🎨","⭐","🌐"]
    cards = []
    for i, feat in enumerate(features[:6]):
        icon = icons[i % len(icons)]
        if card_style == "glass":
            cs = f"background:rgba(255,255,255,{'0.03' if is_dark else '0.6'});backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid {'rgba(255,255,255,0.06)' if is_dark else 'rgba(0,0,0,0.06)'}"
        elif card_style == "bordered":
            cs = f"background:transparent;border:1px solid {'rgba(255,255,255,0.08)' if is_dark else 'rgba(0,0,0,0.08)'}"
        elif card_style == "gradient_border":
            cs = f"background:{'var(--surface)' if is_dark else '#fff'};border:1px solid {'rgba(255,255,255,0.06)' if is_dark else 'rgba(0,0,0,0.06)'};position:relative"
        else:
            cs = f"background:var(--surface);border:1px solid {'rgba(255,255,255,0.06)' if is_dark else 'rgba(0,0,0,0.06)'}"
        cards.append(f'<div class="fcard" style="{cs}"><div class="ficon">{icon}</div><h3>{feat}</h3><p>Streamline your workflow with our powerful {feat.lower()} capabilities built for modern teams.</p></div>')
    return "\n".join(cards)

def make_stats_html(stats):
    items = []
    for val, label in stats:
        dec = "1" if "." in val else "0"
        target = val.replace(",","").replace("+","").replace("%","").replace("/5","").replace("$","").replace("ms","").replace("min","").replace("B","")
        suffix = ""
        if "+" in val: suffix = "+"
        elif "%" in val: suffix = "%"
        elif "/5" in val: suffix = "/5"
        elif "$" in val: val = val; suffix = ""
        elif "ms" in val: suffix = "ms"
        items.append(f'<div class="stat"><div class="stat-val" data-target="{target}" data-suffix="{suffix}" data-decimal="{dec}">0</div><div class="stat-label">{label}</div></div>')
    return "\n".join(items)

def make_pricing_html(name, pal, is_dark):
    return f'''<div class="pricing-grid">
<div class="price-card"><div class="price-name">Starter</div><div class="price-amount"><span class="currency">$</span>29<span class="period">/mo</span></div><p class="price-desc">Perfect for individuals and small teams getting started.</p><ul class="price-features"><li>Up to 5 team members</li><li>10GB storage</li><li>Basic analytics</li><li>Email support</li></ul><button class="btn-outline">Get Started</button></div>
<div class="price-card featured"><div class="price-badge">Most Popular</div><div class="price-name">Professional</div><div class="price-amount"><span class="currency">$</span>79<span class="period">/mo</span></div><p class="price-desc">For growing teams that need more power and flexibility.</p><ul class="price-features"><li>Unlimited team members</li><li>100GB storage</li><li>Advanced analytics</li><li>Priority support</li><li>Custom integrations</li></ul><button class="btn-primary">Start Free Trial →</button></div>
<div class="price-card"><div class="price-name">Enterprise</div><div class="price-amount"><span class="currency">$</span>199<span class="period">/mo</span></div><p class="price-desc">For organizations that need enterprise-grade features.</p><ul class="price-features"><li>Everything in Pro</li><li>Unlimited storage</li><li>SSO & SAML</li><li>Dedicated support</li><li>Custom SLA</li></ul><button class="btn-outline">Contact Sales</button></div>
</div>'''

def make_page(biz, fonts, pal, is_dark, has_pricing, has_stats, has_testimonials, has_faq, hero_style, card_style):
    f1, f2, style_desc = fonts
    font_url = google_font_url(f1, f2)
    
    if is_dark:
        bg = pal["bg"]; surface = pal["surface"]; text = pal["text"]
        muted = pal["muted"]; primary = pal["primary"]; primary_hover = pal["primary_hover"]
        glow = pal["glow"]; border = "rgba(255,255,255,0.06)"
    else:
        bg = pal["bg"]; surface = pal["surface"]; text = pal["text"]
        muted = pal["muted"]; primary = pal["primary"]; primary_hover = pal["primary_hover"]
        border = pal["border"]
        glow = f"rgba({int(primary[1:3],16)},{int(primary[3:5],16)},{int(primary[5:7],16)},0.12)"

    # Hero layout CSS
    hero_css = ""
    hero_html = ""
    if hero_style == "centered":
        hero_css = "text-align:center; max-width:800px; margin:0 auto;"
        hero_html = f'''<div class="hero-badge">{biz["industry"].upper()} PLATFORM</div>
<h1>{biz["tagline"]}</h1>
<p class="hero-sub">{biz["name"]} is the {biz["desc"]} that helps teams work smarter, ship faster, and scale with confidence.</p>
<div class="hero-btns"><a class="btn-primary" href="#">Start Free Trial →</a><a class="btn-ghost" href="#">Watch Demo</a></div>'''
    elif hero_style == "left_aligned":
        hero_css = "max-width:640px;"
        hero_html = f'''<div class="hero-badge">{biz["industry"].upper()} PLATFORM</div>
<h1>{biz["tagline"]}</h1>
<p class="hero-sub">{biz["name"]} is the {biz["desc"]} that helps teams work smarter, ship faster, and scale with confidence.</p>
<div class="hero-btns"><a class="btn-primary" href="#">Start Free Trial →</a><a class="btn-ghost" href="#">Learn More</a></div>'''
    elif hero_style == "split":
        hero_css = "display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;"
        hero_html = f'''<div><div class="hero-badge">{biz["industry"].upper()}</div>
<h1>{biz["tagline"]}</h1>
<p class="hero-sub">{biz["name"]} is the {biz["desc"]} that helps teams work smarter and ship faster.</p>
<div class="hero-btns"><a class="btn-primary" href="#">Get Started →</a><a class="btn-ghost" href="#">See Pricing</a></div></div>
<div class="hero-visual" style="aspect-ratio:4/3;border-radius:16px;background:linear-gradient(135deg,{surface},{bg});border:1px solid {border};display:flex;align-items:center;justify-content:center;font-size:48px">🚀</div>'''
    else:  # gradient_bg
        hero_css = "text-align:center; max-width:800px; margin:0 auto; position:relative; z-index:1;"
        hero_html = f'''<div class="hero-badge">✨ NOW IN BETA</div>
<h1>{biz["tagline"]}</h1>
<p class="hero-sub">The {biz["desc"]} designed for teams that refuse to settle. {biz["name"]} brings everything together in one powerful platform.</p>
<div class="hero-btns"><a class="btn-primary" href="#">Start Building →</a><a class="btn-ghost" href="#">View Demo</a></div>'''

    features_html = make_features_html(biz["features"], card_style, pal, is_dark)
    stats_html = make_stats_html(biz["stats"]) if has_stats else ""
    pricing_html = make_pricing_html(biz["name"], pal, is_dark) if has_pricing else ""

    testimonials_html = ""
    if has_testimonials:
        testimonials_html = f'''<section class="section" id="testimonials"><div class="container"><h2 class="section-title">Loved by teams worldwide</h2><p class="section-sub">See what our customers have to say about {biz["name"]}.</p><div class="testimonials-grid">
<div class="testimonial"><p class="tq">"{biz["name"]} transformed how our team works. We shipped 3x faster in the first month."</p><div class="tauthor"><div class="tavatar">SC</div><div><div class="tname">Sarah Chen</div><div class="trole">CTO, TechFlow</div></div></div></div>
<div class="testimonial"><p class="tq">"The best tool we've adopted this year. Period. Our entire team is hooked."</p><div class="tauthor"><div class="tavatar">JW</div><div><div class="tname">James Wilson</div><div class="trole">VP Engineering, ScaleUp</div></div></div></div>
<div class="testimonial"><p class="tq">"We evaluated 12 alternatives before choosing {biz["name"]}. No regrets whatsoever."</p><div class="tauthor"><div class="tavatar">PP</div><div><div class="tname">Priya Patel</div><div class="trole">Founder, BuildFast</div></div></div></div>
</div></div></section>'''

    faq_html = ""
    if has_faq:
        faq_html = f'''<section class="section" id="faq"><div class="container"><h2 class="section-title">Frequently asked questions</h2><p class="section-sub">Everything you need to know about {biz["name"]}.</p><div class="faq-list">
<div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">Is there a free plan? <span class="faq-chevron">▼</span></button><div class="faq-a"><p>Yes! We offer a generous free tier with up to 3 projects and 1GB storage. No credit card required.</p></div></div>
<div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">Can I cancel anytime? <span class="faq-chevron">▼</span></button><div class="faq-a"><p>Absolutely. No contracts, no cancellation fees. Downgrade or cancel anytime from account settings.</p></div></div>
<div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">Is my data secure? <span class="faq-chevron">▼</span></button><div class="faq-a"><p>Security is our top priority. AES-256 encryption, SOC 2 Type II certified, GDPR compliant, with hourly backups.</p></div></div>
<div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">Do you offer startup discounts? <span class="faq-chevron">▼</span></button><div class="faq-a"><p>Yes! Qualifying startups get 50% off for the first year. Apply through our startup program page.</p></div></div>
</div></div></section>'''

    html = f'''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{biz["name"]} — {biz["tagline"]}</title><link href="{font_url}" rel="stylesheet"><style>
:root{{--bg:{bg};--surface:{surface};--text:{text};--muted:{muted};--primary:{primary};--primary-hover:{primary_hover};--glow:{glow};--border:{border};--font-display:'{f1}',sans-serif;--font-body:'{f2}',sans-serif;--radius:12px}}
*{{margin:0;padding:0;box-sizing:border-box}}body{{font-family:var(--font-body);background:var(--bg);color:var(--text);line-height:1.6}}
.container{{max-width:1120px;margin:0 auto;padding:0 24px}}
nav{{padding:14px 0;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:50;background:{'rgba(10,10,15,0.8)' if is_dark else 'rgba(255,255,255,0.8)'};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}}
nav .container{{display:flex;align-items:center;justify-content:space-between}}
.logo{{font-family:var(--font-display);font-size:20px;font-weight:700;background:linear-gradient(135deg,var(--primary),var(--primary-hover));-webkit-background-clip:text;-webkit-text-fill-color:transparent}}
.nav-links{{display:flex;align-items:center;gap:28px}}
.nav-links a{{font-size:14px;color:var(--muted);text-decoration:none;transition:color 0.2s}}.nav-links a:hover{{color:var(--text)}}
.btn-primary{{display:inline-flex;align-items:center;padding:10px 24px;background:var(--primary);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:var(--font-body);transition:all 0.2s}}
.btn-primary:hover{{background:var(--primary-hover);transform:translateY(-1px);box-shadow:0 4px 20px var(--glow)}}
.btn-ghost{{display:inline-flex;align-items:center;padding:10px 24px;background:transparent;color:var(--text);border:1px solid var(--border);border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;text-decoration:none;font-family:var(--font-body);transition:all 0.2s}}
.btn-ghost:hover{{border-color:var(--muted);background:{'rgba(255,255,255,0.03)' if is_dark else 'rgba(0,0,0,0.03)'}}}
.btn-outline{{display:inline-flex;align-items:center;justify-content:center;width:100%;padding:10px 24px;background:transparent;color:var(--text);border:1px solid var(--border);border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;font-family:var(--font-body);transition:all 0.2s}}
.btn-outline:hover{{border-color:var(--primary);color:var(--primary)}}
.hero{{padding:80px 0 60px;{'background:radial-gradient(ellipse at 50% 0%,'+glow+',transparent 60%)' if hero_style=='gradient_bg' else ''}}}
.hero .container{{{hero_css}}}
.hero-badge{{display:inline-block;padding:6px 16px;background:{'rgba(255,255,255,0.05)' if is_dark else 'rgba(0,0,0,0.04)'};border:1px solid var(--border);border-radius:100px;font-size:12px;font-weight:600;letter-spacing:1px;color:var(--primary);margin-bottom:20px}}
.hero h1{{font-family:var(--font-display);font-size:clamp(36px,5vw,60px);font-weight:700;line-height:1.1;letter-spacing:-0.03em;margin-bottom:16px}}
.hero-sub{{font-size:18px;color:var(--muted);max-width:560px;margin-bottom:32px;line-height:1.7}}
.hero-btns{{display:flex;gap:12px;flex-wrap:wrap}}
.section{{padding:80px 0}}
.section-title{{font-family:var(--font-display);font-size:32px;font-weight:700;text-align:center;margin-bottom:8px;letter-spacing:-0.02em}}
.section-sub{{text-align:center;color:var(--muted);font-size:16px;margin-bottom:48px;max-width:560px;margin-left:auto;margin-right:auto}}
.stats-row{{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:60px}}
.stat{{text-align:center;padding:24px}}
.stat-val{{font-family:var(--font-display);font-size:36px;font-weight:700;color:var(--primary);letter-spacing:-0.02em}}
.stat-label{{font-size:14px;color:var(--muted);margin-top:4px}}
.features-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}}
.fcard{{padding:28px;border-radius:var(--radius);transition:all 0.3s;cursor:default}}
.fcard:hover{{transform:translateY(-4px);box-shadow:0 12px 24px {'rgba(0,0,0,0.3)' if is_dark else 'rgba(0,0,0,0.08)'}}}
.fcard .ficon{{font-size:28px;margin-bottom:14px}}
.fcard h3{{font-family:var(--font-display);font-size:17px;font-weight:600;margin-bottom:6px}}
.fcard p{{font-size:14px;color:var(--muted);line-height:1.6}}
.pricing-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:960px;margin:0 auto}}
.price-card{{padding:32px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);position:relative}}
.price-card.featured{{border-color:var(--primary);box-shadow:0 0 30px var(--glow)}}
.price-badge{{position:absolute;top:-12px;left:50%;transform:translateX(-50%);padding:4px 16px;background:var(--primary);color:#fff;font-size:12px;font-weight:600;border-radius:100px}}
.price-name{{font-family:var(--font-display);font-size:18px;font-weight:600;margin-bottom:8px}}
.price-amount{{font-family:var(--font-display);font-size:42px;font-weight:700;margin-bottom:8px}}
.currency{{font-size:24px;opacity:0.6}}.period{{font-size:16px;color:var(--muted);font-weight:400}}
.price-desc{{font-size:14px;color:var(--muted);margin-bottom:20px}}
.price-features{{list-style:none;margin-bottom:24px}}.price-features li{{padding:6px 0;font-size:14px;color:var(--muted)}}
.price-features li::before{{content:'✓ ';color:var(--primary);font-weight:600}}
.testimonials-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}}
.testimonial{{padding:24px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius)}}
.tq{{font-size:15px;color:var(--text);line-height:1.7;margin-bottom:16px;font-style:italic}}
.tauthor{{display:flex;align-items:center;gap:10px}}
.tavatar{{width:36px;height:36px;border-radius:50%;background:{'rgba(255,255,255,0.06)' if is_dark else 'rgba(0,0,0,0.04)'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--primary)}}
.tname{{font-size:14px;font-weight:600}}.trole{{font-size:12px;color:var(--muted)}}
.faq-list{{max-width:680px;margin:0 auto;display:flex;flex-direction:column;gap:8px}}
.faq-item{{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden}}
.faq-q{{width:100%;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;background:none;border:none;color:var(--text);font-size:15px;font-weight:500;cursor:pointer;font-family:var(--font-body);text-align:left}}
.faq-chevron{{font-size:12px;color:var(--muted);transition:transform 0.3s}}.faq-item.open .faq-chevron{{transform:rotate(180deg)}}
.faq-a{{max-height:0;overflow:hidden;transition:max-height 0.3s}}.faq-item.open .faq-a{{max-height:200px}}
.faq-a p{{padding:0 20px 16px;font-size:14px;color:var(--muted);line-height:1.7}}
.cta-section{{padding:80px 0;text-align:center;background:radial-gradient(ellipse at 50% 50%,var(--glow),transparent 60%)}}
.cta-section h2{{font-family:var(--font-display);font-size:36px;font-weight:700;margin-bottom:8px;letter-spacing:-0.02em}}
.cta-section p{{color:var(--muted);margin-bottom:28px}}
footer{{padding:24px 0;border-top:1px solid var(--border);text-align:center;font-size:13px;color:var(--muted)}}
.fade-in{{opacity:0;transform:translateY(20px);transition:opacity 0.6s,transform 0.6s}}.fade-in.visible{{opacity:1;transform:translateY(0)}}
@media(max-width:768px){{.hero .container{{{'grid-template-columns:1fr!important;' if hero_style=='split' else ''}}}.stats-row{{grid-template-columns:repeat(2,1fr)}}.features-grid,.pricing-grid,.testimonials-grid{{grid-template-columns:1fr}}.nav-links span{{display:none}}.hero h1{{font-size:32px}}.section-title{{font-size:24px}}}}
@media(prefers-reduced-motion:reduce){{*{{animation-duration:0.01ms!important;transition-duration:0.01ms!important}}}}
</style></head><body>
<nav><div class="container"><div class="logo">{biz["name"]}</div><div class="nav-links"><a href="#features">Features</a>{'<a href="#pricing">Pricing</a>' if has_pricing else ''}<span><a href="#" class="btn-ghost" style="padding:7px 16px;font-size:13px">Sign In</a></span><a href="#" class="btn-primary" style="padding:7px 16px;font-size:13px">Get Started</a></div></div></nav>
<section class="hero"><div class="container">{hero_html}</div></section>
{'<section class="section"><div class="container"><div class="stats-row fade-in">'+stats_html+'</div></div></section>' if has_stats else ''}
<section class="section" id="features"><div class="container"><h2 class="section-title">Everything you need</h2><p class="section-sub">Powerful features that grow with your team. No compromises.</p><div class="features-grid fade-in">{features_html}</div></div></section>
{testimonials_html}
{'<section class="section" id="pricing"><div class="container"><h2 class="section-title">Simple, transparent pricing</h2><p class="section-sub">Start free. Upgrade when ready. No hidden fees.</p>'+pricing_html+'</div></section>' if has_pricing else ''}
{faq_html}
<section class="cta-section"><div class="container"><h2>Ready to get started?</h2><p>Join thousands of teams already using {biz["name"]}. No credit card required.</p><a href="#" class="btn-primary">Start Free Trial →</a></div></section>
<footer><div class="container">© 2026 {biz["name"]}, Inc. All rights reserved.</div></footer>
<script>
const obs=new IntersectionObserver(e=>{{e.forEach(el=>{{if(el.isIntersecting){{el.target.classList.add('visible');obs.unobserve(el.target)}}}})}},{{threshold:0.1}});document.querySelectorAll('.fade-in').forEach(el=>obs.observe(el));
{'function animateCounter(el){const t=parseFloat(el.dataset.target),s=el.dataset.suffix||"",d=parseInt(el.dataset.decimal)||0,dur=2000,st=performance.now();function u(now){const p=Math.min((now-st)/dur,1),e=1-Math.pow(1-p,3);el.textContent=(d>0?((t*e).toFixed(d)):(Math.floor(t*e).toLocaleString()))+s;if(p<1)requestAnimationFrame(u)}requestAnimationFrame(u)}const cObs=new IntersectionObserver(e=>{e.forEach(el=>{if(el.isIntersecting){animateCounter(el.target);cObs.unobserve(el.target)}})},{threshold:0.5});document.querySelectorAll("[data-target]").forEach(c=>cObs.observe(c));' if has_stats else ''}
{'function toggleFaq(btn){const item=btn.parentElement,body=item.querySelector(".faq-a"),content=body.querySelector("p"),wasOpen=item.classList.contains("open");document.querySelectorAll(".faq-item.open").forEach(i=>{i.classList.remove("open");i.querySelector(".faq-a").style.maxHeight="0"});if(!wasOpen){item.classList.add("open");body.style.maxHeight=content.scrollHeight+"px"}}' if has_faq else ''}
</script></body></html>'''
    return html

# ═══════════════════════════════════════════════════════
# GENERATE ALL EXAMPLES
# ═══════════════════════════════════════════════════════

examples = []
seen = set()

print("Generating V4 Batch 1: Page Variations...")

for bi, biz in enumerate(BUSINESSES):
    # Dark variations: 8 per business
    for vi in range(8):
        font = FONTS[vi % len(FONTS)]
        pal = DARK_PALETTES[(bi + vi) % len(DARK_PALETTES)]
        hero = HERO_STYLES[vi % len(HERO_STYLES)]
        card = CARD_STYLES[vi % len(CARD_STYLES)]
        has_pricing = vi % 3 != 2
        has_stats = vi % 4 != 3
        has_testimonials = vi % 3 == 0
        has_faq = vi % 4 == 1
        
        prompt_tmpl = PROMPTS_TEMPLATES[vi % len(PROMPTS_TEMPLATES)]
        prompt = prompt_tmpl.format(name=biz["name"], tagline=biz["tagline"], desc=biz["desc"], industry=biz["industry"])
        
        key = prompt[:120]
        if key in seen:
            continue
        seen.add(key)
        
        html = make_page(biz, font, pal, True, has_pricing, has_stats, has_testimonials, has_faq, hero, card)
        intro = f"Building a dark {biz['industry']} landing page with {font[0]} + {font[1]}, {pal['name']} accent, {hero} hero layout."
        response = f"{intro}\n\n```html:index.html\n{html}\n```"
        
        examples.append({"messages": [
            {"role": "system", "content": SYS},
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": response}
        ]})
    
    # Light variations: 3 per business
    for vi in range(3):
        font = FONTS[(bi + vi + 3) % len(FONTS)]
        pal = LIGHT_PALETTES[vi % len(LIGHT_PALETTES)]
        hero = HERO_STYLES[(vi + 1) % len(HERO_STYLES)]
        card = CARD_STYLES[(vi + 2) % len(CARD_STYLES)]
        
        prompt_tmpl = LIGHT_PROMPTS[vi % len(LIGHT_PROMPTS)]
        prompt = prompt_tmpl.format(name=biz["name"], tagline=biz["tagline"], desc=biz["desc"], industry=biz["industry"])
        
        key = prompt[:120]
        if key in seen:
            continue
        seen.add(key)
        
        html = make_page(biz, font, pal, False, vi != 2, vi != 1, vi == 0, vi == 2, hero, card)
        intro = f"Building a clean light {biz['industry']} page with {font[0]} + {font[1]}, {pal['name']} palette."
        response = f"{intro}\n\n```html:index.html\n{html}\n```"
        
        examples.append({"messages": [
            {"role": "system", "content": SYS},
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": response}
        ]})

    if (bi + 1) % 5 == 0:
        print(f"  {bi+1}/{len(BUSINESSES)} businesses → {len(examples)} examples")

# Write output
with open(OUTPUT, 'w') as f:
    for e in examples:
        f.write(json.dumps(e, ensure_ascii=False) + '\n')

total_chars = sum(sum(len(m["content"]) for m in e["messages"]) for e in examples)
file_size = os.path.getsize(OUTPUT)
full_pages = sum(1 for e in examples if len(e["messages"][2]["content"]) > 3000)

print(f"\n{'═'*55}")
print(f"V4 BATCH 1: PAGE VARIATIONS")
print(f"{'═'*55}")
print(f"Total examples: {len(examples)}")
print(f"Full HTML pages (>3KB): {full_pages}")
print(f"Industries: {len(BUSINESSES)}")
print(f"Total tokens: ~{total_chars//4:,}")
print(f"File size: {file_size:,} bytes ({file_size/1024/1024:.1f} MB)")
print(f"Output: {OUTPUT}")
print(f"{'═'*55}")
