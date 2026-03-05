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
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.24.4/babel.min.js"><\/script>
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
window.onerror = function(msg, src, line, col, err) {
  var el = document.getElementById('root');
  if (el) {
    el.innerHTML = '<div style="padding:24px;font-family:monospace">'
      + '<div style="color:#f87171;font-size:14px;font-weight:700;margin-bottom:8px">Runtime Error</div>'
      + '<pre style="color:#fbbf24;font-size:11px;white-space:pre-wrap;word-break:break-word">' + String(msg) + '</pre>'
      + '<div style="color:#71717a;font-size:10px;margin-top:8px">Line ' + line + (col ? ':' + col : '') + '</div>'
      + '</div>';
  }
  window.parent.postMessage({ type: 'wp-iframe-error', message: String(msg) }, '*');
  return true;
};
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
