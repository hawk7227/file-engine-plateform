// =====================================================
// FILE ENGINE - SMART CHAT SYSTEM
// New Chat Notifications, Auto-Generated Prompts,
// Guardrails, and Context-Aware Templates
// =====================================================

// =====================================================
// TYPES
// =====================================================

import { BRAND_NAME, BRAND_AI_NAME } from '@/lib/brand'

export interface NewChatNotification {
  id: string
  type: 'welcome' | 'continue_project' | 'suggested_task' | 'daily_prompt' | 'trending'
  title: string
  description: string
  prompt: SmartPrompt
  priority: number
  expiresAt?: string
  dismissedAt?: string
  clickedAt?: string
  metadata?: Record<string, any>
}

export interface SmartPrompt {
  id: string
  name: string
  category: PromptCategory

  // The actual prompt content
  systemPrompt: string      // Hidden guardrails for AI
  userPrompt: string        // What user sees/sends

  // Context requirements
  requiredContext: ContextRequirement[]
  optionalContext: ContextRequirement[]

  // Guardrails
  guardrails: Guardrail[]

  // Variables that can be filled in
  variables: PromptVariable[]

  // Expected output
  expectedOutput: ExpectedOutput

  // Metadata
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: string
  successRate?: number
}

export type PromptCategory =
  | 'project_setup'
  | 'component_creation'
  | 'api_development'
  | 'bug_fixing'
  | 'refactoring'
  | 'testing'
  | 'deployment'
  | 'documentation'
  | 'performance'
  | 'security'
  | 'styling'
  | 'database'
  | 'authentication'
  | 'integration'

export interface ContextRequirement {
  type: 'project_memory' | 'file' | 'component' | 'style_guide' | 'decision' | 'custom'
  description: string
  autoLoad: boolean
  fallback?: string
}

export interface Guardrail {
  id: string
  name: string
  type: 'must_do' | 'must_not_do' | 'prefer' | 'avoid'
  rule: string
  severity: 'critical' | 'important' | 'suggested'
  autoEnforce: boolean
}

export interface PromptVariable {
  name: string
  placeholder: string
  type: 'text' | 'select' | 'file' | 'component' | 'auto'
  required: boolean
  options?: string[]
  defaultValue?: string
  autoFillFrom?: string // e.g., 'project_memory.registry.components'
}

export interface ExpectedOutput {
  type: 'code' | 'explanation' | 'plan' | 'mixed'
  files?: { path: string; description: string }[]
  validation?: string[]
  followUp?: string[]
}

export interface PromptTemplate {
  id: string
  name: string
  icon: string
  color: string
  description: string
  prompts: SmartPrompt[]
  popularity: number
  lastUsed?: string
}

// =====================================================
// GUARDRAIL DEFINITIONS
// =====================================================

export const UNIVERSAL_GUARDRAILS: Guardrail[] = [
  {
    id: 'g_minimal_changes',
    name: 'Minimal Changes',
    type: 'must_do',
    rule: 'Make only the changes requested. Do not refactor, rename, or modify unrelated code.',
    severity: 'critical',
    autoEnforce: true
  },
  {
    id: 'g_preserve_comments',
    name: 'Preserve Comments',
    type: 'must_not_do',
    rule: 'Never remove existing comments, console.logs, or debugging code unless explicitly asked.',
    severity: 'critical',
    autoEnforce: true
  },
  {
    id: 'g_verify_before_done',
    name: 'Verify Before Done',
    type: 'must_do',
    rule: 'Re-read the file after changes. Verify imports, handlers, data flow, and error states before saying done.',
    severity: 'critical',
    autoEnforce: true
  },
  {
    id: 'g_error_handling',
    name: 'Error Handling',
    type: 'must_do',
    rule: 'Every async operation needs: loading state, error state with UI, success state, empty state.',
    severity: 'critical',
    autoEnforce: true
  },
  {
    id: 'g_type_safety',
    name: 'Type Safety',
    type: 'must_do',
    rule: 'Interface/type fields must match API/DB exactly. Use optional chaining for nullable values.',
    severity: 'important',
    autoEnforce: true
  },
  {
    id: 'g_ask_first',
    name: 'Ask First',
    type: 'must_do',
    rule: 'If you think something else should change beyond the request, ASK FIRST and wait for approval.',
    severity: 'important',
    autoEnforce: true
  },
  {
    id: 'g_syntax_check',
    name: 'Syntax Check',
    type: 'must_do',
    rule: 'Check: balanced brackets/braces/parens, closed strings, closed JSX tags, complete ternaries.',
    severity: 'critical',
    autoEnforce: true
  },
  {
    id: 'g_no_empty_catch',
    name: 'No Empty Catch',
    type: 'must_not_do',
    rule: 'Never create empty catch blocks. Always handle or log errors.',
    severity: 'important',
    autoEnforce: true
  }
]

