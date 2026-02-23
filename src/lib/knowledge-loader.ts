// =====================================================
// FILE ENGINE - KNOWLEDGE BASE LOADER
// Injects Claude's complete knowledge into AI context
// Based on intent and message content
// =====================================================

import { MessageIntent } from './smart-context'

// Import knowledge base files
import cognitivePatterns from './knowledge/cognitive-patterns.json'
import designPhilosophy from './knowledge/design-philosophy.json'
import jsTs from './knowledge/javascript-typescript.json'
import cssMastery from './knowledge/css-mastery.json'
import debuggingRecovery from './knowledge/debugging-error-recovery.json'
import techKnowledge from './knowledge/technology-knowledge.json'
import reasoningPatterns from './knowledge/reasoning-patterns.json'

// =====================================================
// INTENT → KNOWLEDGE MAPPING
// Only inject what's relevant — don't waste tokens
// =====================================================

interface KnowledgeSection {
  source: string
  key: string
  data: any
}

function getDesignKnowledge(): string {
  const dp = designPhilosophy as any
  const typo = dp.typography
  const pairings = typo.pairings.slice(0, 5).map((p: any) => `${p.display} + ${p.body} (${p.mood})`).join('; ')
  const fonts = Object.values(typo.display_fonts as Record<string, string[]>).flat().slice(0, 15).join(', ')
  
  return `DESIGN KNOWLEDGE:
Aesthetic directions: ${Object.keys(dp.design_thinking_process.step_2_aesthetic_direction.directions).join(', ')}
Anti-patterns to AVOID: ${dp.core_philosophy.anti_patterns.slice(0, 5).join('; ')}
Font options: ${fonts}
Font pairings: ${pairings}
Loading: ${typo.loading_pattern}
Color vars: ${dp.color.system.css_variables}
Dark bg: ${dp.color.dark_themes.backgrounds.standard}, surfaces: ${dp.color.dark_themes.surfaces.medium}
Light bg: ${dp.color.light_themes.backgrounds.warm}, text: ${dp.color.light_themes.text.primary}
Spacing scale: ${dp.spacing.scale_px.join(', ')}px
Glass morphism: ${dp.glass_morphism.recipe}
Animation easing: default=${dp.animation.easing.default}, bounce=${dp.animation.easing.bounce}
Icons: ${dp.icons.font_awesome_6.cdn}`
}

function getDebuggingKnowledge(): string {
  const db = debuggingRecovery as any
  const steps = Object.entries(db.methodology.steps).map(([k, v]: [string, any]) => `${k}: ${v.description}`).join('\n')
  
  const platformErrors = Object.entries(db.error_patterns.platform_specific)
    .map(([k, v]: [string, any]) => `- ${v.symptom}: ${v.root_cause} FIX: ${v.fix}`)
    .join('\n')
  
  return `DEBUGGING METHODOLOGY:
${steps}

PLATFORM ERROR PATTERNS:
${platformErrors}

ERROR RECOVERY: ${db.error_recovery_patterns.user_communication.loading} | ${db.error_recovery_patterns.user_communication.error}`
}

function getCognitiveKnowledge(): string {
  const cp = cognitivePatterns as any
  const planning = cp.planning_before_coding.checklist.join('; ')
  const verification = cp.verification_after_coding.html_checklist.join('; ')
  const tokenRules = cp.token_budget_awareness.rules.join('; ')
  
  return `COGNITIVE PATTERNS:
Planning checklist: ${planning}
HTML verification: ${verification}
Token strategy: ${tokenRules}`
}

function getJsTsKnowledge(message: string): string {
  const js = jsTs as any
  const sections: string[] = []
  
  // Always include core patterns
  sections.push(`Operators: optional chaining (x?.y), nullish coalescing (x ?? default), spread ({...obj}), destructuring`)
  
  // Async if relevant
  if (message.match(/async|await|fetch|api|promise/i)) {
    sections.push(`Async: ${js.async_patterns.basic_async_await.rules.join('; ')}`)
    sections.push(`Debounce: ${js.async_patterns.debounce}`)
  }
  
  // DOM if relevant (HTML generation)
  if (message.match(/html|page|landing|click|event|dom/i)) {
    sections.push(`DOM events: addEventListener (not onclick attr), event delegation on parent, e.preventDefault for forms`)
    sections.push(`DOM safety: NEVER innerHTML with user input — use textContent`)
  }
  
  // TypeScript if relevant
  if (message.match(/typescript|type|interface|generic/i)) {
    const types = Object.entries(js.typescript.utility_types).map(([k, v]) => `${k}: ${v}`).join('; ')
    sections.push(`TS utility types: ${types}`)
  }
  
  return `JS/TS KNOWLEDGE:\n${sections.join('\n')}`
}

