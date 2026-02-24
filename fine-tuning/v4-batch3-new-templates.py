#!/usr/bin/env python3
"""
V4 BATCH 3: NEW TEMPLATE CATEGORIES
1. Apple-style — Product Showcase (hero stack, minimal, black/white)
2. HP-style — E-Commerce Catalog (hero carousel, mega nav, category grid)
"""
import json, os

OUTPUT = os.path.join(os.path.dirname(__file__), "v4-batch3-new-templates.jsonl")

SYS = """You are Aether, a world-class AI software engineer inside File Engine. You generate production-quality, visually stunning code with intentional design choices.
RULES:
- Code blocks use ```html:filepath format. The :filepath is REQUIRED.
- HTML has <!DOCTYPE html>, viewport meta, ALL CSS in <style>, ALL JS in <script>
- Mobile responsive ALWAYS. Dark themes: #0a0a0f base. Light themes: off-white base.
- COMPLETE code only. Zero placeholders. Every file immediately runnable.
- Every design choice is INTENTIONAL — fonts, colors, spacing, animations all serve a purpose."""

examples = []

# ═══════════════════════════════════════════════════════
# APPLE-STYLE: Product Showcase (Hero Stack)
# ═══════════════════════════════════════════════════════

APPLE_PAGE = '''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Aura — Headphones Reimagined</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif;background:#fff;color:#1d1d1f;-webkit-font-smoothing:antialiased}
nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.72);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid rgba(0,0,0,0.06)}
nav .container{max-width:1024px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:44px;padding:0 22px;font-size:12px}
.nav-logo{font-size:18px;font-weight:600;letter-spacing:-0.02em}
.nav-links{display:flex;gap:24px}.nav-links a{color:#1d1d1f;text-decoration:none;opacity:0.8;transition:opacity 0.2s}.nav-links a:hover{opacity:1}
.hero-section{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px 24px;position:relative;overflow:hidden}
.hero-dark{background:#000;color:#f5f5f7}
.hero-light{background:#fbfbfd;color:#1d1d1f}
.hero-section h2{font-size:clamp(40px,7vw,80px);font-weight:700;letter-spacing:-0.04em;line-height:1.05;margin-bottom:8px}
.hero-section .sub{font-size:clamp(20px,3vw,28px);font-weight:400;color:#86868b;margin-bottom:24px}
.hero-links{display:flex;gap:24px;justify-content:center}
.hero-links a{font-size:20px;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
.hero-links a.blue{color:#2997ff}.hero-links a.blue:hover{text-decoration:underline}
.hero-product{font-size:120px;margin:40px 0;filter:drop-shadow(0 20px 40px rgba(0,0,0,0.2))}
.duo-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px;max-width:1200px;margin:0 auto}
.duo-card{min-height:580px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:48px 24px;border-radius:24px;position:relative;overflow:hidden}
.duo-card.dark{background:#000;color:#f5f5f7}
.duo-card.light{background:#f5f5f7;color:#1d1d1f}
.duo-card h2{font-size:36px;font-weight:700;letter-spacing:-0.03em;margin-bottom:4px}
.duo-card .sub{font-size:18px;color:#86868b;margin-bottom:20px}
.duo-card .emoji{font-size:80px;margin-bottom:16px}
.duo-card .links{display:flex;gap:20px;justify-content:center}
.duo-card .links a{font-size:17px;color:#2997ff;text-decoration:none}.duo-card .links a:hover{text-decoration:underline}
footer{padding:16px;text-align:center;font-size:12px;color:#86868b;border-top:1px solid rgba(0,0,0,0.06)}
@media(max-width:734px){.duo-grid{grid-template-columns:1fr}.hero-section h2{font-size:40px}.nav-links span{display:none}}
</style></head><body>
<nav><div class="container"><div class="nav-logo">Aura</div><div class="nav-links"><a href="#">Headphones</a><a href="#">Speakers</a><span><a href="#">Accessories</a></span><a href="#" style="opacity:1;font-weight:500">Buy</a></div></div></nav>

<section class="hero-section hero-dark">
<div class="hero-product">🎧</div>
<h2>Aura Pro</h2>
<div class="sub">Silence. Perfected.</div>
<div class="hero-links"><a href="#" class="blue">Learn more ›</a><a href="#" class="blue">Buy ›</a></div>
</section>

<section class="hero-section hero-light">
<h2>Aura Air</h2>
<div class="sub">Impossibly light. Unbelievably powerful.</div>
<div class="hero-links"><a href="#" class="blue">Learn more ›</a><a href="#" class="blue">Buy ›</a></div>
<div class="hero-product">🔊</div>
</section>

<div class="duo-grid">
<div class="duo-card dark">
<div class="emoji">⌚</div>
<h2>Aura Band</h2>
<div class="sub">Track everything. Effortlessly.</div>
<div class="links"><a href="#">Learn more ›</a><a href="#">Buy ›</a></div>
</div>
<div class="duo-card light">
<div class="emoji">🎵</div>
<h2>Aura Music</h2>
<div class="sub">100 million songs. Zero ads.</div>
<div class="links"><a href="#">Try it free ›</a></div>
</div>
</div>

<div class="duo-grid">
<div class="duo-card light">
<div class="emoji">📱</div>
<h2>Aura Case</h2>
<div class="sub">Designed to protect.</div>
<div class="links"><a href="#">Learn more ›</a><a href="#">Buy ›</a></div>
</div>
<div class="duo-card dark">
<div class="emoji">💳</div>
<h2>Aura Card</h2>
<div class="sub">3% cash back. Every purchase.</div>
<div class="links"><a href="#">Learn more ›</a><a href="#">Apply ›</a></div>
</div>
</div>

<footer>&copy; 2026 Aura Inc. All rights reserved.</footer>
</body></html>'''