export const NEXTJS_GUARDRAILS: Guardrail[] = [
  {
    id: 'g_use_client',
    name: 'Use Client Directive',
    type: 'must_do',
    rule: "Add 'use client' to any component using hooks (useState, useEffect, etc.) in /app directory.",
    severity: 'critical',
    autoEnforce: true
  },
  {
    id: 'g_api_response',
    name: 'API Response Format',
    type: 'must_do',
    rule: 'Use NextResponse.json() for App Router API routes, not res.json().',
    severity: 'critical',
    autoEnforce: true
  },
  {
    id: 'g_image_component',
    name: 'Image Component',
    type: 'prefer',
    rule: "Use next/image <Image> instead of <img> for better performance.",
    severity: 'suggested',
    autoEnforce: false
  },
  {
    id: 'g_link_component',
    name: 'Link Component',
    type: 'prefer',
    rule: "Use next/link <Link> for internal navigation instead of <a>.",
    severity: 'suggested',
    autoEnforce: false
  }
]

export const REACT_GUARDRAILS: Guardrail[] = [
  {
    id: 'g_hooks_top_level',
    name: 'Hooks Top Level',
    type: 'must_do',
    rule: 'Hooks must be called at the top level. Never inside conditions, loops, or nested functions.',
    severity: 'critical',
    autoEnforce: true
  },
  {
    id: 'g_key_prop',
    name: 'Key Prop',
    type: 'must_do',
    rule: 'Every element in a .map() must have a unique key prop.',
    severity: 'critical',
    autoEnforce: true
  },
  {
    id: 'g_state_naming',
    name: 'State Naming',
    type: 'must_do',
    rule: 'useState setter must match: [value, setValue] or [isX, setIsX]. Never mismatch names.',
    severity: 'critical',
    autoEnforce: true
  },
  {
    id: 'g_async_state',
    name: 'Async State',
    type: 'must_not_do',
    rule: "Don't read state immediately after setState. Use useEffect or functional updates.",
    severity: 'important',
    autoEnforce: true
  }
]

