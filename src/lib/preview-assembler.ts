// =====================================================
// PREVIEW ASSEMBLER — Builds self-contained HTML from generated files
//
// Handles: .html, .tsx, .jsx, .ts, .js, .css
// For React/TSX: loads React + ReactDOM + Babel standalone from CDN,
// inlines all components, transpiles JSX in-browser, renders to #root
// =====================================================

import type { GeneratedFile } from '@/hooks/useChat'

// ── File categorization ──

interface CategorizedFiles {
  html: GeneratedFile[]
  react: GeneratedFile[]    // .tsx, .jsx
  script: GeneratedFile[]   // .ts, .js (non-JSX)
  css: GeneratedFile[]
}

function categorize(files: GeneratedFile[]): CategorizedFiles {
  const result: CategorizedFiles = { html: [], react: [], script: [], css: [] }
  for (const f of files) {
    const ext = f.path.split('.').pop()?.toLowerCase() || ''
    if (ext === 'html') result.html.push(f)
    else if (ext === 'tsx' || ext === 'jsx') result.react.push(f)
    else if (ext === 'ts' || ext === 'js') result.script.push(f)
    else if (ext === 'css') result.css.push(f)
  }
  return result
}

// ── Strip TypeScript type annotations for browser execution ──
// Babel standalone handles JSX but we need to strip TS-specific syntax
// that Babel's browser preset doesn't cover well

function stripImports(code: string): string {
  // Remove import statements — we inline everything
  return code
    .replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+/gm, '')
}

function stripTypeAnnotations(code: string): string {
  let result = code
  // Remove interface/type declarations (entire block)
  result = result.replace(/^(?:export\s+)?(?:interface|type)\s+\w+[\s\S]*?^\}/gm, '')
  // Single-line type/interface
  result = result.replace(/^(?:export\s+)?(?:interface|type)\s+\w+\s*=\s*[^;]+;/gm, '')
  // Remove `: Type` annotations from function params and variables
  // This is intentionally conservative — handles common patterns
  result = result.replace(/:\s*(?:string|number|boolean|any|void|never|null|undefined|React\.\w+(?:<[^>]*>)?|JSX\.Element|Record<[^>]+>|Array<[^>]+>|\w+(?:<[^>]*>)?(?:\[\])?)\s*([,)=}])/g, '$1')
  // Remove `as Type` casts
  result = result.replace(/\s+as\s+\w+(?:<[^>]*>)?/g, '')
  // Remove generic type params on function declarations: function foo<T>(
  result = result.replace(/(function\s+\w+)\s*<[^>]+>/g, '$1')
  // Remove React.FC<...> and similar
  result = result.replace(/:\s*React\.\w+(?:<[^>]*>)?\s*=/g, ' =')
  return result
}

// ── Find the entry component (App or first component) ──

function findEntryComponent(files: GeneratedFile[]): string {
  // Prefer App.tsx/App.jsx
  const appFile = files.find(f => /\bApp\.(tsx|jsx)$/i.test(f.path))
  if (appFile) return 'App'

  // Prefer index.tsx/index.jsx
  const indexFile = files.find(f => /\bindex\.(tsx|jsx)$/i.test(f.path))
  if (indexFile) {
    // Try to extract the default export name
    const match = indexFile.content.match(/(?:export\s+default\s+(?:function\s+)?|const\s+)(\w+)/)
    return match?.[1] || 'App'
  }

  // Fall back to first file's component name
  if (files.length > 0) {
    const firstFile = files[0]
    if (firstFile) {
      const match = firstFile.content.match(/(?:export\s+default\s+)?function\s+(\w+)/)
      return match?.[1] || 'App'
    }
  }

  return 'App'
}

// ── Sort files: dependencies first, entry last ──

function sortFiles(files: GeneratedFile[], entryName: string): GeneratedFile[] {
  const entry: GeneratedFile[] = []
  const rest: GeneratedFile[] = []
  for (const f of files) {
    if (f.path.toLowerCase().includes(entryName.toLowerCase() + '.')) {
      entry.push(f)
    } else {
      rest.push(f)
    }
  }
  // Dependencies first, then entry component
  return [...rest, ...entry]
}

// ── Build React preview HTML ──

// ── Console capture — intercepts console.log/warn/error and postMessages to parent ──

