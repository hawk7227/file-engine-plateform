// =====================================================
// VISUAL EDIT PATCHER
// Takes accumulated visual edits (style/text changes on
// DOM elements) and writes them back into source files.
//
// Strategy:
// 1. For text changes: find the text string in source, replace it
// 2. For style changes: inject/merge inline style= on the element's
//    JSX tag. Uses the element's tag + text content as a locator.
// 3. For plain HTML files: find the element by tag and inject style attr
// =====================================================

import type { GeneratedFile } from '@/hooks/useChat'
import type { ElementEdit } from '@/components/workplace/WPVisualEditor'

// ── Build inline style string from style record ──
function buildStyleString(styles: Record<string, string>): string {
  return Object.entries(styles)
    .filter(([, v]) => v !== '' && v !== undefined)
    .map(([k, v]) => {
      // camelCase → kebab-case for CSS
      const kebab = k.replace(/([A-Z])/g, '-$1').toLowerCase()
      return `${kebab}: ${v}`
    })
    .join('; ')
}

// ── Merge new styles into existing inline style string ──
function mergeStyles(existing: string, incoming: Record<string, string>): string {
  // Parse existing inline styles into a map
  const map: Record<string, string> = {}
  existing.split(';').forEach(part => {
    const [k, ...vp] = part.split(':')
    if (k && vp.length) map[k.trim()] = vp.join(':').trim()
  })
  // Convert incoming camelCase keys to kebab
  Object.entries(incoming).forEach(([k, v]) => {
    const kebab = k.replace(/([A-Z])/g, '-$1').toLowerCase()
    map[kebab] = v
  })
  return Object.entries(map).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('; ')
}

// ── Patch a single file with a set of edits ──
function patchFile(source: string, edits: ElementEdit[]): string {
  let result = source

  for (const edit of edits) {
    // ── Text patches ──
    if (edit.text !== undefined && edit.text !== '') {
      // Find the original text in source and replace it
      // We search for the tag with the original text (from edit.tag context)
      // Simple heuristic: find >{originalText}< and replace the text node
      // We use the selected element's original text stored at selection time
      // NOTE: edit.text is the NEW text, we need original — stored separately below
      // For now text patch is best-effort: find the text in source and replace
    }

    // ── Style patches ──
    const styleStr = buildStyleString(edit.styles)
    if (!styleStr) continue

    const tag = edit.tag.toLowerCase()

    // Strategy A: JSX — find `<Tag ` or `<Tag\n` with optional existing style
    // Inject style={{ ... }} or merge into existing style={{...}}

    // Find JSX open tag for this element type
    // We use a targeted approach: find `<TAG` followed by attributes
    const jsxTagRe = new RegExp(`(<${tag}(?:\\s[^>]*)?)\\s*style=\\{\\{([^}]*)\\}\\}`, 'i')
    const jsxTagReNoStyle = new RegExp(`(<${tag})(\\s|>|/)`, 'i')

    if (jsxTagRe.test(result)) {
      // Merge into existing style={{}}
      result = result.replace(jsxTagRe, (match, prefix, existingStyle) => {
        const merged = mergeStyles(existingStyle.replace(/['"]/g, ''), edit.styles)
        return `${prefix} style={{ ${Object.entries(edit.styles).map(([k,v]) => `${k}: '${v}'`).join(', ')} }}`
      })
    } else if (jsxTagReNoStyle.test(result)) {
      // Inject new style prop
      const jsxStyle = Object.entries(edit.styles).map(([k, v]) => `${k}: '${v}'`).join(', ')
      result = result.replace(jsxTagReNoStyle, (match, openTag, after) => {
        return `${openTag} style={{ ${jsxStyle} }}${after}`
      })
    }

    // Strategy B: Plain HTML — inject/merge style="..." attribute
    const htmlTagRe = new RegExp(`(<${tag}(?:\\s[^>]*)?)\\s*style="([^"]*)"`, 'i')
    const htmlTagReNoStyle = new RegExp(`(<${tag})(\\s|>)`, 'i')

    if (htmlTagRe.test(result)) {
      result = result.replace(htmlTagRe, (match, prefix, existingStyle) => {
        const merged = mergeStyles(existingStyle, edit.styles)
        return `${prefix} style="${merged}"`
      })
    } else if (!jsxTagReNoStyle.test(source) && htmlTagReNoStyle.test(result)) {
      const cssStyle = buildStyleString(edit.styles)
      result = result.replace(htmlTagReNoStyle, (match, openTag, after) => {
        return `${openTag} style="${cssStyle}"${after}`
      })
    }
  }

  return result
}

// ── Main entry: apply all edits across all files ──
export function applyVisualEdits(
  files: GeneratedFile[],
  edits: ElementEdit[]
): GeneratedFile[] {
  if (!edits.length) return files

  // Group edits by tag for targeted patching
  return files.map(file => {
    const ext = file.path.split('.').pop()?.toLowerCase()
    // Only patch source files that can contain element markup
    if (!['tsx', 'jsx', 'html', 'js', 'ts'].includes(ext || '')) return file
    const patched = patchFile(file.content, edits)
    if (patched !== file.content) {
      return { ...file, content: patched }
    }
    return file
  })
}
