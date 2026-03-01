'use client'
import { useState, useEffect, useCallback } from 'react'

/**
 * SMART SUGGESTIONS
 * 
 * AI-powered prompt enhancement and suggestions
 * 
 * Features:
 * - Auto-complete prompts as user types
 * - Suggest improvements to vague prompts
 * - Template suggestions based on context
 * - History-based personalization
 * - Tech stack recommendations
 */

// ============================================
// TYPES
// ============================================

export interface Suggestion {
  id: string
  type: 'completion' | 'improvement' | 'template' | 'example'
  text: string
  description?: string
  confidence: number
  tags?: string[]
}

export interface PromptEnhancement {
  original: string
  enhanced: string
  improvements: string[]
  suggestions: string[]
}

// ============================================
// PROMPT TEMPLATES
// ============================================

export const PROMPT_TEMPLATES = {
  landing: {
    basic: 'Create a landing page for {product}',
    detailed: 'Create a modern landing page for {product} with hero section, features grid, testimonials, pricing table, and call-to-action. Use {stack} with responsive design.',
    examples: [
      'SaaS product', 'fitness app', 'restaurant', 'portfolio', 'event', 'newsletter'
    ]
  },
  api: {
    basic: 'Build an API for {purpose}',
    detailed: 'Build a REST API for {purpose} with authentication, CRUD operations, input validation, error handling, and rate limiting. Use {stack} with PostgreSQL.',
    examples: [
      'user management', 'blog posts', 'e-commerce', 'booking system', 'task management'
    ]
  },
  dashboard: {
    basic: 'Create a dashboard for {purpose}',
    detailed: 'Create an admin dashboard for {purpose} with sidebar navigation, charts, data tables, user management, and real-time metrics. Use {stack}.',
    examples: [
      'analytics', 'inventory', 'CRM', 'project management', 'finance'
    ]
  },
  app: {
    basic: 'Build a {type} app',
    detailed: 'Build a full-stack {type} app with user authentication, database, API endpoints, and modern React UI. Include error handling and loading states.',
    examples: [
      'todo', 'chat', 'social media', 'marketplace', 'booking', 'learning platform'
    ]
  }
}

// ============================================
// TECH STACK SUGGESTIONS
// ============================================

export const TECH_STACKS = {
  frontend: {
    modern: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
    simple: ['HTML', 'CSS', 'JavaScript'],
    vue: ['Vue 3', 'Nuxt', 'TypeScript', 'Tailwind CSS']
  },
  backend: {
    node: ['Node.js', 'Express', 'TypeScript', 'PostgreSQL'],
    python: ['Python', 'FastAPI', 'PostgreSQL'],
    serverless: ['Next.js API Routes', 'Supabase', 'Vercel']
  },
  fullstack: {
    nextjs: ['Next.js 14', 'TypeScript', 'Supabase', 'Tailwind CSS'],
    mern: ['React', 'Node.js', 'Express', 'MongoDB'],
    t3: ['Next.js', 'tRPC', 'Prisma', 'TypeScript']
  }
}

// ============================================
// PROMPT IMPROVEMENT PATTERNS
// ============================================

const IMPROVEMENT_PATTERNS = [
  {
    pattern: /^make\s+(?:me\s+)?(?:a|an)\s+(.+)$/i,
    improvement: (match: RegExpMatchArray) => 
      `Create a ${match[1]} with modern design, responsive layout, and best practices`,
    reason: 'Added specificity for better results'
  },
  {
    pattern: /^(?:build|create)\s+(?:a|an)?\s*(.+)$/i,
    hasNoStack: true,
    improvement: (match: RegExpMatchArray) =>
      `${match[0]} using React and TypeScript with proper error handling and loading states`,
    reason: 'Added tech stack and robustness requirements'
  },
  {
    pattern: /website/i,
    hasVague: true,
    suggestions: [
      'What type of website? (landing page, blog, portfolio, e-commerce)',
      'Who is the target audience?',
      'Any specific features needed?'
    ]
  },
  {
    pattern: /app/i,
    hasVague: true,
    suggestions: [
      'What will users do in this app?',
      'Should it have user accounts?',
      'Web app or mobile-first?'
    ]
  }
]

// ============================================
// SMART SUGGESTIONS HOOK
// ============================================