// =====================================================
// SMART PROMPT TEMPLATES
// =====================================================

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'tpl_new_project',
    name: 'Start New Project',
    icon: '',
    color: '#10B981',
    description: 'Set up a new project from scratch with best practices',
    popularity: 95,
    prompts: [
      {
        id: 'p_nextjs_setup',
        name: 'Next.js Project Setup',
        category: 'project_setup',
        systemPrompt: `You are setting up a new Next.js project. Follow these rules:
${UNIVERSAL_GUARDRAILS.map(g => `- ${g.rule}`).join('\n')}
${NEXTJS_GUARDRAILS.map(g => `- ${g.rule}`).join('\n')}

Project structure must include:
- /app directory with layout.tsx and page.tsx
- /components with /ui subdirectory
- /lib for utilities and API clients
- /hooks for custom React hooks
- /types for TypeScript definitions
- Proper TypeScript configuration
- Tailwind CSS setup
- Environment variables template`,
        userPrompt: `Create a new Next.js project called "{projectName}" with the following features:
- {features}
- TypeScript with strict mode
- Tailwind CSS for styling
- {database} for data storage
- {auth} for authentication

Set up the complete project structure with all necessary files.`,
        requiredContext: [],
        optionalContext: [],
        guardrails: [...UNIVERSAL_GUARDRAILS, ...NEXTJS_GUARDRAILS],
        variables: [
          { name: 'projectName', placeholder: 'my-app', type: 'text', required: true },
          { name: 'features', placeholder: 'user dashboard, API routes', type: 'text', required: true },
          { name: 'database', placeholder: 'Supabase', type: 'select', required: true, options: ['Supabase', 'Prisma + PostgreSQL', 'MongoDB', 'Firebase', 'None'] },
          { name: 'auth', placeholder: 'Supabase Auth', type: 'select', required: true, options: ['Supabase Auth', 'NextAuth.js', 'Clerk', 'Auth0', 'None'] }
        ],
        expectedOutput: {
          type: 'code',
          files: [
            { path: 'package.json', description: 'Dependencies and scripts' },
            { path: 'app/layout.tsx', description: 'Root layout with providers' },
            { path: 'app/page.tsx', description: 'Home page' },
            { path: 'lib/supabase.ts', description: 'Database client' },
            { path: 'components/ui/Button.tsx', description: 'Base UI components' }
          ],
          validation: ['TypeScript compiles', 'All imports resolve', 'No ESLint errors']
        },
        tags: ['nextjs', 'setup', 'typescript', 'tailwind'],
        difficulty: 'beginner',
        estimatedTime: '10-15 minutes',
        successRate: 94
      }
    ]
  },
  {
    id: 'tpl_component',
    name: 'Create Component',
    icon: '',
    color: '#6366F1',
    description: 'Build a new React component with proper typing and tests',
    popularity: 92,
    prompts: [
      {
        id: 'p_component_create',
        name: 'New Component',
        category: 'component_creation',
        systemPrompt: `You are creating a React component. Follow these rules:
${UNIVERSAL_GUARDRAILS.map(g => `- ${g.rule}`).join('\n')}
${REACT_GUARDRAILS.map(g => `- ${g.rule}`).join('\n')}

Component requirements:
- TypeScript with explicit Props interface
- Proper export (default or named as specified)
- Handle loading, error, empty, and success states
- Use Tailwind for styling
- Include JSDoc comments
- Make it accessible (ARIA labels, keyboard support)`,
        userPrompt: `Create a {componentType} component called "{componentName}" that:
- {description}
- Props: {props}
- Located at: {path}

Include TypeScript types, proper error handling, and Tailwind styling.`,
        requiredContext: [
          { type: 'style_guide', description: 'Project style guide', autoLoad: true }
        ],
        optionalContext: [
          { type: 'component', description: 'Similar existing components', autoLoad: true }
        ],
        guardrails: [...UNIVERSAL_GUARDRAILS, ...REACT_GUARDRAILS],
        variables: [
          { name: 'componentType', placeholder: 'functional', type: 'select', required: true, options: ['functional', 'client', 'server'] },
          { name: 'componentName', placeholder: 'UserCard', type: 'text', required: true },
          { name: 'description', placeholder: 'displays user info with avatar and name', type: 'text', required: true },
          { name: 'props', placeholder: 'user: User, onClick?: () => void', type: 'text', required: false },
          { name: 'path', placeholder: 'components/UserCard.tsx', type: 'text', required: true, autoFillFrom: 'suggested_path' }
        ],
        expectedOutput: {
          type: 'code',
          files: [
            { path: '{path}', description: 'The component file' }
          ],
          validation: ['TypeScript compiles', 'Props interface complete', 'Handles all states']
        },
        tags: ['component', 'react', 'typescript'],
        difficulty: 'beginner',
        estimatedTime: '5-10 minutes',
        successRate: 96
      }
    ]
  },
  {
    id: 'tpl_api',
    name: 'Build API',
    icon: '',
    color: '#F59E0B',
    description: 'Create API routes with validation and error handling',
    popularity: 88,
    prompts: [
      {
        id: 'p_api_route',
        name: 'API Route',
        category: 'api_development',
        systemPrompt: `You are creating an API route. Follow these rules:
${UNIVERSAL_GUARDRAILS.map(g => `- ${g.rule}`).join('\n')}
${NEXTJS_GUARDRAILS.map(g => `- ${g.rule}`).join('\n')}

API requirements:
- Use App Router format (export async function GET/POST/etc)
- Validate all inputs
- Return proper status codes (200, 201, 400, 401, 404, 500)
- Include error handling with try/catch
- Use NextResponse.json() for responses
- Add rate limiting considerations
- Include TypeScript types for request/response`,
        userPrompt: `Create an API route at "{path}" that:
- Method(s): {methods}
- {description}
- Input: {input}
- Output: {output}
- Database: {database}

Include proper validation, error handling, and TypeScript types.`,
        requiredContext: [
          { type: 'project_memory', description: 'Database schema', autoLoad: true }
        ],
        optionalContext: [],
        guardrails: [...UNIVERSAL_GUARDRAILS, ...NEXTJS_GUARDRAILS],
        variables: [
          { name: 'path', placeholder: 'app/api/users/route.ts', type: 'text', required: true },
          { name: 'methods', placeholder: 'GET, POST', type: 'select', required: true, options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'GET, POST', 'GET, PUT, DELETE'] },
          { name: 'description', placeholder: 'handles user CRUD operations', type: 'text', required: true },
          { name: 'input', placeholder: '{ name: string, email: string }', type: 'text', required: false },
          { name: 'output', placeholder: '{ user: User } or { users: User[] }', type: 'text', required: false },
          { name: 'database', placeholder: 'Supabase', type: 'select', required: true, options: ['Supabase', 'Prisma', 'MongoDB', 'Direct SQL'] }
        ],
        expectedOutput: {
          type: 'code',
          files: [
            { path: '{path}', description: 'The API route file' }
          ],
          validation: ['Returns correct status codes', 'Handles errors', 'Input validated']
        },
        tags: ['api', 'nextjs', 'backend'],
        difficulty: 'intermediate',
        estimatedTime: '10-15 minutes',
        successRate: 91
      }
    ]
  },
  {
    id: 'tpl_fix_bug',
    name: 'Fix Bug',
    icon: '',
    color: '#EF4444',
    description: 'Debug and fix issues with proper verification',
    popularity: 90,
    prompts: [
      {
        id: 'p_fix_error',
        name: 'Fix Error',
        category: 'bug_fixing',
        systemPrompt: `You are fixing a bug. Follow these CRITICAL rules:
${UNIVERSAL_GUARDRAILS.map(g => `- ${g.rule}`).join('\n')}

Bug fixing process:
1. First, understand the error completely
2. Identify the root cause, not just symptoms
3. Make the MINIMAL change to fix the issue
4. DO NOT refactor or "improve" other code
5. DO NOT remove any existing code that works
6. Preserve all comments and console.logs
7. After fixing, verify the fix doesn't break anything else
8. Explain what caused the bug and how the fix works`,
        userPrompt: `Fix this error:

**Error:**
{errorMessage}

**File:** {file}

**What I was trying to do:**
{context}

Fix ONLY this specific error. Do not change anything else.`,
        requiredContext: [
          { type: 'file', description: 'The file with the error', autoLoad: true }
        ],
        optionalContext: [
          { type: 'project_memory', description: 'Related components', autoLoad: true }
        ],
        guardrails: [...UNIVERSAL_GUARDRAILS],
        variables: [
          { name: 'errorMessage', placeholder: 'TypeError: Cannot read property...', type: 'text', required: true },
          { name: 'file', placeholder: 'src/components/UserList.tsx', type: 'file', required: true },
          { name: 'context', placeholder: 'Loading user data from API', type: 'text', required: false }
        ],
        expectedOutput: {
          type: 'code',
          validation: ['Error is fixed', 'No other code changed', 'Comments preserved']
        },
        tags: ['bug', 'fix', 'debug'],
        difficulty: 'intermediate',
        estimatedTime: '5-15 minutes',
        successRate: 88
      }
    ]
  },
  {
    id: 'tpl_feature',
    name: 'Add Feature',
    icon: '',
    color: '#8B5CF6',
    description: 'Implement a new feature with planning and testing',
    popularity: 87,
    prompts: [
      {
        id: 'p_add_feature',
        name: 'New Feature',
        category: 'integration',
        systemPrompt: `You are implementing a new feature. Follow these rules:
${UNIVERSAL_GUARDRAILS.map(g => `- ${g.rule}`).join('\n')}
${REACT_GUARDRAILS.map(g => `- ${g.rule}`).join('\n')}

Feature implementation process:
1. First, create a brief plan of what files need to be created/modified
2. Check existing code patterns and follow them
3. Implement in small, testable steps
4. Handle all edge cases and error states
5. Make it work with the existing codebase
6. Don't break existing functionality`,
        userPrompt: `Add this feature:

**Feature:** {featureName}
**Description:** {description}
**User Story:** As a {userType}, I want to {action} so that {benefit}.

**Acceptance Criteria:**
{criteria}

Plan the implementation first, then build it step by step.`,
        requiredContext: [
          { type: 'project_memory', description: 'Project structure and components', autoLoad: true },
          { type: 'style_guide', description: 'Code conventions', autoLoad: true }
        ],
        optionalContext: [],
        guardrails: [...UNIVERSAL_GUARDRAILS, ...REACT_GUARDRAILS],
        variables: [
          { name: 'featureName', placeholder: 'User Search', type: 'text', required: true },
          { name: 'description', placeholder: 'Search users by name or email', type: 'text', required: true },
          { name: 'userType', placeholder: 'admin', type: 'text', required: true },
          { name: 'action', placeholder: 'search for users', type: 'text', required: true },
          { name: 'benefit', placeholder: 'I can find users quickly', type: 'text', required: true },
          { name: 'criteria', placeholder: '- Search box in header\n- Results update as I type\n- Shows "no results" when empty', type: 'text', required: true }
        ],
        expectedOutput: {
          type: 'mixed',
          followUp: ['Do you want me to add tests?', 'Should I add loading states?']
        },
        tags: ['feature', 'implementation'],
        difficulty: 'intermediate',
        estimatedTime: '20-40 minutes',
        successRate: 85
      }
    ]
  },
  {
    id: 'tpl_continue',
    name: 'Continue Project',
    icon: '▶',
    color: '#3B82F6',
    description: 'Resume work with full context loaded',
    popularity: 93,
    prompts: [
      {
        id: 'p_continue_work',
        name: 'Continue Where I Left Off',
        category: 'project_setup',
        systemPrompt: `You are continuing work on an existing project. Load all context:
${UNIVERSAL_GUARDRAILS.map(g => `- ${g.rule}`).join('\n')}

Before doing anything:
1. Review the project memory for context
2. Check recent session summaries
3. Look at pending tasks
4. Review recent decisions
5. Ask what to work on if unclear`,
        userPrompt: `Continue working on my project. Here's what I remember:

**Last Session:** {lastSession}
**Current Focus:** {currentFocus}
**Pending Tasks:** {pendingTasks}

What should we work on next?`,
        requiredContext: [
          { type: 'project_memory', description: 'Full project memory', autoLoad: true }
        ],
        optionalContext: [],
        guardrails: [...UNIVERSAL_GUARDRAILS],
        variables: [
          { name: 'lastSession', placeholder: 'Auto-filled from memory', type: 'auto', required: false, autoFillFrom: 'session_summaries.latest' },
          { name: 'currentFocus', placeholder: 'Auto-filled from memory', type: 'auto', required: false, autoFillFrom: 'critical_context' },
          { name: 'pendingTasks', placeholder: 'Auto-filled from memory', type: 'auto', required: false, autoFillFrom: 'progress.pending_tasks' }
        ],
        expectedOutput: {
          type: 'plan'
        },
        tags: ['continue', 'context'],
        difficulty: 'beginner',
        estimatedTime: '2-5 minutes',
        successRate: 97
      }
    ]
  }
]