const CONSOLE_CAPTURE = `
<script>
(function(){
  var _origLog = console.log, _origWarn = console.warn, _origErr = console.error, _origInfo = console.info;
  function send(level, args) {
    try {
      var msg = Array.prototype.map.call(args, function(a) {
        if (a === null) return 'null';
        if (a === undefined) return 'undefined';
        if (typeof a === 'object') { try { return JSON.stringify(a, null, 2); } catch(e) { return String(a); } }
        return String(a);
      }).join(' ');
      window.parent.postMessage({ type: 'wp-console', level: level, message: msg, timestamp: Date.now() }, '*');
    } catch(e) {}
  }
  console.log = function() { send('log', arguments); _origLog.apply(console, arguments); };
  console.warn = function() { send('warn', arguments); _origWarn.apply(console, arguments); };
  console.error = function() { send('error', arguments); _origErr.apply(console, arguments); };
  console.info = function() { send('info', arguments); _origInfo.apply(console, arguments); };
})();
<\\/script>`

function buildReactPreview(cat: CategorizedFiles): string {
  const allReactFiles = [...cat.react, ...cat.script]
  const entryName = findEntryComponent(cat.react)
  const sorted = sortFiles(allReactFiles, entryName)

  // Process each file: strip imports, strip TS types
  const processedScripts = sorted.map(f => {
    let code = stripImports(f.content)
    if (f.path.endsWith('.ts') || f.path.endsWith('.tsx')) {
      code = stripTypeAnnotations(code)
    }
    return `// ── ${f.path} ──\n${code}`
  }).join('\n\n')

  // Collect CSS
  const cssContent = cat.css.map(f => f.content).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">
${CONSOLE_CAPTURE}
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js" crossorigin="anonymous"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js" crossorigin="anonymous"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.24.4/babel.min.js" crossorigin="anonymous"><\/script>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.1/dist/tailwind.min.css" rel="stylesheet" crossorigin="anonymous">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}
${cssContent}
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-type="module">
const { useState, useEffect, useRef, useCallback, useMemo, useContext, createContext, Fragment } = React;

${processedScripts}

// ── Mount ──
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(${entryName}));
<\/script>
<script>
function showError(msg, line, col) {
  var el = document.getElementById('root');
  var display = (msg && msg !== 'Script error.' && msg !== 'Script error') ? msg : 'A script error occurred. Check that your component has no syntax errors.';
  if (el) {
    el.innerHTML = '<div style="padding:24px;font-family:monospace"><div style="color:#f87171;font-size:14px;font-weight:700;margin-bottom:8px">Runtime Error</div><pre style="color:#fbbf24;font-size:11px;white-space:pre-wrap;word-break:break-word">' + display + '</pre>' + (line ? '<div style="color:#71717a;font-size:10px;margin-top:8px">Line ' + line + (col ? ':' + col : '') + '</div>' : '') + '</div>';
  }
  window.parent.postMessage({ type: 'wp-iframe-error', message: display }, '*');
}
window.onerror = function(msg, src, line, col, err) {
  var detail = (err && err.message) ? err.message : String(msg);
  showError(detail, line, col);
  return true;
};
window.addEventListener('unhandledrejection', function(e) {
  var msg = e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled promise rejection';
  showError(msg, null, null);
});
<\/script>
</body>
</html>`
}

// ── Build plain HTML/JS/CSS preview ──

function buildPlainPreview(cat: CategorizedFiles): string {
  const cssContent = cat.css.map(f => f.content).join('\n')
  const jsContent = [...cat.script].map(f => f.content).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">
${CONSOLE_CAPTURE}
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
${cssContent}
</style>
</head>
<body>
<div id="root"></div>
<script>${jsContent}<\/script>
<script>
window.onerror = function(msg) {
  document.getElementById('root').innerHTML = '<pre style="padding:16px;color:#f87171;font-size:12px">' + msg + '</pre>';
  window.parent.postMessage({ type: 'wp-iframe-error', message: String(msg) }, '*');
};
<\/script>
</body>
</html>`
}

// ── Main entry point ──