# Apple-style prompts
apple_prompts = [
    "Build an Apple-style product showcase page with full-bleed hero sections that alternate black and white, minimal nav, and massive typography",
    "Create a product landing page like Apple.com — hero stack layout, system font, 44px sticky nav, pure black and white backgrounds",
    "Design a premium product showcase with Apple's design language — minimalist, full-viewport hero sections, tiny text CTAs, and a 2-up card grid",
    "Build a hardware brand homepage in Apple's style — each product gets its own full-screen section, ultra-clean typography, zero visual clutter",
]

for prompt in apple_prompts:
    examples.append({"messages":[
        {"role":"system","content":SYS},
        {"role":"user","content":prompt},
        {"role":"assistant","content":"Building an Apple-inspired product showcase with the hero-stack pattern — full-viewport sections alternating black/white, system font at massive sizes, 44px frosted glass nav, and minimal 'Learn more ›' text links.\n\n```html:index.html\n"+APPLE_PAGE+"\n```\n\nKey Apple design decisions: system font stack (zero load time), frosted glass nav with backdrop-filter, alternating black/white hero sections, ultra-tight letter-spacing (-0.04em), minimal copy (3-5 words per product), 2-up card grid with rounded corners, and #2997ff Apple blue for all links."}
    ]})

# ═══════════════════════════════════════════════════════
# HP-STYLE: E-Commerce Catalog (Carousel + Category Grid)
# ═══════════════════════════════════════════════════════