// =====================================================
// ONE-CLICK QUICK PROMPTS
// =====================================================

export const QUICK_PROMPTS = [
  {
    id: 'qp_explain',
    label: ' Explain this code',
    prompt: 'Explain what this code does, step by step. Highlight any potential issues or improvements.',
    icon: ''
  },
  {
    id: 'qp_fix',
    label: ' Fix this error',
    prompt: 'Fix this error. Make ONLY the minimal changes needed. Do not refactor or change unrelated code.',
    icon: ''
  },
  {
    id: 'qp_improve',
    label: ' Improve this',
    prompt: 'Suggest improvements for this code. List them first, then ask which ones I want you to implement.',
    icon: ''
  },
  {
    id: 'qp_test',
    label: ' Write tests',
    prompt: 'Write comprehensive tests for this code. Include unit tests, edge cases, and error scenarios.',
    icon: ''
  },
  {
    id: 'qp_document',
    label: ' Add documentation',
    prompt: 'Add JSDoc comments and inline documentation to this code. Explain complex logic.',
    icon: ''
  },
  {
    id: 'qp_typescript',
    label: ' Add TypeScript types',
    prompt: 'Add proper TypeScript types to this code. Create interfaces for all data structures.',
    icon: ''
  },
  {
    id: 'qp_refactor',
    label: ' Refactor',
    prompt: 'Refactor this code to be cleaner and more maintainable. Explain each change you make.',
    icon: ''
  },
  {
    id: 'qp_optimize',
    label: ' Optimize performance',
    prompt: 'Analyze and optimize this code for performance. Explain the bottlenecks and fixes.',
    icon: ''
  }
]