export function useSmartSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Generate suggestions based on input
  const generateSuggestions = useCallback(async (input: string): Promise<Suggestion[]> => {
    if (!input || input.length < 3) return []

    const results: Suggestion[] = []
    const inputLower = input.toLowerCase()

    // 1. Template completions
    for (const [type, templates] of Object.entries(PROMPT_TEMPLATES)) {
      if (inputLower.includes(type) || templates.examples.some(ex => inputLower.includes(ex))) {
        results.push({
          id: `template-${type}`,
          type: 'template',
          text: templates.detailed.replace('{product}', '...').replace('{purpose}', '...').replace('{type}', '...').replace('{stack}', 'React + TypeScript'),
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} template`,
          confidence: 0.8,
          tags: [type]
        })
      }
    }

    // 2. Auto-completions based on common patterns
    const completions = getAutoCompletions(input)
    results.push(...completions)

    // 3. Improvement suggestions
    const improvements = getImprovements(input)
    results.push(...improvements)

    return results.slice(0, 5) // Max 5 suggestions
  }, [])

  // Enhance a prompt
  const enhancePrompt = useCallback((input: string): PromptEnhancement => {
    const improvements: string[] = []
    const suggestions: string[] = []
    let enhanced = input

    // Apply improvement patterns
    for (const pattern of IMPROVEMENT_PATTERNS) {
      const match = input.match(pattern.pattern)
      if (match) {
        if (pattern.improvement) {
          enhanced = pattern.improvement(match)
          improvements.push(pattern.reason || 'Enhanced prompt')
        }
        if (pattern.suggestions) {
          suggestions.push(...pattern.suggestions)
        }
      }
    }

    // Add tech stack if missing
    if (!enhanced.match(/react|vue|angular|next|node|python|typescript/i)) {
      enhanced += ' using React and TypeScript'
      improvements.push('Added modern tech stack')
    }

    // Add responsive design if website/page
    if (enhanced.match(/website|page|landing/i) && !enhanced.match(/responsive/i)) {
      enhanced += ' with responsive design'
      improvements.push('Added responsive requirement')
    }

    // Add error handling if app
    if (enhanced.match(/app|application/i) && !enhanced.match(/error|loading/i)) {
      enhanced += ' with proper error handling and loading states'
      improvements.push('Added robustness requirements')
    }

    return {
      original: input,
      enhanced,
      improvements,
      suggestions
    }
  }, [])

  return {
    suggestions,
    isLoading,
    generateSuggestions,
    enhancePrompt
  }
}

// ============================================
// AUTO-COMPLETIONS
// ============================================

function getAutoCompletions(input: string): Suggestion[] {
  const completions: Suggestion[] = []
  const inputLower = input.toLowerCase()

  // Common completions
  const patterns = [
    { trigger: 'create a', completions: ['landing page', 'dashboard', 'todo app', 'API', 'blog'] },
    { trigger: 'build a', completions: ['REST API', 'chat app', 'e-commerce site', 'portfolio'] },
    { trigger: 'make a', completions: ['website', 'web app', 'mobile app', 'admin panel'] },
    { trigger: 'add', completions: ['authentication', 'dark mode', 'search functionality', 'pagination'] },
    { trigger: 'implement', completions: ['user registration', 'payment system', 'file upload', 'notifications'] }
  ]

  for (const { trigger, completions: options } of patterns) {
    if (inputLower.endsWith(trigger) || inputLower.endsWith(trigger + ' ')) {
      for (const option of options) {
        completions.push({
          id: `complete-${trigger}-${option}`,
          type: 'completion',
          text: `${input.trim()} ${option}`,
          confidence: 0.7
        })
      }
    }
  }

  return completions
}

// ============================================
// IMPROVEMENTS
// ============================================

function getImprovements(input: string): Suggestion[] {
  const improvements: Suggestion[] = []

  // Short/vague prompts
  if (input.length < 20) {
    improvements.push({
      id: 'improve-detail',
      type: 'improvement',
      text: 'Tip: Add more detail for better results',
      description: 'Include tech stack, features, and design preferences',
      confidence: 0.9
    })
  }

  // No tech stack mentioned
  if (!input.match(/react|vue|next|node|python|typescript/i)) {
    improvements.push({
      id: 'improve-stack',
      type: 'improvement',
      text: 'Try: "...using React and TypeScript"',
      description: 'Specifying a tech stack improves output quality',
      confidence: 0.8
    })
  }

  return improvements
}

// ============================================
// SUGGESTIONS DROPDOWN COMPONENT
// ============================================

interface SuggestionsDropdownProps {
  suggestions: Suggestion[]
  onSelect: (suggestion: Suggestion) => void
  visible: boolean
}

export function SuggestionsDropdown({ suggestions, onSelect, visible }: SuggestionsDropdownProps) {
  if (!visible || suggestions.length === 0) return null

  return (
    <div className="suggestions-dropdown">
      {suggestions.map((suggestion, i) => (
        <div
          key={suggestion.id}
          className={`suggestion-item ${suggestion.type}`}
          onClick={() => onSelect(suggestion)}
        >
          <div className="suggestion-icon">
            {suggestion.type === 'completion' ? '→' :
             suggestion.type === 'improvement' ? '' :
             suggestion.type === 'template' ? '' : ''}
          </div>
          <div className="suggestion-content">
            <div className="suggestion-text">{suggestion.text}</div>
            {suggestion.description && (
              <div className="suggestion-desc">{suggestion.description}</div>
            )}
          </div>
          {suggestion.tags && (
            <div className="suggestion-tags">
              {suggestion.tags.map(tag => (
                <span key={tag} className="suggestion-tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
      ))}

      <style jsx>{`
        .suggestions-dropdown {
          position: absolute;
          bottom: 100%;
          left: 0;
          right: 0;
          margin-bottom: 8px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.2s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .suggestion-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.1s;
        }

        .suggestion-item:hover {
          background: var(--bg-tertiary);
        }

        .suggestion-item.improvement {
          background: rgba(255, 200, 0, 0.05);
        }

        .suggestion-icon {
          font-size: 16px;
          width: 24px;
          text-align: center;
        }

        .suggestion-content {
          flex: 1;
          min-width: 0;
        }

        .suggestion-text {
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .suggestion-desc {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .suggestion-tags {
          display: flex;
          gap: 4px;
        }

        .suggestion-tag {
          padding: 2px 6px;
          background: var(--bg-tertiary);
          border-radius: 4px;
          font-size: 10px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}

// ============================================
// PROMPT ENHANCEMENT PREVIEW
// ============================================

interface EnhancementPreviewProps {
  enhancement: PromptEnhancement
  onAccept: (enhanced: string) => void
  onDismiss: () => void
}

export function EnhancementPreview({ enhancement, onAccept, onDismiss }: EnhancementPreviewProps) {
  if (enhancement.original === enhancement.enhanced) return null

  return (
    <div className="enhancement-preview">
      <div className="enhancement-header">
        <span className="enhancement-icon"></span>
        <span className="enhancement-title">Improved prompt</span>
        <button className="enhancement-dismiss" onClick={onDismiss}>×</button>
      </div>
      <div className="enhancement-content">
        <div className="enhancement-text">{enhancement.enhanced}</div>
        <div className="enhancement-improvements">
          {enhancement.improvements.map((imp, i) => (
            <span key={i} className="enhancement-badge">✓ {imp}</span>
          ))}
        </div>
      </div>
      <div className="enhancement-actions">
        <button className="enhancement-btn secondary" onClick={onDismiss}>
          Keep original
        </button>
        <button className="enhancement-btn primary" onClick={() => onAccept(enhancement.enhanced)}>
          Use improved
        </button>
      </div>

      <style jsx>{`
        .enhancement-preview {
          background: var(--bg-secondary);
          border: 1px solid var(--accent-primary);
          border-radius: var(--radius-lg);
          margin-bottom: 12px;
          overflow: hidden;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .enhancement-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(16, 185, 129, 0.1);
          border-bottom: 1px solid var(--border-subtle);
        }

        .enhancement-icon {
          font-size: 16px;
        }

        .enhancement-title {
          flex: 1;
          font-weight: 600;
          font-size: 13px;
        }

        .enhancement-dismiss {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 18px;
        }

        .enhancement-content {
          padding: 16px;
        }

        .enhancement-text {
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .enhancement-improvements {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .enhancement-badge {
          padding: 4px 8px;
          background: var(--bg-tertiary);
          border-radius: 4px;
          font-size: 11px;
          color: var(--accent-primary);
        }

        .enhancement-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid var(--border-subtle);
        }

        .enhancement-btn {
          padding: 8px 16px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 150ms ease, transform 150ms ease;
        }

        .enhancement-btn.primary {
          background: var(--accent-primary);
          color: var(--bg-primary);
          border: none;
        }

        .enhancement-btn.secondary {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
        }
      `}</style>
    </div>
  )
}