HP_PAGE = '''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>TechStore — Laptops, Desktops & More</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;color:#1a1a1a;line-height:1.5}
.container{max-width:1200px;margin:0 auto;padding:0 20px}
nav{background:#fff;border-bottom:1px solid #e5e5e5;position:sticky;top:0;z-index:100}
.nav-top{display:flex;align-items:center;justify-content:space-between;height:56px}
.nav-logo{font-size:22px;font-weight:800;color:#0096d6;letter-spacing:-0.02em}
.nav-search{flex:1;max-width:400px;margin:0 24px;position:relative}
.nav-search input{width:100%;padding:8px 16px 8px 36px;border:1px solid #ddd;border-radius:20px;font-size:14px;outline:none;transition:border-color 0.2s}
.nav-search input:focus{border-color:#0096d6}
.nav-search::before{content:'🔍';position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px}
.nav-actions{display:flex;gap:16px;align-items:center;font-size:14px}
.nav-actions a{color:#1a1a1a;text-decoration:none;display:flex;align-items:center;gap:4px}
.nav-cats{display:flex;gap:0;border-top:1px solid #f0f0f0;font-size:14px}
.nav-cats a{padding:10px 16px;color:#555;text-decoration:none;transition:color 0.15s;border-bottom:2px solid transparent}
.nav-cats a:hover{color:#0096d6;border-bottom-color:#0096d6}

.carousel{position:relative;overflow:hidden;background:#f5f5f5}
.carousel-track{display:flex;transition:transform 0.5s ease}
.slide{min-width:100%;padding:48px 24px;display:flex;align-items:center;justify-content:center;gap:48px;min-height:400px}
.slide-content{max-width:420px}
.slide-content .badge{display:inline-block;padding:4px 12px;background:#c00;color:#fff;font-size:12px;font-weight:700;border-radius:4px;margin-bottom:12px}
.slide-content h2{font-size:32px;font-weight:700;line-height:1.2;margin-bottom:12px}
.slide-content p{font-size:16px;color:#555;margin-bottom:20px;line-height:1.6}
.slide-content .btn{display:inline-block;padding:10px 28px;background:#0096d6;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;transition:background 0.2s}
.slide-content .btn:hover{background:#007ab8}
.slide-content .btn-outline{display:inline-block;padding:10px 28px;background:transparent;color:#0096d6;text-decoration:none;border:2px solid #0096d6;border-radius:6px;font-size:14px;font-weight:600;margin-left:8px;transition:all 0.2s}
.slide-content .btn-outline:hover{background:#0096d6;color:#fff}
.slide-img{font-size:120px}
.carousel-dots{display:flex;justify-content:center;gap:8px;padding:16px 0}
.carousel-dots .dot{width:10px;height:10px;border-radius:50%;background:#ddd;cursor:pointer;transition:background 0.2s}
.carousel-dots .dot.active{background:#0096d6}
.carousel-arrows{position:absolute;top:50%;width:100%;display:flex;justify-content:space-between;padding:0 16px;transform:translateY(-50%);pointer-events:none}
.carousel-arrows button{pointer-events:auto;width:40px;height:40px;border-radius:50%;border:1px solid #ddd;background:rgba(255,255,255,0.9);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:all 0.2s}
.carousel-arrows button:hover{background:#fff;border-color:#999}

.categories{padding:48px 0}
.categories h2{font-size:24px;font-weight:700;margin-bottom:24px}
.cat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.cat-card{background:#f9f9f9;border:1px solid #eee;border-radius:12px;padding:24px;text-align:center;transition:all 0.2s;cursor:pointer;text-decoration:none;color:#1a1a1a}
.cat-card:hover{border-color:#0096d6;box-shadow:0 4px 12px rgba(0,0,0,0.06);transform:translateY(-2px)}
.cat-card .cat-icon{font-size:48px;margin-bottom:12px}
.cat-card h3{font-size:16px;font-weight:600;margin-bottom:4px}
.cat-card p{font-size:13px;color:#777}

.deals{padding:48px 0;border-top:1px solid #eee}
.deals h2{font-size:24px;font-weight:700;margin-bottom:24px}
.deal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.deal-card{border:1px solid #eee;border-radius:12px;overflow:hidden;transition:all 0.2s}
.deal-card:hover{box-shadow:0 4px 12px rgba(0,0,0,0.06)}
.deal-img{height:180px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:64px}
.deal-body{padding:16px}
.deal-body h3{font-size:16px;font-weight:600;margin-bottom:4px}
.deal-body .price{font-size:20px;font-weight:700;color:#c00;margin-bottom:4px}
.deal-body .old-price{font-size:14px;color:#999;text-decoration:line-through}
.deal-body .savings{display:inline-block;padding:2px 8px;background:#e8f5e9;color:#2e7d32;font-size:12px;font-weight:600;border-radius:4px;margin-top:6px}

.promo-banner{background:linear-gradient(135deg,#0096d6,#00b4d8);padding:48px 24px;text-align:center;color:#fff}
.promo-banner h2{font-size:28px;font-weight:700;margin-bottom:8px}
.promo-banner p{font-size:16px;opacity:0.9;margin-bottom:20px}
.promo-banner .btn-white{display:inline-block;padding:12px 32px;background:#fff;color:#0096d6;text-decoration:none;border-radius:6px;font-size:15px;font-weight:700;transition:all 0.2s}
.promo-banner .btn-white:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.15)}

footer{background:#1a1a1a;color:#aaa;padding:40px 0 20px;font-size:13px}
.footer-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:32px;margin-bottom:32px}
.footer-grid h4{color:#fff;font-size:14px;font-weight:600;margin-bottom:12px}
.footer-grid a{display:block;color:#aaa;text-decoration:none;padding:3px 0;transition:color 0.15s}.footer-grid a:hover{color:#fff}
.footer-bottom{text-align:center;padding-top:20px;border-top:1px solid #333}
@media(max-width:768px){.cat-grid{grid-template-columns:1fr 1fr}.deal-grid{grid-template-columns:1fr}.slide{flex-direction:column;text-align:center;padding:32px 16px}.nav-search{display:none}.footer-grid{grid-template-columns:1fr 1fr}.nav-cats{overflow-x:auto;white-space:nowrap}}
</style></head><body>
<nav><div class="container">
<div class="nav-top"><div class="nav-logo">TechStore</div><div class="nav-search"><input type="text" placeholder="Search products..."></div><div class="nav-actions"><a href="#">👤 Account</a><a href="#">🛒 Cart (0)</a></div></div>
<div class="nav-cats"><a href="#">Laptops</a><a href="#">Desktops</a><a href="#">Monitors</a><a href="#">Printers</a><a href="#">Accessories</a><a href="#">Deals</a><a href="#">Support</a></div>
</div></nav>

<div class="carousel">
<div class="carousel-track" id="track">
<div class="slide" style="background:linear-gradient(135deg,#f0f4ff,#e8eeff)"><div class="slide-content"><div class="badge">SALE</div><h2>Presidents' Day Sale</h2><p>Save up to 40% on select laptops, desktops, and accessories. Free shipping on all orders.</p><a href="#" class="btn">Shop Now</a><a href="#" class="btn-outline">View All Deals</a></div><div class="slide-img">💻</div></div>
<div class="slide" style="background:linear-gradient(135deg,#f0fff4,#e8ffef)"><div class="slide-content"><h2>All-New ProBook X</h2><p>AI-powered performance meets all-day battery life. Built for the modern professional.</p><a href="#" class="btn">Learn More</a></div><div class="slide-img">🖥️</div></div>
<div class="slide" style="background:linear-gradient(135deg,#fff0f0,#ffe8e8)"><div class="slide-content"><h2>Print Subscriptions</h2><p>Never run out of ink. Plans starting at $4.99/month with free delivery.</p><a href="#" class="btn">Get Started</a></div><div class="slide-img">🖨️</div></div>
</div>
<div class="carousel-arrows"><button onclick="moveSlide(-1)">‹</button><button onclick="moveSlide(1)">›</button></div>
<div class="carousel-dots"><div class="dot active" onclick="goToSlide(0)"></div><div class="dot" onclick="goToSlide(1)"></div><div class="dot" onclick="goToSlide(2)"></div></div>
</div>

<section class="categories"><div class="container"><h2>Shop by Category</h2><div class="cat-grid">
<a href="#" class="cat-card"><div class="cat-icon">💻</div><h3>Laptops</h3><p>From $299.99</p></a>
<a href="#" class="cat-card"><div class="cat-icon">🖥️</div><h3>Desktops</h3><p>From $449.99</p></a>
<a href="#" class="cat-card"><div class="cat-icon">🖨️</div><h3>Printers</h3><p>From $69.99</p></a>
<a href="#" class="cat-card"><div class="cat-icon">🎧</div><h3>Accessories</h3><p>From $19.99</p></a>
</div></div></section>

<section class="deals"><div class="container"><h2>Today's Top Deals</h2><div class="deal-grid">
<div class="deal-card"><div class="deal-img">💻</div><div class="deal-body"><h3>ProBook 15.6" Laptop</h3><div class="price">$549.99</div><div class="old-price">$899.99</div><div class="savings">Save $350</div></div></div>
<div class="deal-card"><div class="deal-img">🖥️</div><div class="deal-body"><h3>Pavilion 27" All-in-One</h3><div class="price">$699.99</div><div class="old-price">$999.99</div><div class="savings">Save $300</div></div></div>
<div class="deal-card"><div class="deal-img">🖨️</div><div class="deal-body"><h3>OfficeJet Pro Printer</h3><div class="price">$149.99</div><div class="old-price">$249.99</div><div class="savings">Save $100</div></div></div>
</div></div></section>

<section class="promo-banner"><div class="container"><h2>Subscribe and Save</h2><p>Get a new laptop delivered to your door. Plans from $24.99/month.</p><a href="#" class="btn-white">Learn More →</a></div></section>

<footer><div class="container"><div class="footer-grid">
<div><h4>Shop</h4><a href="#">Laptops</a><a href="#">Desktops</a><a href="#">Printers</a><a href="#">Monitors</a><a href="#">Accessories</a></div>
<div><h4>Support</h4><a href="#">Contact Us</a><a href="#">Check Warranty</a><a href="#">Drivers & Software</a><a href="#">Troubleshooting</a></div>
<div><h4>About</h4><a href="#">Our Company</a><a href="#">Careers</a><a href="#">Sustainability</a><a href="#">Investor Relations</a></div>
<div><h4>Account</h4><a href="#">Sign In</a><a href="#">Register</a><a href="#">Order Status</a><a href="#">Subscriptions</a></div>
</div><div class="footer-bottom">&copy; 2026 TechStore Inc. All rights reserved.</div></div></footer>

<script>
let currentSlide=0;const track=document.getElementById('track'),dots=document.querySelectorAll('.dot'),totalSlides=3;
function goToSlide(n){currentSlide=n;track.style.transform=`translateX(-${n*100}%)`;dots.forEach((d,i)=>d.classList.toggle('active',i===n))}
function moveSlide(dir){currentSlide=(currentSlide+dir+totalSlides)%totalSlides;goToSlide(currentSlide)}
setInterval(()=>moveSlide(1),5000);
</script>
</body></html>'''