// =====================================================
// NOTIFICATION GENERATOR
// =====================================================

export class NotificationGenerator {
  private projectMemory: any
  private userPreferences: any

  constructor(projectMemory?: any, userPreferences?: any) {
    this.projectMemory = projectMemory
    this.userPreferences = userPreferences
  }

  generateNotifications(): NewChatNotification[] {
    const notifications: NewChatNotification[] = []

    // Welcome notification for new users
    notifications.push(this.createWelcomeNotification())

    // Continue project notification if there's active work
    if (this.projectMemory) {
      notifications.push(this.createContinueNotification())
    }

    // Suggested tasks based on context
    notifications.push(...this.createSuggestedTasks())

    // Daily prompt
    notifications.push(this.createDailyPrompt())

    return notifications.sort((a, b) => b.priority - a.priority)
  }

  private createWelcomeNotification(): NewChatNotification {
    return {
      id: 'notif_welcome',
      type: 'welcome',
      title: ` Welcome to ${BRAND_NAME}`,
      description: 'Start with a template or describe what you want to build',
      priority: 100,
      prompt: {
        id: 'p_welcome',
        name: 'Get Started',
        category: 'project_setup',
        systemPrompt: this.buildSystemPrompt(),
        userPrompt: "I want to build {description}. Let's get started!",
        requiredContext: [],
        optionalContext: [],
        guardrails: UNIVERSAL_GUARDRAILS,
        variables: [
          { name: 'description', placeholder: 'a todo app with user authentication', type: 'text', required: true }
        ],
        expectedOutput: { type: 'plan' },
        tags: ['welcome', 'start'],
        difficulty: 'beginner',
        estimatedTime: '5 minutes'
      }
    }
  }