// ── Click-to-edit inspector injection ──
const INSPECTOR_JS = `
(function() {
  var selected = null;
  var originalStyles = {};
  var overlay = null;
  var active = false;
  var uidCounter = 0;

  // Assign unique IDs to all elements on load
  function assignUids() {
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      if (!all[i].dataset.feUid) {
        all[i].dataset.feUid = 'fe-' + (++uidCounter);
      }
    }
  }

  function getStyles(el) {
    var cs = window.getComputedStyle(el);
    return {
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      padding: cs.padding,
      borderRadius: cs.borderRadius,
      opacity: cs.opacity,
      letterSpacing: cs.letterSpacing,
      lineHeight: cs.lineHeight,
      textAlign: cs.textAlign,
      display: cs.display,
      width: cs.width,
      height: cs.height
    };
  }

  function getDirectText(el) {
    var text = '';
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3) {
        text += el.childNodes[i].textContent;
      }
    }
    return text.trim();
  }

  function showOverlay(el) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;box-shadow:0 0 0 2px #00f5a0,0 0 0 4px rgba(0,245,160,.2);border-radius:3px;transition:all .08s ease;';
      var badge = document.createElement('div');
      badge.id = '__fe_badge';
      badge.style.cssText = 'position:absolute;top:-24px;left:0;background:#00f5a0;color:#000;font:700 10px/20px monospace;padding:1px 7px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3);';
      overlay.appendChild(badge);
      document.body.appendChild(overlay);
    }
    var r = el.getBoundingClientRect();
    overlay.style.left = (r.left - 2) + 'px';
    overlay.style.top = (r.top - 2) + 'px';
    overlay.style.width = (r.width + 4) + 'px';
    overlay.style.height = (r.height + 4) + 'px';
    overlay.style.display = 'block';
    var badge = overlay.querySelector('#__fe_badge');
    badge.textContent = el.tagName.toLowerCase() + (el.id ? '#'+el.id : '') + (el.className && typeof el.className==='string' ? '.'+el.className.trim().split(/\s+/)[0] : '');
  }

  function hideOverlay() {
    if (overlay) overlay.style.display = 'none';
  }

  function selectElement(el) {
    if (!el || el === document.body || el === document.documentElement) return;
    selected = el;
    // Save original inline styles for reset
    originalStyles[el.dataset.feUid] = el.getAttribute('style') || '';

    var info = {
      uid: el.dataset.feUid,
      tag: el.tagName.toLowerCase(),
      text: getDirectText(el),
      rect: el.getBoundingClientRect(),
      styles: getStyles(el)
    };
    window.parent.postMessage({ type: 'fe-element-selected', element: info }, '*');
    showOverlay(el);
  }

  function onMouseMove(e) {
    if (!active) return;
    if (e.target === overlay || overlay && overlay.contains(e.target)) return;
    showOverlay(e.target);
  }

  function onClick(e) {
    if (!active) return;
    if (e.target === overlay || overlay && overlay.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    selectElement(e.target);
  }

  function activate() {
    active = true;
    assignUids();
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.body.style.cursor = 'crosshair';
  }

  function deactivate() {
    active = false;
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.body.style.cursor = '';
    hideOverlay();
  }

  // Listen for commands from parent
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type) return;

    if (e.data.type === 'fe-activate-inspector') {
      activate();
    }

    if (e.data.type === 'fe-deactivate-inspector') {
      deactivate();
      selected = null;
      hideOverlay();
    }

    if (e.data.type === 'fe-apply-style') {
      var uid = e.data.uid;
      var el = document.querySelector('[data-fe-uid="' + uid + '"]');
      if (!el) return;
      el.style[e.data.prop] = e.data.value;
      if (selected && selected.dataset.feUid === uid) showOverlay(el);
    }

    if (e.data.type === 'fe-apply-text') {
      var uid = e.data.uid;
      var el = document.querySelector('[data-fe-uid="' + uid + '"]');
      if (!el) return;
      // Only update text nodes, preserve child elements
      for (var i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent.trim()) {
          el.childNodes[i].textContent = e.data.text;
          break;
        }
      }
      if (el.childNodes.length === 0 || (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3)) {
        el.textContent = e.data.text;
      }
    }

    if (e.data.type === 'fe-reset-element') {
      var uid = e.data.uid;
      var el = document.querySelector('[data-fe-uid="' + uid + '"]');
      if (!el) return;
      el.setAttribute('style', originalStyles[uid] || '');
      if (selected && selected.dataset.feUid === uid) showOverlay(el);
    }
  });

  // Auto-activate on load (parent controls via messages)
  document.addEventListener('DOMContentLoaded', function() {
    assignUids();
  });
})();
`

