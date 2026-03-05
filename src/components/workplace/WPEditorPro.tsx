'use client'

/**
 * WP EDITOR PRO — Standalone visual editor panel
 * Exact same UI as the standalone EditorPro page.
 * Renders as a right-side panel in File Engine workplace.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react"

// ═══ DEVICE DATABASE ═══
const D = {
  "i17p":    {n:"iPhone 17 Pro",     w:402,h:874, st:62,sb:34,r:55,di:1,c:"ios"},
  "i17pm":   {n:"iPhone 17 Pro Max", w:440,h:956, st:62,sb:34,r:55,di:1,c:"ios"},
  "i16":     {n:"iPhone 16",         w:393,h:852, st:59,sb:34,r:55,di:1,c:"ios"},
  "i16p":    {n:"iPhone 16 Plus",    w:430,h:932, st:59,sb:34,r:55,di:1,c:"ios"},
  "i16pro":  {n:"iPhone 16 Pro",     w:402,h:874, st:62,sb:34,r:55,di:1,c:"ios"},
  "i16pm":   {n:"iPhone 16 Pro Max", w:440,h:956, st:62,sb:34,r:55,di:1,c:"ios"},
  "i15":     {n:"iPhone 15",         w:393,h:852, st:59,sb:34,r:55,di:1,c:"ios"},
  "i15p":    {n:"iPhone 15 Pro",     w:393,h:852, st:59,sb:34,r:55,di:1,c:"ios"},
  "i15pm":   {n:"iPhone 15 Pro Max", w:430,h:932, st:59,sb:34,r:55,di:1,c:"ios"},
  "i14":     {n:"iPhone 14",         w:390,h:844, st:47,sb:34,r:47,di:0,c:"ios"},
  "i14p":    {n:"iPhone 14 Pro",     w:393,h:852, st:59,sb:34,r:55,di:1,c:"ios"},
  "ise":     {n:"iPhone SE",         w:375,h:667, st:20,sb:0, r:0, di:0,c:"ios"},
  "px9":     {n:"Pixel 9",           w:412,h:915, st:24,sb:0, r:28,di:0,c:"and"},
  "gs25":    {n:"Galaxy S25",        w:360,h:780, st:24,sb:0, r:24,di:0,c:"and"},
  "gs25u":   {n:"Galaxy S25 Ultra",  w:384,h:824, st:24,sb:0, r:12,di:0,c:"and"},
  "gs24":    {n:"Galaxy S24",        w:360,h:780, st:24,sb:0, r:24,di:0,c:"and"},
  "ipad":    {n:"iPad Air 11\"",     w:820,h:1180,st:24,sb:20,r:18,di:0,c:"tab"},
  "d1440":   {n:"Desktop 1440",      w:1440,h:900,st:0, sb:0, r:0, di:0,c:"desk"},
  "d1920":   {n:"Desktop 1080p",     w:1920,h:1080,st:0,sb:0, r:0, di:0,c:"desk"},
};

const B = {
  "saf":  {n:"Safari (visible)",  tc:50,bc:44,p:"ios"},
  "safc": {n:"Safari (collapsed)",tc:0, bc:0, p:"ios"},
  "safb": {n:"Safari (bottom bar)",tc:0,bc:56,p:"ios"},
  "pwa":  {n:"PWA / Standalone",  tc:0, bc:0, p:"ios"},
  "chr":  {n:"Chrome (visible)",  tc:56,bc:48,p:"and"},
  "chrc": {n:"Chrome (collapsed)",tc:0, bc:48,p:"and"},
  "desk": {n:"Desktop Browser",   tc:0, bc:0, p:"desk"},
};

const bForD = (d: any) => d.c==="ios"?["saf","safc","safb","pwa"]:d.c==="and"?["chr","chrc"]:["desk"];

const WARN = [
  {s:"critical",t:"100vh Bug",d:"100vh ignores browser chrome. Content cut off on load.",f:"Use 100dvh or 100svh"},
  {s:"high",t:"Dynamic Island",d:"126×37pt cutout at top center hides content.",f:"env(safe-area-inset-top) padding"},
  {s:"high",t:"Home Indicator",d:"34px bottom zone. Don't put buttons here.",f:"env(safe-area-inset-bottom) padding"},
  {s:"high",t:"Keyboard",d:"Opens ~260-300px. Fixed elements may overlap.",f:"scrollIntoView + visualViewport API"},
  {s:"medium",t:"Safari Bottom Bar",d:"iOS 15+ option. 56px at bottom hides CTAs.",f:"Test both bar positions"},
  {s:"medium",t:"Gesture Nav",d:"48px Android bottom bar conflicts with swipes.",f:"Avoid swipeable UI in bottom 48px"},
];

const DEFAULT_CODE = `<div style="max-width:430px;margin:0 auto;height:100%;background:#0b0f0c;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;overflow:hidden;">
  <div style="flex-shrink:0;padding:max(var(--sat,8px),8px) 16px 6px;background:linear-gradient(180deg,#0b0f0c,rgba(11,15,12,0.97));">
    <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:2px;">
      <div style="width:24px;height:24px;background:rgba(45,212,160,0.2);border-radius:6px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#2dd4a0;font-size:12px;font-weight:900;">M</span>
      </div>
      <span style="font-weight:700;font-size:15px;letter-spacing:-0.02em;">Medazon <span style="color:#2dd4a0;">Health</span></span>
    </div>
    <p style="color:#2dd4a0;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:2px;text-align:center;">Private · Discreet</p>
    <h1 style="font-size:clamp(20px,5.5vw,26px);font-weight:900;text-align:center;margin-bottom:4px;">What Brings You In?</h1>
    <div style="width:100%;height:6px;background:rgba(255,255,255,0.1);border-radius:99px;overflow:hidden;">
      <div style="width:25%;height:100%;background:#f97316;border-radius:99px;"></div>
    </div>
  </div>
  <div style="flex:1;overflow-y:auto;padding:8px 16px 16px;">
    <div style="border:3px solid #f97316;border-radius:12px;padding:16px;box-shadow:0 0 20px rgba(249,115,22,0.5);margin-top:8px;">
      <button style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-radius:12px;border:2px solid rgba(45,212,160,0.4);background:#0d1218;color:#d1d5db;font-size:15px;cursor:pointer;">
        Select a reason...
        <span style="color:#6b7280;">▼</span>
      </button>
    </div>
    <div style="margin-top:12px;padding:0 4px;">
      <h2 style="font-size:clamp(38px,10vw,48px);font-weight:900;line-height:1.05;letter-spacing:-0.02em;">What's Going <span style="color:#2dd4a0;">On?</span></h2>
      <p style="font-size:11px;color:#6b7280;margin-top:8px;">No judgment. No waiting rooms. Just private care.</p>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
        <span style="font-size:8px;color:#6b7280;">🔒 HIPAA Encrypted</span>
        <span style="font-size:8px;color:#6b7280;">👩‍⚕️ Board-Certified</span>
        <span style="font-size:8px;color:#6b7280;">⭐ 4.9 · 10K+</span>
        <span style="font-size:8px;color:#6b7280;">👤 Same Provider</span>
      </div>
    </div>
  </div>
  <div style="flex-shrink:0;padding:4px 16px;padding-bottom:max(var(--sab,4px),4px);">
    <p style="text-align:center;color:#374151;font-size:8px;">🔒 HIPAA Compliant · Encrypted · Booking fee reserves your provider</p>
  </div>
</div>`;

interface WPEditorProProps {
  code?: string
  onCodeChange?: (code: string) => void
  visible?: boolean
  onClose?: () => void
}

export function WPEditorPro({ code: externalCode, onCodeChange, visible = true, onClose }: WPEditorProProps) {
  if (!visible) return null
  const [internalCode, setInternalCode] = useState(DEFAULT_CODE);
  const code = externalCode || internalCode;
  const setCode = (v: string) => { setInternalCode(v); onCodeChange?.(v); };
  const [did, setDid] = useState("i15p");
  const [bid, setBid] = useState("saf");
  const [zones, setZones] = useState(true);
  const [measures, setMeasures] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [panel, setPanel] = useState<string | null>(null); // null | "props" | "devices" | "warnings" | "code"
  const [imgResult, setImgResult] = useState<any>(null);
  const [imgAnalyzing, setImgAnalyzing] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [ghToken, setGhToken] = useState("");
  const [ghRepo, setGhRepo] = useState("");
  const [ghBranch, setGhBranch] = useState("main");
  const [ghPath, setGhPath] = useState("src/app/page.tsx");
  const [pushSt, setPushSt] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dev = (D as any)[did];
  const brw = (B as any)[bid];
  const et = brw.tc > 0 ? 0 : dev.st;
  const eb = brw.bc > 0 ? 0 : dev.sb;
  const visH = dev.h - brw.tc - brw.bc;
  const safeH = visH - et - eb;
  const overflow = dev.h - visH;
  const avail = bForD(dev);

  useEffect(() => { if (!avail.includes(bid)) setBid(avail[0]); }, [did]);

  // ═══ SCALE ═══
  const [autoScale, setAutoScale] = useState(0.5);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      const { width: cw, height: ch } = e.contentRect;
      const totalH = dev.h + brw.tc + brw.bc + 30;
      setAutoScale(Math.min((cw - 40) / (dev.w + 4), (ch - 40) / totalH, 1));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [dev, brw]);

  // ═══ PREVIEW HTML ═══
  const previewHTML = useMemo(() => `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=${dev.w},initial-scale=1,viewport-fit=cover">
<style>
:root{--sat:${et}px;--sab:${eb}px;--sal:0px;--sar:0px;}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${dev.w}px;height:${visH}px;overflow:hidden;background:#000;font-family:system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
[data-v-hover]{transition:outline 0.1s;}
</style>
<script src="https://cdn.tailwindcss.com"><\/script>
<script>
let lastEl=null;
document.addEventListener('mouseover',(e)=>{
  if(lastEl)lastEl.style.outline='';
  e.target.style.outline='2px solid rgba(249,115,22,0.4)';
  lastEl=e.target;
});
document.addEventListener('mouseout',(e)=>{e.target.style.outline='';});
document.addEventListener('click',(e)=>{
  e.preventDefault();e.stopPropagation();
  const el=e.target;const cs=getComputedStyle(el);const r=el.getBoundingClientRect();
  // Get outer HTML snippet
  const clone=el.cloneNode(false);
  const tag=clone.outerHTML.slice(0,200);
  window.parent.postMessage({type:'sel',tag:el.tagName.toLowerCase(),cls:el.className||'',
    txt:(el.innerText||'').slice(0,100),html:tag,id:el.id||'',
    rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},
    sty:{
      color:cs.color,backgroundColor:cs.backgroundColor,
      fontSize:cs.fontSize,fontWeight:cs.fontWeight,fontFamily:cs.fontFamily,fontStyle:cs.fontStyle,
      textAlign:cs.textAlign,textDecoration:cs.textDecoration,textTransform:cs.textTransform,
      lineHeight:cs.lineHeight,letterSpacing:cs.letterSpacing,
      padding:cs.padding,paddingTop:cs.paddingTop,paddingBottom:cs.paddingBottom,paddingLeft:cs.paddingLeft,paddingRight:cs.paddingRight,
      margin:cs.margin,marginTop:cs.marginTop,marginBottom:cs.marginBottom,
      width:cs.width,height:cs.height,maxWidth:cs.maxWidth,minHeight:cs.minHeight,
      border:cs.border,borderRadius:cs.borderRadius,
      display:cs.display,position:cs.position,
      flexDirection:cs.flexDirection,justifyContent:cs.justifyContent,alignItems:cs.alignItems,gap:cs.gap,
      overflow:cs.overflow,opacity:cs.opacity,
      boxShadow:cs.boxShadow,background:cs.background,
      transform:cs.transform,transition:cs.transition,
    }
  },'*');
});
<\/script>
</head><body><div id="root" style="width:${dev.w}px;height:${visH}px;overflow:auto;">${code}</div></body></html>`, [code, dev, brw, et, eb, visH]);

  useEffect(() => {
    if (!iframeRef.current) return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      const blob = new Blob([previewHTML], { type: "text/html" });
      if (iframeRef.current) iframeRef.current.src = URL.createObjectURL(blob);
    }, 250);
  }, [previewHTML]);

  // ═══ ELEMENT SELECTION ═══
  useEffect(() => {
    const h = (e: MessageEvent) => { if (e.data?.type === "sel") { setSel(e.data); setPanel("props"); } };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, []);

  // ═══ FILE ═══
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => { if (typeof ev.target?.result === 'string') setCode(ev.target.result); };
    r.readAsText(f);
  };
  const download = () => { const b = new Blob([code], { type: "text/plain" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "page.tsx"; a.click(); };

  // ═══ AUTOSAVE ═══
  useEffect(() => {
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem("vep-code", code); } catch {}
      setSaveStatus("saved");
    }, 600);
  }, [code]);
  useEffect(() => { try { const s = localStorage.getItem("vep-code"); if (s) setCode(s); } catch {} }, []);

  // ═══ IMAGE AI ═══
  const onImg = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImgAnalyzing(true); setPanel("image");
    try {
      const b64 = await new Promise(res => { const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1]); r.readAsDataURL(f); });
      const resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: f.type, data: b64 } },
            { type: "text", text: `Analyze this UI. Return ONLY JSON: {"colors":[{"hex":"#...","name":"...","usage":"..."}],"typography":[{"el":"...","size":"...","weight":"...","family":"...","color":"#..."}],"spacing":[{"el":"...","value":"..."}],"borders":[{"el":"...","radius":"...","color":"#...","width":"..."}],"backgrounds":[{"el":"...","value":"..."}]}` }
          ]}]})});
      const data = await resp.json();
      const txt = data.content?.find((b: any) => b.type === "text")?.text || "";
      setImgResult(JSON.parse(txt.replace(/```json|```/g, "").trim()));
    } catch (err: any) { setImgResult({ error: err.message }); }
    setImgAnalyzing(false);
  };

  // ═══ GITHUB ═══
  const push = async () => {
    if (!ghToken || !ghRepo) return; setPushSt("pushing...");
    try {
      const g = await fetch(`https://api.github.com/repos/${ghRepo}/contents/${ghPath}?ref=${ghBranch}`, { headers: { Authorization: `Bearer ${ghToken}` } });
      const ex = g.ok ? await g.json() : null;
      const p = await fetch(`https://api.github.com/repos/${ghRepo}/contents/${ghPath}`, { method: "PUT",
        headers: { Authorization: `Bearer ${ghToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Update via EditorPro", content: btoa(unescape(encodeURIComponent(code))), branch: ghBranch, ...(ex?.sha ? { sha: ex.sha } : {}) }) });
      if (!p.ok) throw new Error(`${p.status}`);
      setPushSt("✓"); setTimeout(() => setPushSt(null), 2000);
    } catch (err: any) { setPushSt("✗ " + err.message); setTimeout(() => setPushSt(null), 4000); }
  };

  const rgb2hex = (rgb: string) => { if (!rgb || rgb === "transparent" || rgb.includes("0, 0, 0, 0")) return "transparent"; const m = rgb.match(/\d+/g); if (!m || m.length < 3) return rgb; return "#" + m.slice(0, 3).map((n: string) => parseInt(n).toString(16).padStart(2, "0")).join(""); };
  const sc = { critical: "#ef4444", high: "#f97316", medium: "#eab308" };
  const deviceWarnings = useMemo(() => {
    const w = [WARN[0]]; // 100vh always
    if (dev.di) w.push(WARN[1]);
    if (dev.sb > 0) w.push(WARN[2]);
    w.push(WARN[3]); // keyboard always
    if (dev.c === "ios") w.push(WARN[4]);
    if (dev.c === "and") w.push(WARN[5]);
    return w;
  }, [did]);

  // ═══ STYLE GROUPS for inspector ═══
  const styleGroups = useMemo(() => {
    if (!sel?.sty) return [];
    const s = sel.sty;
    return [
      { label: "Typography", items: [
        { k: "color", v: s.color, type: "color" },
        { k: "fontSize", v: s.fontSize, type: "size" },
        { k: "fontWeight", v: s.fontWeight, type: "select", opts: ["100","200","300","400","500","600","700","800","900"] },
        { k: "fontFamily", v: s.fontFamily, type: "text" },
        { k: "textAlign", v: s.textAlign, type: "select", opts: ["left","center","right","justify"] },
        { k: "lineHeight", v: s.lineHeight, type: "text" },
        { k: "letterSpacing", v: s.letterSpacing, type: "text" },
        { k: "textTransform", v: s.textTransform, type: "select", opts: ["none","uppercase","lowercase","capitalize"] },
      ]},
      { label: "Background", items: [
        { k: "backgroundColor", v: s.backgroundColor, type: "color" },
        { k: "background", v: s.background, type: "text" },
        { k: "opacity", v: s.opacity, type: "text" },
      ]},
      { label: "Spacing", items: [
        { k: "paddingTop", v: s.paddingTop, type: "size" },
        { k: "paddingBottom", v: s.paddingBottom, type: "size" },
        { k: "paddingLeft", v: s.paddingLeft, type: "size" },
        { k: "paddingRight", v: s.paddingRight, type: "size" },
        { k: "marginTop", v: s.marginTop, type: "size" },
        { k: "marginBottom", v: s.marginBottom, type: "size" },
      ]},
      { label: "Size", items: [
        { k: "width", v: s.width, type: "text" },
        { k: "height", v: s.height, type: "text" },
        { k: "maxWidth", v: s.maxWidth, type: "text" },
        { k: "minHeight", v: s.minHeight, type: "text" },
      ]},
      { label: "Border", items: [
        { k: "borderRadius", v: s.borderRadius, type: "size" },
        { k: "border", v: s.border, type: "text" },
        { k: "boxShadow", v: s.boxShadow, type: "text" },
      ]},
      { label: "Layout", items: [
        { k: "display", v: s.display, type: "select", opts: ["block","flex","grid","inline","inline-flex","none"] },
        { k: "flexDirection", v: s.flexDirection, type: "select", opts: ["row","column","row-reverse","column-reverse"] },
        { k: "justifyContent", v: s.justifyContent, type: "select", opts: ["flex-start","center","flex-end","space-between","space-around"] },
        { k: "alignItems", v: s.alignItems, type: "select", opts: ["flex-start","center","flex-end","stretch","baseline"] },
        { k: "gap", v: s.gap, type: "size" },
        { k: "position", v: s.position, type: "select", opts: ["static","relative","absolute","fixed","sticky"] },
        { k: "overflow", v: s.overflow, type: "select", opts: ["visible","hidden","auto","scroll"] },
      ]},
    ];
  }, [sel]);

  const panelW = panel ? 320 : 0;

  return (
    <div style={{ height: "100vh", width: "100vw", background: "#050607", color: "#e5e7eb", fontFamily: "'Inter',system-ui,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ═══ TOP BAR ═══ */}
      <div style={{ flexShrink: 0, height: 42, background: "#0a0b0d", borderBottom: "1px solid #1f2937", display: "flex", alignItems: "center", padding: "0 12px", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 24, height: 24, borderRadius: 5, background: "linear-gradient(135deg,#2dd4a0,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, color: "#000" }}>M</div>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Editor<span style={{ color: "#2dd4a0" }}>Pro</span></span>
        </div>
        <S />

        {/* Device quick select */}
        <div style={{ display: "flex", gap: 2, overflow: "auto" }}>
          {Object.entries(D).filter(([k]) => ["i15p","i16pro","ise","px9","gs24","ipad","d1440"].includes(k)).map(([k, d]) =>
            <Chip key={k} active={k === did} onClick={() => setDid(k)}>{d.n}</Chip>
          )}
          <Chip onClick={() => setPanel(panel === "devices" ? null : "devices")} accent>All ▾</Chip>
        </div>
        <S />

        {/* Browser mode */}
        <div style={{ display: "flex", gap: 2 }}>
          {avail.map(k => <Chip key={k} active={k === bid} onClick={() => setBid(k)}>{(B as any)[k]?.n}</Chip>)}
        </div>
        <div style={{ flex: 1 }} />

        {/* Actions */}
        <Tb onClick={() => fileRef.current?.click()}>📂</Tb>
        <input ref={fileRef} type="file" accept=".tsx,.jsx,.html" onChange={onFile} style={{ display: "none" }} />
        <Tb onClick={() => imgRef.current?.click()}>🖼️</Tb>
        <input ref={imgRef} type="file" accept="image/*" onChange={onImg} style={{ display: "none" }} />
        <Tb onClick={download}>💾</Tb>
        <Tb onClick={() => setPanel(panel === "code" ? null : "code")}>&lt;/&gt;</Tb>
        <Tb onClick={() => setPanel(panel === "github" ? null : "github")}>⬆️</Tb>
        <span style={{ fontSize: 9, color: saveStatus === "saved" ? "#2dd4a0" : "#f59e0b" }}>●</span>
        {pushSt && <span style={{ fontSize: 9, color: pushSt.includes("✗") ? "#f87171" : "#2dd4a0" }}>{pushSt}</span>}
      </div>

      {/* ═══ INFO BAR ═══ */}
      <div style={{ flexShrink: 0, height: 24, background: "#08090a", borderBottom: "1px solid #111318", display: "flex", alignItems: "center", padding: "0 12px", gap: 10, fontSize: 9, color: "#4b5563" }}>
        <span style={{ fontWeight: 600, color: "#9ca3af" }}>{dev.n}</span>
        <span>{dev.w}×{dev.h}</span>
        <span>Visible: {visH}px</span>
        <span>Safe: {safeH}px</span>
        <span>↑{et} ↓{eb}</span>
        {overflow > 0 && <span style={{ color: "#ef4444" }}>⚠ 100vh +{overflow}px</span>}
        <div style={{ flex: 1 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
          <input type="checkbox" checked={zones} onChange={e => setZones(e.target.checked)} style={{ accentColor: "#ef4444", width: 10, height: 10 }} />
          <span style={{ color: zones ? "#ef4444" : "#4b5563" }}>Zones</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
          <input type="checkbox" checked={measures} onChange={e => setMeasures(e.target.checked)} style={{ accentColor: "#f97316", width: 10, height: 10 }} />
          Px
        </label>
        <button onClick={() => setPanel(panel === "warnings" ? null : "warnings")} style={{ background: "none", border: "none", color: "#f97316", cursor: "pointer", fontSize: 9 }}>
          ⚠ {deviceWarnings.length}
        </button>
      </div>

      {/* ═══ MAIN ═══ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ═══ CENTER: DEVICE PREVIEW ═══ */}
        <div ref={containerRef} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "#050607", transition: "all 0.2s" }}>
          <div style={{ transform: `scale(${autoScale})`, transformOrigin: "center center", transition: "transform 0.15s" }}>
            <div style={{ width: dev.w + 2, position: "relative", borderRadius: dev.r, overflow: "hidden", boxShadow: "0 0 0 1px #1f2937, 0 25px 80px rgba(0,0,0,0.6)", background: "#000" }}>

              {/* Top chrome */}
              {brw.tc > 0 && <div style={{ height: brw.tc, background: "#1a1b1e", borderBottom: "1px solid #333", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 6 }}>
                <div style={{ width: dev.w * 0.65, height: 22, background: "#111318", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#6b7280", gap: 3 }}>🔒 patient.medazonhealth.com</div>
              </div>}

              {/* Content */}
              <div style={{ width: dev.w, height: visH, position: "relative" }}>
                <iframe ref={iframeRef} style={{ width: dev.w, height: visH, border: "none", display: "block" }} sandbox="allow-scripts" />

                {/* SAFE ZONES */}
                {zones && <>
                  {et > 0 && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: et, background: "rgba(239,68,68,0.12)", borderBottom: "1px dashed rgba(239,68,68,0.4)", pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {measures && <Tag c="rgba(239,68,68,0.9)">↕{et}px UNSAFE</Tag>}
                    {dev.di ? <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 126, height: 36, borderRadius: 20, background: "rgba(0,0,0,0.7)", border: "1px solid rgba(239,68,68,0.2)" }} /> : null}
                  </div>}
                  {eb > 0 && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: eb, background: "rgba(239,68,68,0.12)", borderTop: "1px dashed rgba(239,68,68,0.4)", pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {measures && <Tag c="rgba(239,68,68,0.9)">↕{eb}px UNSAFE</Tag>}
                    {dev.sb > 0 && <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", width: 134, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.12)" }} />}
                  </div>}
                  {measures && et > 0 && <div style={{ position: "absolute", top: et, left: 0, right: 0, pointerEvents: "none", display: "flex", justifyContent: "center" }}><Tag c="#2dd4a0">── SAFE ──</Tag></div>}
                  {measures && eb > 0 && <div style={{ position: "absolute", bottom: eb, left: 0, right: 0, pointerEvents: "none", display: "flex", justifyContent: "center" }}><Tag c="#2dd4a0">── SAFE ──</Tag></div>}
                </>}

                {/* Selected element highlight */}
                {sel && sel.rect && <div style={{ position: "absolute", left: sel.rect.x, top: sel.rect.y, width: sel.rect.w, height: sel.rect.h, border: "2px solid #f97316", borderRadius: 2, pointerEvents: "none", boxShadow: "0 0 12px rgba(249,115,22,0.3)" }}>
                  {measures && <span style={{ position: "absolute", top: -16, left: 0, fontSize: 8, color: "#f97316", fontFamily: "monospace", background: "rgba(0,0,0,0.8)", padding: "1px 4px", borderRadius: 2, whiteSpace: "nowrap" }}>{sel.rect.w}×{sel.rect.h}</span>}
                </div>}

                {/* Device dimensions */}
                {measures && <>
                  <div style={{ position: "absolute", bottom: -14, left: "50%", transform: "translateX(-50%)", fontSize: 8, color: "#374151", fontFamily: "monospace", pointerEvents: "none" }}>{dev.w}px</div>
                  <div style={{ position: "absolute", top: "50%", right: -26, transform: "translateY(-50%) rotate(90deg)", fontSize: 8, color: "#374151", fontFamily: "monospace", pointerEvents: "none", whiteSpace: "nowrap" }}>{visH}px</div>
                </>}
              </div>

              {/* Bottom chrome */}
              {brw.bc > 0 && <div style={{ height: brw.bc, background: "#1a1b1e", borderTop: "1px solid #333", display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
                {brw.bc >= 44 ? <>
                  <span style={{ fontSize: 9, color: "#555" }}>◀</span><span style={{ fontSize: 9, color: "#555" }}>▶</span>
                  <span style={{ fontSize: 9, color: "#555" }}>⬆</span><span style={{ fontSize: 9, color: "#555" }}>📑</span>
                </> : <div style={{ width: 134, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.12)" }} />}
              </div>}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PANEL (slide-out) ═══ */}
        {panel && (
          <div style={{ width: 320, flexShrink: 0, background: "#0a0b0d", borderLeft: "1px solid #1f2937", display: "flex", flexDirection: "column", overflow: "hidden", animation: "slideIn 0.15s ease" }}>
            {/* Panel header */}
            <div style={{ flexShrink: 0, height: 36, background: "#0c0d0f", borderBottom: "1px solid #1f2937", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#f97316" }}>
                {panel === "props" ? "🔍 Properties" : panel === "devices" ? "📱 All Devices" : panel === "warnings" ? "⚠️ Warnings" : panel === "code" ? "</> Code" : panel === "image" ? "🖼️ Image AI" : "⬆️ GitHub"}
              </span>
              <button onClick={() => { setPanel(null); setSel(null); }} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>

            {/* Panel content */}
            <div style={{ flex: 1, overflow: "auto", padding: 12 }}>

              {/* PROPERTIES */}
              {panel === "props" && sel && <>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{ background: "#f97316", color: "#000", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>&lt;{sel.tag}&gt;</span>
                  <span style={{ fontSize: 10, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{sel.txt}</span>
                </div>
                {sel.rect && <div style={{ background: "#111318", borderRadius: 6, padding: 8, border: "1px solid #1f2937", marginBottom: 10, display: "flex", gap: 12, fontSize: 10, color: "#9ca3af", fontFamily: "monospace" }}>
                  <span>x:{sel.rect.x}</span><span>y:{sel.rect.y}</span><span>w:{sel.rect.w}</span><span>h:{sel.rect.h}</span>
                </div>}
                {styleGroups.map((g, gi) => (
                  <div key={gi} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: "#4b5563", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{g.label}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {g.items.filter(i => i.v && i.v !== "none" && i.v !== "normal" && i.v !== "0px" && i.v !== "auto" && i.v !== "static" && i.v !== "visible" && i.v !== "transparent" && !i.v.includes("0, 0, 0, 0")).map((item, ii) => (
                        <div key={ii} style={{ display: "flex", alignItems: "center", gap: 6, background: "#111318", borderRadius: 5, padding: "5px 8px", border: "1px solid #1f2937" }}>
                          {item.type === "color" && <span style={{ width: 14, height: 14, borderRadius: 3, background: item.v, border: "1px solid #333", flexShrink: 0 }} />}
                          <span style={{ fontSize: 9, color: "#6b7280", minWidth: 60, flexShrink: 0 }}>{item.k.replace(/([A-Z])/g, '-$1').toLowerCase()}</span>
                          <span style={{ fontSize: 10, color: "#e5e7eb", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                            {item.type === "color" ? rgb2hex(item.v) : item.v}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>}

              {/* DEVICES */}
              {panel === "devices" && <>
                {["ios", "and", "tab", "desk"].map(cat => (
                  <div key={cat} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 9, color: "#4b5563", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{cat === "ios" ? "iPhone" : cat === "and" ? "Android" : cat === "tab" ? "Tablet" : "Desktop"}</div>
                    {Object.entries(D).filter(([, d]) => d.c === cat).map(([k, d]) => (
                      <button key={k} onClick={() => { setDid(k); setPanel(null); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 8px", borderRadius: 6, background: k === did ? "#1f2937" : "transparent", border: k === did ? "1px solid #f97316" : "1px solid transparent", cursor: "pointer", marginBottom: 2, textAlign: "left" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: k === did ? "#fff" : "#9ca3af" }}>{d.n}</div>
                          <div style={{ fontSize: 9, color: "#4b5563" }}>{d.w}×{d.h} · ↑{d.st} ↓{d.sb}{d.di ? " · DI" : ""}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </>}

              {/* WARNINGS */}
              {panel === "warnings" && deviceWarnings.map((w, i) => (
                <div key={i} style={{ background: "#111318", borderRadius: 6, padding: 8, border: `1px solid ${(sc as any)[w.s]}33`, marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: (sc as any)[w.s], textTransform: "uppercase" }}>{w.s}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#e5e7eb" }}>{w.t}</span>
                  </div>
                  <p style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>{w.d}</p>
                  <p style={{ fontSize: 9, color: "#2dd4a0" }}>Fix: {w.f}</p>
                </div>
              ))}

              {/* CODE */}
              {panel === "code" && <div>
                <textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false}
                  style={{ width: "100%", height: "calc(100vh - 200px)", background: "#08090a", color: "#e5e7eb", border: "1px solid #1f2937", borderRadius: 6, padding: 10, fontSize: 12, fontFamily: "'JetBrains Mono',monospace", resize: "none", outline: "none", lineHeight: 1.5 }} />
              </div>}

              {/* IMAGE AI */}
              {panel === "image" && (imgAnalyzing
                ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 8 }}>
                    <div style={{ width: 20, height: 20, border: "2px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: 11, color: "#6b7280" }}>Analyzing...</span>
                  </div>
                : imgResult?.error ? <p style={{ color: "#f87171", fontSize: 11 }}>Error: {imgResult.error}</p>
                : imgResult ? <>
                    {imgResult.colors?.map((c: any, i: number) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "#111318", borderRadius: 5, padding: "5px 8px", border: "1px solid #1f2937", marginBottom: 3 }}>
                        <span style={{ width: 16, height: 16, borderRadius: 3, background: c.hex, border: "1px solid #333", flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontFamily: "monospace", color: "#e5e7eb" }}>{c.hex}</span>
                        <span style={{ fontSize: 9, color: "#6b7280", flex: 1 }}>{c.name}</span>
                      </div>
                    ))}
                    {imgResult.typography?.map((t: any, i: number) => (
                      <div key={i} style={{ background: "#111318", borderRadius: 5, padding: 6, border: "1px solid #1f2937", marginBottom: 3 }}>
                        <div style={{ fontSize: 10, color: "#e5e7eb", fontWeight: 600 }}>{t.el}</div>
                        <div style={{ fontSize: 9, color: "#6b7280", fontFamily: "monospace" }}>{t.size} / {t.weight} / {t.color}</div>
                      </div>
                    ))}
                  </>
                : <div style={{ textAlign: "center", padding: 40, color: "#4b5563" }}>
                    <p style={{ fontSize: 28, marginBottom: 8 }}>🖼️</p>
                    <p style={{ fontSize: 11 }}>Upload a screenshot to analyze</p>
                  </div>
              )}

              {/* GITHUB */}
              {panel === "github" && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <GhInp label="Token" type="password" value={ghToken} onChange={e => setGhToken(e.target.value)} ph="ghp_..." />
                <GhInp label="Repo" value={ghRepo} onChange={e => setGhRepo(e.target.value)} ph="owner/repo" />
                <GhInp label="Branch" value={ghBranch} onChange={e => setGhBranch(e.target.value)} />
                <GhInp label="Path" value={ghPath} onChange={e => setGhPath(e.target.value)} />
                <button onClick={push} style={{ width: "100%", padding: "10px", borderRadius: 6, background: "linear-gradient(135deg,#f97316,#ea8a2e)", color: "#fff", fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer" }}>Push →</button>
                <button onClick={download} style={{ width: "100%", padding: "10px", borderRadius: 6, background: "#1a1b1e", color: "#e5e7eb", fontWeight: 500, fontSize: 12, border: "1px solid #1f2937", cursor: "pointer" }}>💾 Download</button>
              </div>}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

// ═══ Tiny components ═══
function S() { return <div style={{ width: 1, height: 20, background: "#1f2937", flexShrink: 0 }} />; }
function Chip({ children, active, onClick, accent }: { children: React.ReactNode; active?: boolean; onClick: () => void; accent?: boolean }) {
  return <button onClick={onClick} style={{ flexShrink: 0, padding: "3px 8px", fontSize: 9, fontWeight: active ? 700 : 400, color: accent ? "#f97316" : active ? "#fff" : "#6b7280", background: active ? "#1f2937" : "transparent", border: active ? "1px solid #374151" : accent ? "1px solid #f97316" : "1px solid transparent", borderRadius: 4, cursor: "pointer", whiteSpace: "nowrap" }}>{children}</button>;
}
function Tb({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} style={{ width: 28, height: 28, borderRadius: 5, background: "#1a1b1e", border: "1px solid #1f2937", color: "#e5e7eb", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</button>;
}
function Tag({ children, c }: { children: React.ReactNode; c: string }) {
  return <span style={{ fontSize: 7, color: c, fontWeight: 700, fontFamily: "monospace", background: "rgba(0,0,0,0.6)", padding: "1px 4px", borderRadius: 2 }}>{children}</span>;
}
function GhInp({ label, type, value, onChange, ph }: { label: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; ph?: string }) {
  return <label style={{ fontSize: 10, color: "#6b7280" }}>{label}<input type={type || "text"} value={value} onChange={onChange} placeholder={ph} style={{ display: "block", width: "100%", marginTop: 3, padding: "7px 10px", borderRadius: 5, background: "#111318", border: "1px solid #1f2937", color: "#e5e7eb", fontSize: 11, fontFamily: "monospace", outline: "none" }} /></label>;
}