  private createContinueNotification(): NewChatNotification {
    const lastSession = this.projectMemory?.sessionSummaries?.slice(-1)[0]
    const pendingTasks = this.projectMemory?.progress?.tasks?.filter((t: any) => t.status !== 'done') || []

    return {
      id: 'notif_continue',
      type: 'continue_project',
      title: '▶ Continue Your Project',
      description: lastSession?.summary || 'Pick up where you left off',
      priority: 95,
      prompt: {
        id: 'p_continue',
        name: 'Continue Project',
        category: 'project_setup',
        systemPrompt: this.buildSystemPrompt(true),
        userPrompt: `Continue working on my project "${this.projectMemory?.name || 'project'}".

Last session: ${lastSession?.summary || 'No previous session'}

Pending tasks (${pendingTasks.length}):
${pendingTasks.slice(0, 5).map((t: any) => `- ${t.title}`).join('\n')}

What should we work on next?`,
        requiredContext: [
          { type: 'project_memory', description: 'Full project context', autoLoad: true }
        ],
        optionalContext: [],
        guardrails: UNIVERSAL_GUARDRAILS,
        variables: [],
        expectedOutput: { type: 'plan' },
        tags: ['continue', 'context'],
        difficulty: 'beginner',
        estimatedTime: '2 minutes'
      },
      metadata: {
        lastSession: lastSession?.sessionId,
        pendingTaskCount: pendingTasks.length
      }
    }
  }