export function injectInspector(html: string): string {
  const script = `<script>\n${INSPECTOR_JS}\n</script>`
  if (html.includes('</body>')) return html.replace('</body>', script + '</body>')
  if (html.includes('</html>')) return html.replace('</html>', script + '</html>')
  return html + script
}

export function assemblePreviewHtml(files: GeneratedFile[]): string | null {
  if (!files.length) return null

  const cat = categorize(files)

  // Priority 1: If there's an HTML file, use it directly
  // But inject CSS files if they exist
  if (cat.html.length > 0) {
    const htmlFile = cat.html[0]
    if (!htmlFile) return null
    let html = htmlFile.content

    // Inject any separate CSS files
    if (cat.css.length > 0) {
      const cssContent = cat.css.map(f => f.content).join('\n')
      if (html.includes('</head>')) {
        html = html.replace('</head>', `<style>${cssContent}</style></head>`)
      } else {
        html = `<style>${cssContent}</style>${html}`
      }
    }

    return html
  }

  // Priority 2: React/TSX/JSX files → full React preview with Babel
  if (cat.react.length > 0) {
    return buildReactPreview(cat)
  }

  // Priority 3: Plain JS/TS + CSS
  if (cat.script.length > 0 || cat.css.length > 0) {
    return buildPlainPreview(cat)
  }

  return null
}

// =====================================================
// REAL-PROJECT PREVIEW
// Takes a fully-resolved dependency map (path → content)
// from the dependency resolver and builds a self-contained
// preview. Local imports are inlined. External npm imports
// are mapped to CDN globals — NOT stripped.
// =====================================================

import type { ResolvedFiles } from './dependency-resolver'

// ── CDN globals: npm package → window variable name ──────────────────────
const NPM_GLOBALS: Record<string, string> = {
  'react': 'React',
  'react-dom': 'ReactDOM',
  'react-dom/client': 'ReactDOM',
  'next/navigation': '__NextNav',
  'next/link': '__NextLink',
  'next/image': '__NextImage',
  'next/router': '__NextRouter',
  '@stripe/stripe-js': '__StripeJs',
  '@stripe/react-stripe-js': '__StripeReact',
  'lucide-react': '__Lucide',
  'framer-motion': '__FramerMotion',
  'react-hook-form': '__ReactHookForm',
  'zod': '__Zod',
  'clsx': '__clsx',
  'class-variance-authority': '__cva',
  'tailwind-merge': '__twMerge',
}

// ── CDN scripts to load ───────────────────────────────────────────────────
const CDN_SCRIPTS = `
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js" crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js" crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.24.4/babel.min.js" crossorigin="anonymous"></script>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.1/dist/tailwind.min.css" rel="stylesheet" crossorigin="anonymous">`