hp_prompts = [
    "Build an e-commerce homepage like HP.com — hero carousel with deals, category grid, product cards with prices, and a mega footer",
    "Create a corporate retail landing page with rotating banner carousel, shop-by-category section, deal cards showing prices and savings, and subscription promo",
    "Design an electronics store homepage with HP-style architecture — sticky nav with search bar and category links, promotional carousel, product grid with pricing",
    "Build a tech product catalog homepage — carousel hero with sale banners, category cards, today's deals with strikethrough prices, and a branded promo section",
]

for prompt in hp_prompts:
    examples.append({"messages":[
        {"role":"system","content":SYS},
        {"role":"user","content":prompt},
        {"role":"assistant","content":"Building an e-commerce catalog page with HP-style architecture — hero carousel with auto-advance, category grid, deal cards with pricing, and promo banner.\n\n```html:index.html\n"+HP_PAGE+"\n```\n\nKey e-commerce design decisions: 2-row nav (top bar with search + category links), 3-slide auto-rotating carousel with dots and arrows, 4-column category grid with starting prices, deal cards showing original price with strikethrough and savings badge, branded promo banner with gradient, and a 4-column footer grid."}
    ]})

# Write output
with open(OUTPUT, 'w') as f:
    for e in examples:
        f.write(json.dumps(e, ensure_ascii=False) + '\n')

total_chars = sum(sum(len(m["content"]) for m in e["messages"]) for e in examples)
file_size = os.path.getsize(OUTPUT)

print(f"{'='*55}")
print(f"V4 BATCH 3: NEW TEMPLATE CATEGORIES")
print(f"{'='*55}")
print(f"Apple-style examples: {len(apple_prompts)}")
print(f"HP-style examples: {len(hp_prompts)}")
print(f"Total examples: {len(examples)}")
print(f"Total tokens: ~{total_chars//4:,}")
print(f"File size: {file_size:,} bytes ({file_size/1024:.0f} KB)")
print(f"Output: {OUTPUT}")
print(f"{'='*55}")