function getCssKnowledge(message: string): string {
  const css = cssMastery as any
  const sections: string[] = []
  
  sections.push(`Layout: Grid auto-fill: ${css.layout.grid.auto_responsive}`)
  sections.push(`Centering: ${css.layout.grid.centering}`)
  sections.push(`Transitions: ${css.animations_css.transitions.rule}`)
  sections.push(`Performance: ${css.animations_css.transitions.performance}`)
  
  if (message.match(/responsive|mobile|breakpoint/i)) {
    sections.push(`Responsive: mobile-first, breakpoints at 768px/1024px/1440px`)
    sections.push(`Fluid type: ${css.typography_css.fluid}`)
    sections.push(`Dynamic viewport: min-height: 100dvh`)
  }
  
  if (message.match(/form|input|checkbox|select/i)) {
    sections.push(`Forms: ${css.forms.reset}`)
    sections.push(`Focus: ${css.forms.focus}`)
    sections.push(`Validation: ${css.forms.validation}`)
  }
  
  if (message.match(/animation|animate|motion|transition/i)) {
    const kf = Object.entries(css.animations_css.keyframes).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join('\n')
    sections.push(`Keyframes:\n${kf}`)
  }
  
  return `CSS KNOWLEDGE:\n${sections.join('\n')}`
}

function getReactKnowledge(): string {
  const tech = techKnowledge as any
  const hooks = tech.react_18.hooks
  
  const hookSummary = Object.entries(hooks).map(([name, data]: [string, any]) => {
    return `${name}: ${data.rules?.[0] || data.usage || ''}`
  }).join('\n')
  
  const antiPatterns = tech.react_18.anti_patterns.join('; ')
  
  return `REACT KNOWLEDGE:
${hookSummary}
Anti-patterns: ${antiPatterns}`
}

function getReasoningKnowledge(): string {
  const rp = reasoningPatterns as any
  return `REASONING MODELS:
Steel thread: ${rp.steel_thread.principle}
First principles: ${rp.first_principles.description}
Occam's razor: ${rp.occams_razor.description}
Inversion: ${rp.inversion.description}`
}

// =====================================================
// MAIN EXPORT — GET KNOWLEDGE FOR INTENT
// =====================================================

export function getKnowledgeForIntent(intent: MessageIntent, message: string): string {
  const parts: string[] = []
  
  switch (intent) {
    case 'generate_code':
      parts.push(getCognitiveKnowledge())
      parts.push(getDesignKnowledge())
      parts.push(getJsTsKnowledge(message))
      parts.push(getCssKnowledge(message))
      // Add React knowledge if React-related
      if (message.match(/react|component|next\.?js|tsx|jsx|hook|state/i)) {
        parts.push(getReactKnowledge())
      }
      break
      
    case 'fix_code':
      parts.push(getDebuggingKnowledge())
      parts.push(getJsTsKnowledge(message))
      if (message.match(/css|style|layout|responsive/i)) {
        parts.push(getCssKnowledge(message))
      }
      if (message.match(/react|component|hook|state|effect/i)) {
        parts.push(getReactKnowledge())
      }
      break
      
    case 'refactor':
      parts.push(getReasoningKnowledge())
      parts.push(getJsTsKnowledge(message))
      if (message.match(/react|component/i)) {
        parts.push(getReactKnowledge())
      }
      break
      
    case 'style_question':
      parts.push(getDesignKnowledge())
      parts.push(getCssKnowledge(message))
      break
      
    case 'explain':
      // Light touch — just reasoning patterns
      parts.push(getReasoningKnowledge())
      break
      
    case 'project_question':
      // No extra knowledge needed — project context comes from DB
      break
      
    case 'deploy_action':
    case 'general_chat':
      // No extra knowledge needed
      break
  }
  
  if (parts.length === 0) return ''
  
  return `\n<knowledge>\n${parts.join('\n\n')}\n</knowledge>`
}

// =====================================================
// EXPORT INDIVIDUAL LOADERS FOR TESTING
// =====================================================

export {
  getDesignKnowledge,
  getDebuggingKnowledge,
  getCognitiveKnowledge,
  getJsTsKnowledge,
  getCssKnowledge,
  getReactKnowledge,
  getReasoningKnowledge
}