// ── Runtime shims injected as a <script> before Babel modules ─────────────
// These are window globals that Babel's module system will resolve
const RUNTIME_SHIMS = `
<script>
// Next.js shims
window.__NextNav = {
  useRouter: () => ({ push: ()=>{}, back: ()=>{}, replace: ()=>{}, prefetch: ()=>{}, pathname: '/', query: {} }),
  usePathname: () => '/',
  useSearchParams: () => ({ get: ()=>null, getAll: ()=>[] }),
  useParams: () => ({}),
  redirect: ()=>{},
  notFound: ()=>{},
};
window.__NextLink = { default: ({href,children,...p})=>React.createElement('a',{href:href||'#',...p},children) };
window.__NextImage = { default: ({src,alt,...p})=>React.createElement('img',{src,alt,...p}) };
window.__NextRouter = window.__NextNav;

// Stripe shims
window.__StripeJs = { loadStripe: ()=>Promise.resolve(null) };
window.__StripeReact = {
  Elements: ({children})=>React.createElement(React.Fragment,null,children),
  useStripe: ()=>null,
  useElements: ()=>null,
  PaymentElement: ()=>React.createElement('div',{style:{padding:'16px',border:'1px dashed #555',borderRadius:'8px',color:'#888',fontSize:'12px',textAlign:'center'}},'[Stripe PaymentElement]'),
  ExpressCheckoutElement: ()=>React.createElement('div',{style:{padding:'16px',border:'1px dashed #555',borderRadius:'8px',color:'#888',fontSize:'12px',textAlign:'center'}},'[Stripe ExpressCheckout]'),
  CardElement: ()=>React.createElement('div',{style:{padding:'12px',border:'1px dashed #555',borderRadius:'6px',color:'#888',fontSize:'11px'}},'[CardElement]'),
};

// Lucide shims — proxy that returns a simple SVG icon for any name
window.__Lucide = new Proxy({}, {
  get: (_, name) => {
    return function LucideIcon({ size=16, color='currentColor', className='', strokeWidth=2, ...p }) {
      return React.createElement('svg',{
        xmlns:'http://www.w3.org/2000/svg',width:size,height:size,viewBox:'0 0 24 24',
        fill:'none',stroke:color,strokeWidth,strokeLinecap:'round',strokeLinejoin:'round',
        className, ...p,
        style:{display:'inline-block',verticalAlign:'middle',...p.style}
      },React.createElement('circle',{cx:12,cy:12,r:10}));
    }
  }
});

// clsx / tailwind-merge shims
window.__clsx = { default: (...args) => args.flat().filter(Boolean).join(' ') };
window.__twMerge = { default: (...args) => args.flat().filter(Boolean).join(' '), twMerge: (...args) => args.flat().filter(Boolean).join(' ') };
window.__cva = { cva: ()=>()=>'', cx: (...a)=>a.join(' ') };

// Framer Motion shims
window.__FramerMotion = {
  motion: new Proxy({}, { get:(_, tag)=>React.forwardRef((p,r)=>React.createElement(tag,{...p,ref:r})) }),
  AnimatePresence: ({children})=>children,
  useAnimation: ()=>({ start:()=>{}, stop:()=>{} }),
  useMotionValue: (v)=>({ get:()=>v, set:()=>{} }),
};

// zod shim
window.__Zod = {
  z: { object:()=>({parse:()=>({}),safeParse:()=>({success:true,data:{}})}), string:()=>({min:()=>({}),email:()=>({}),optional:()=>({})}), number:()=>({min:()=>({})}), boolean:()=>({}), array:()=>({}) }
};
</script>`

// ── Replace import statements with CDN global destructures ────────────────
function replaceImportsWithGlobals(source: string): string {
  return source.replace(
    /^import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm,
    (match, specifiers, pkg) => {
      // Skip local imports — those are inlined separately
      if (pkg.startsWith('./') || pkg.startsWith('../') || pkg.startsWith('@/')) {
        return '' // local imports get inlined — remove the import statement
      }

      // Find the global for this package
      // Try exact, then prefix match (e.g. 'lucide-react' matches '@lucide-react/*')
      const globalName = NPM_GLOBALS[pkg] || NPM_GLOBALS[pkg.split('/')[0]]
      if (!globalName) {
        // Unknown external — just remove and hope the code doesn't use it critically
        return `/* external: ${pkg} (not shimmed) */`
      }

      // Parse import specifiers into destructuring
      const trimmed = specifiers.trim()

      // import DefaultExport from 'pkg'
      if (/^\w+$/.test(trimmed)) {
        return `const ${trimmed} = (window.${globalName}?.default || window.${globalName});`
      }

      // import { a, b, c } from 'pkg'
      if (trimmed.startsWith('{')) {
        const names = trimmed.replace(/[{}]/g, '').split(',').map((s: string) => {
          const [orig, alias] = s.trim().split(/\s+as\s+/)
          return alias ? `${alias}: _${alias}` : orig?.trim()
        }).filter(Boolean)
        return `const {${names.join(', ')}} = window.${globalName} || {};`
      }

      // import Default, { named } from 'pkg'
      const mixedMatch = trimmed.match(/^(\w+)\s*,\s*(\{[\s\S]+\})$/)
      if (mixedMatch) {
        const [, def, named] = mixedMatch
        const names = named.replace(/[{}]/g, '').split(',').map((s: string) => s.trim()).filter(Boolean)
        return [
          `const ${def} = window.${globalName}?.default || window.${globalName};`,
          `const {${names.join(', ')}} = window.${globalName} || {};`,
        ].join('\n')
      }

      // import * as X from 'pkg'
      const nsMatch = trimmed.match(/^\*\s+as\s+(\w+)$/)
      if (nsMatch) {
        return `const ${nsMatch[1]} = window.${globalName} || {};`
      }

      return `/* unhandled import: ${pkg} */`
    }
  )
}