  private createSuggestedTasks(): NewChatNotification[] {
    const suggestions: NewChatNotification[] = []

    // Suggest based on project needs
    if (this.projectMemory) {
      const registry = this.projectMemory.registry

      // No tests? Suggest adding them
      if (!registry?.tests?.length) {
        suggestions.push({
          id: 'notif_add_tests',
          type: 'suggested_task',
          title: ' Add Tests to Your Project',
          description: 'Your project has no tests. Want me to generate them?',
          priority: 70,
          prompt: PROMPT_TEMPLATES.find(t => t.id === 'tpl_component')!.prompts[0]
        })
      }

      // No documentation? Suggest adding it
      if (!registry?.docs?.length) {
        suggestions.push({
          id: 'notif_add_docs',
          type: 'suggested_task',
          title: ' Document Your Code',
          description: 'Add documentation to make your code easier to maintain',
          priority: 60,
          prompt: {
            id: 'p_add_docs',
            name: 'Add Documentation',
            category: 'documentation',
            systemPrompt: this.buildSystemPrompt(),
            userPrompt: 'Add JSDoc documentation to all exported functions and components in my project.',
            requiredContext: [{ type: 'project_memory', description: 'Files to document', autoLoad: true }],
            optionalContext: [],
            guardrails: UNIVERSAL_GUARDRAILS,
            variables: [],
            expectedOutput: { type: 'code' },
            tags: ['docs'],
            difficulty: 'beginner',
            estimatedTime: '15 minutes'
          }
        })
      }
    }

    return suggestions
  }

  private createDailyPrompt(): NewChatNotification {
    const dailyPrompts = [
      {
        title: ' Build Something New',
        description: 'Create a new component or feature today',
        template: PROMPT_TEMPLATES.find(t => t.id === 'tpl_component')!.prompts[0]
      },
      {
        title: ' Code Review',
        description: 'Let me review your code for improvements',
        template: {
          id: 'p_review',
          name: 'Code Review',
          category: 'refactoring' as PromptCategory,
          systemPrompt: this.buildSystemPrompt(),
          userPrompt: 'Review my project code and suggest improvements. Focus on: performance, readability, and best practices.',
          requiredContext: [{ type: 'project_memory' as const, description: 'Project files', autoLoad: true }],
          optionalContext: [],
          guardrails: UNIVERSAL_GUARDRAILS,
          variables: [],
          expectedOutput: { type: 'plan' as const },
          tags: ['review'],
          difficulty: 'intermediate' as const,
          estimatedTime: '10 minutes'
        }
      },
      {
        title: ' Performance Check',
        description: 'Optimize your app\'s performance',
        template: {
          id: 'p_perf',
          name: 'Performance Audit',
          category: 'performance' as PromptCategory,
          systemPrompt: this.buildSystemPrompt(),
          userPrompt: 'Analyze my project for performance issues. Check for: unnecessary re-renders, large bundles, slow queries.',
          requiredContext: [{ type: 'project_memory' as const, description: 'Project files', autoLoad: true }],
          optionalContext: [],
          guardrails: UNIVERSAL_GUARDRAILS,
          variables: [],
          expectedOutput: { type: 'plan' as const },
          tags: ['performance'],
          difficulty: 'advanced' as const,
          estimatedTime: '20 minutes'
        }
      }
    ]

    // Rotate based on day
    const today = new Date().getDay()
    const prompt = dailyPrompts[today % dailyPrompts.length]

    return {
      id: 'notif_daily',
      type: 'daily_prompt',
      title: prompt.title,
      description: prompt.description,
      priority: 50,
      prompt: prompt.template
    }
  }