// ── Strip TypeScript-only syntax (keep JSX intact) ───────────────────────
function stripTypeScript(code: string): string {
  return code
    // "use client" / "use server" directives
    .replace(/^["']use (?:client|server)["'];?\s*$/gm, '')
    // interface declarations
    .replace(/^(?:export\s+)?interface\s+\w[\s\S]*?^}/gm, '')
    // type aliases
    .replace(/^(?:export\s+)?type\s+\w+\s*=[\s\S]*?;/gm, '')
    // : Type annotations on params/vars (conservative)
    .replace(/:\s*(?:string|number|boolean|void|never|null|undefined|any|unknown|ReactNode|React\.FC|React\.\w+(?:<[^>]+>)?|JSX\.Element|Record<[^,>]+,[^>]+>|Array<[^>]+>|\w+(?:<[^>]*>)?(?:\[\])?)(?=\s*[,)=;{])/g, '')
    // as Type casts
    .replace(/\s+as\s+(?:\w+(?:<[^>]*>)?(?:\[\])?|\{[^}]*\})/g, '')
    // Generic type params on functions
    .replace(/((?:function\s+\w+|\bconst\s+\w+\s*=\s*(?:async\s+)?(?:function)?)\s*)<[^>]+>(\s*\()/g, '$1$2')
    // export default
    .replace(/^export\s+default\s+/gm, '')
    // export { }
    .replace(/^export\s+\{[^}]*\}\s*;?\s*$/gm, '')
    // export const/function/class
    .replace(/^export\s+(?=(?:const|let|var|function|class|async)\s)/gm, '')
}

// ── Build entry component name from path ──────────────────────────────────
function getComponentName(path: string): string {
  const base = path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || 'App'
  // PascalCase the filename
  return base.charAt(0).toUpperCase() + base.slice(1)
}

// ── Main: build self-contained preview from resolved files ────────────────
export function assembleFromResolved(
  rootPath: string,
  resolvedFiles: ResolvedFiles,
  cssFiles: Array<{ path: string; content: string }> = []
): string {
  // Process each file: replace imports with globals, strip TS types
  const processedModules = Object.entries(resolvedFiles).map(([path, content]) => {
    let code = content
    code = replaceImportsWithGlobals(code)
    code = stripTypeScript(code)
    return `\n// ═══ ${path} ═══\n${code}`
  }).join('\n\n')

  const rootBase = rootPath.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || 'App'
  const entryName = rootBase.charAt(0).toUpperCase() + rootBase.slice(1)

  // Find actual exported component name from root file
  const rootContent = resolvedFiles[rootPath] || ''
  const exportMatch = rootContent.match(/export\s+default\s+(?:function\s+)?(\w+)/)
  const componentName = exportMatch?.[1] || entryName

  const cssContent = cssFiles.map(f => f.content).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">
${CDN_SCRIPTS}
${RUNTIME_SHIMS}
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}
${cssContent}
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react,typescript">
const { useState, useEffect, useRef, useCallback, useMemo, useContext,
        createContext, forwardRef, Fragment, memo,
        useReducer, useLayoutEffect, useId } = React;

${processedModules}

// ── Mount ──
try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(${componentName}));
} catch(e) {
  document.getElementById('root').innerHTML =
    '<div style="padding:24px;font-family:monospace;color:#f87171"><b>Mount Error</b><pre style="margin-top:8px;font-size:11px;white-space:pre-wrap">' + e.message + '</pre></div>';
}
</script>
<script>
function showError(msg, line) {
  var el = document.getElementById('root');
  var display = (msg && msg !== 'Script error.' && msg !== 'Script error') ? msg : 'A script error occurred. Check that your component has no syntax errors.';
  if (el && !el.hasChildNodes()) {
    el.innerHTML = '<div style="padding:24px;font-family:monospace"><div style="color:#f87171;font-weight:700;margin-bottom:8px">Runtime Error</div><pre style="color:#fbbf24;font-size:11px;white-space:pre-wrap;word-break:break-word">' + display + '</pre>' + (line ? '<div style="color:#71717a;font-size:10px;margin-top:8px">Line ' + line + '</div>' : '') + '</div>';
  }
  window.parent.postMessage({ type: 'wp-iframe-error', message: display }, '*');
}
window.onerror = function(msg, src, line, col, err) {
  var detail = (err && err.message) ? err.message : String(msg);
  showError(detail, line);
  return true;
};
window.addEventListener('unhandledrejection', function(e) {
  var msg = e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled promise rejection';
  showError(msg, null);
});
</script>
</body>
</html>`
}