  private buildSystemPrompt(includeProjectContext: boolean = false): string {
    let prompt = `You are ${BRAND_AI_NAME}, an AI coding assistant. Follow these CRITICAL rules:

=== GUARDRAILS (NON-NEGOTIABLE) ===
${UNIVERSAL_GUARDRAILS.map(g => `[${g.severity.toUpperCase()}] ${g.rule}`).join('\n')}

=== REACT/NEXT.JS RULES ===
${REACT_GUARDRAILS.map(g => `[${g.severity.toUpperCase()}] ${g.rule}`).join('\n')}
${NEXTJS_GUARDRAILS.map(g => `[${g.severity.toUpperCase()}] ${g.rule}`).join('\n')}

=== WORKFLOW ===
1. Understand the request fully before coding
2. Plan your approach (for complex tasks)
3. Make minimal, targeted changes
4. Verify your code compiles and works
5. Explain what you did and why`

    if (includeProjectContext && this.projectMemory) {
      prompt += `

=== PROJECT CONTEXT ===
Project: ${this.projectMemory.name}
Type: ${this.projectMemory.type}
Status: ${this.projectMemory.status}

Style Guide:
- Components: ${this.projectMemory.styleGuide?.naming?.components || 'PascalCase'}
- Hooks: ${this.projectMemory.styleGuide?.naming?.hooks || 'use{Name}'}
- Styling: ${this.projectMemory.styleGuide?.patterns?.styling || 'tailwind'}

Active Decisions:
${this.projectMemory.decisions?.filter((d: any) => d.status === 'active').slice(-5).map((d: any) => `- ${d.decision}`).join('\n') || 'None'}

Remember: Follow the project's existing patterns and conventions.`
    }

    return prompt
  }
}

// =====================================================
// PROMPT BUILDER
// =====================================================

export class PromptBuilder {
  private template: SmartPrompt
  private variables: Map<string, string> = new Map()
  private context: any

  constructor(template: SmartPrompt) {
    this.template = template
  }

  setVariable(name: string, value: string): PromptBuilder {
    this.variables.set(name, value)
    return this
  }

  setVariables(vars: Record<string, string>): PromptBuilder {
    for (const [key, value] of Object.entries(vars)) {
      this.variables.set(key, value)
    }
    return this
  }

  setContext(context: any): PromptBuilder {
    this.context = context
    return this
  }

  build(): { systemPrompt: string; userPrompt: string; guardrails: Guardrail[] } {
    let systemPrompt = this.template.systemPrompt
    let userPrompt = this.template.userPrompt

    // Replace variables
    for (const variable of this.template.variables) {
      const value = this.variables.get(variable.name) || variable.defaultValue || variable.placeholder
      const placeholder = `{${variable.name}}`

      userPrompt = userPrompt.replace(new RegExp(placeholder, 'g'), value)
      systemPrompt = systemPrompt.replace(new RegExp(placeholder, 'g'), value)
    }

    // Add context if available
    if (this.context) {
      systemPrompt += `\n\n=== CONTEXT ===\n${JSON.stringify(this.context, null, 2)}`
    }

    return {
      systemPrompt,
      userPrompt,
      guardrails: this.template.guardrails
    }
  }

  validate(): { valid: boolean; missing: string[] } {
    const missing: string[] = []

    for (const variable of this.template.variables) {
      if (variable.required && !this.variables.has(variable.name)) {
        missing.push(variable.name)
      }
    }

    return {
      valid: missing.length === 0,
      missing
    }
  }
}

// =====================================================
// EXPORTS
// =====================================================



const smartPrompts = {
  NotificationGenerator,
  PromptBuilder,
  UNIVERSAL_GUARDRAILS,
  NEXTJS_GUARDRAILS,
  REACT_GUARDRAILS,
  PROMPT_TEMPLATES,
  QUICK_PROMPTS
}
