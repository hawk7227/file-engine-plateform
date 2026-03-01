'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BRAND_NAME } from '@/lib/brand'

/**
 * ONBOARDING SYSTEM
 * 
 * First-time user experience that guides users through:
 * 1. Welcome & value proposition
 * 2. Quick project type selection
 * 3. First prompt assistance
 * 4. Feature discovery
 * 
 * Better because:
 * - Contextual, not just a tour
 * - Adapts to user skill level
 * - Shows real examples they can use
 * - Remembers progress
 */

// ============================================
// TYPES
// ============================================

export interface OnboardingStep {
  id: string
  title: string
  description: string
  action?: string
  highlight?: string // CSS selector to highlight
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right'
  skippable?: boolean
}

export interface UserPreferences {
  skillLevel: 'beginner' | 'intermediate' | 'expert'
  preferredStack: string[]
  completedOnboarding: boolean
  dismissedTips: string[]
  favoritePrompts: string[]
  shortcuts: Record<string, string>
}

// ============================================
// ONBOARDING STEPS
// ============================================

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: `Welcome to ${BRAND_NAME}! `,
    description: 'Build complete projects by describing what you want. No boilerplate, no setup - just results.',
    position: 'center'
  },
  {
    id: 'skill_level',
    title: 'Tell us about yourself',
    description: 'This helps us customize suggestions and explanations for you.',
    position: 'center'
  },
  {
    id: 'first_prompt',
    title: 'Try your first prompt',
    description: 'Start with something simple like "Create a todo app" or pick from our examples.',
    highlight: '.input-wrapper',
    position: 'bottom'
  },
  {
    id: 'activity_feed',
    title: 'Watch the magic happen',
    description: 'See exactly what the AI is doing - reading, writing, validating, fixing.',
    highlight: '.activity-feed',
    position: 'left'
  },
  {
    id: 'preview_panel',
    title: 'Instant preview',
    description: 'Your generated code appears here with live preview, syntax highlighting, and more.',
    highlight: '.preview-panel',
    position: 'left'
  },
  {
    id: 'file_upload',
    title: 'Add context with files',
    description: 'Upload existing code, images, or docs to help the AI understand your project.',
    highlight: '.attach-btn',
    position: 'top'
  },
  {
    id: 'complete',
    title: 'You\'re ready! ',
    description: 'Start building. We\'ll show helpful tips as you go.',
    position: 'center'
  }
]

// ============================================
// SMART PROMPTS BY SKILL LEVEL
// ============================================

export const SMART_PROMPTS = {
  beginner: [
    {
      label: 'Simple Todo App',
      prompt: 'Create a simple todo app where I can add and delete tasks',
      tags: ['React', 'Beginner']
    },
    {
      label: 'Personal Portfolio',
      prompt: 'Create a personal portfolio website with an about section, projects, and contact form',
      tags: ['HTML', 'CSS']
    },
    {
      label: 'Calculator',
      prompt: 'Build a calculator app with basic operations (add, subtract, multiply, divide)',
      tags: ['JavaScript', 'Beginner']
    },
    {
      label: 'Weather Display',
      prompt: 'Create a weather app that shows the current weather for a city',
      tags: ['API', 'React']
    }
  ],
  intermediate: [
    {
      label: 'Auth System',
      prompt: 'Build a complete authentication system with login, signup, password reset, and protected routes using React and Supabase',
      tags: ['React', 'Supabase', 'Auth']
    },
    {
      label: 'Dashboard',
      prompt: 'Create an admin dashboard with charts, data tables, user list, and real-time metrics using React and Recharts',
      tags: ['React', 'Charts', 'Dashboard']
    },
    {
      label: 'REST API',
      prompt: 'Build a REST API with Express.js including CRUD operations, authentication middleware, and PostgreSQL database',
      tags: ['Node.js', 'Express', 'API']
    },
    {
      label: 'E-commerce Cart',
      prompt: 'Create a shopping cart system with product listing, cart management, and checkout flow',
      tags: ['React', 'State Management']
    }
  ],
  expert: [
    {
      label: 'Full SaaS Starter',
      prompt: 'Build a complete SaaS starter with Next.js 14, Supabase auth, Stripe subscriptions, team management, and admin dashboard',
      tags: ['Next.js', 'Supabase', 'Stripe', 'Full Stack']
    },
    {
      label: 'Real-time Collaboration',
      prompt: 'Create a real-time collaborative document editor with presence indicators, conflict resolution, and version history',
      tags: ['WebSockets', 'CRDT', 'Advanced']
    },
    {
      label: 'CI/CD Pipeline',
      prompt: 'Build a complete CI/CD pipeline configuration with GitHub Actions, Docker, Kubernetes deployment, and monitoring',
      tags: ['DevOps', 'Docker', 'K8s']
    },
    {
      label: 'Microservices',
      prompt: 'Design a microservices architecture with API gateway, service discovery, message queue, and distributed tracing',
      tags: ['Architecture', 'Advanced']
    }
  ]
}

// ============================================
// CONTEXTUAL TIPS
// ============================================

export const CONTEXTUAL_TIPS = {
  empty_project: {
    title: ' Quick Start',
    message: 'Try clicking one of the project cards below, or type your own description.',
    dismissable: true
  },
  first_generation: {
    title: ' Pro Tip',
    message: 'Be specific! Instead of "make a website", try "create a landing page for a fitness app with pricing table".',
    dismissable: true
  },
  validation_errors: {
    title: ' Don\'t worry!',
    message: `${BRAND_NAME} automatically fixes most errors. Watch the activity feed to see fixes happening.`,
    dismissable: true
  },
  large_project: {
    title: ' Complex Project',
    message: 'For large projects, break them into parts. Start with the core feature, then iterate.',
    dismissable: true
  },
  file_upload: {
    title: ' Context Helps',
    message: 'Uploading existing code helps the AI match your style and understand your project structure.',
    dismissable: true
  },
  slow_generation: {
    title: '⏳ Taking a moment',
    message: 'Complex projects take longer. The AI is writing complete, production-ready code.',
    dismissable: true
  },
  keyboard_shortcuts: {
    title: '⌨ Power User Tip',
    message: 'Press Cmd+Enter to send, Cmd+K for command palette, Cmd+/ for shortcuts.',
    dismissable: true
  }
}

// ============================================
// ONBOARDING HOOK
// ============================================

export function useOnboarding(userId: string | null) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isOnboarding, setIsOnboarding] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [activeTip, setActiveTip] = useState<string | null>(null)

  // Load user preferences
  useEffect(() => {
    if (!userId) return

    async function loadPreferences() {
      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (data) {
        setPreferences(data.preferences)
        if (!data.preferences.completedOnboarding) {
          setIsOnboarding(true)
        }
      } else {
        // First time user
        setIsOnboarding(true)
        setPreferences({
          skillLevel: 'intermediate',
          preferredStack: [],
          completedOnboarding: false,
          dismissedTips: [],
          favoritePrompts: [],
          shortcuts: {}
        })
      }
    }

    loadPreferences()
  }, [userId])

  // Save preferences
  async function savePreferences(updates: Partial<UserPreferences>) {
    if (!userId || !preferences) return

    const newPrefs = { ...preferences, ...updates }
    setPreferences(newPrefs)

    await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        preferences: newPrefs,
        updated_at: new Date().toISOString()
      })
  }

  // Navigation
  function nextStep() {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep((prev: number) => prev + 1)
    } else {
      completeOnboarding()
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      setCurrentStep((prev: number) => prev - 1)
    }
  }

  function skipOnboarding() {
    completeOnboarding()
  }

  function completeOnboarding() {
    setIsOnboarding(false)
    savePreferences({ completedOnboarding: true })
  }

  // Tips management
  function showTip(tipId: string) {
    if (preferences?.dismissedTips.includes(tipId)) return
    setActiveTip(tipId)
  }

  function dismissTip(tipId: string) {
    setActiveTip(null)
    if (preferences) {
      savePreferences({
        dismissedTips: [...preferences.dismissedTips, tipId]
      })
    }
  }

  // Skill level
  function setSkillLevel(level: 'beginner' | 'intermediate' | 'expert') {
    savePreferences({ skillLevel: level })
  }

  return {
    // Onboarding
    isOnboarding,
    currentStep,
    steps: ONBOARDING_STEPS,
    currentStepData: ONBOARDING_STEPS[currentStep],
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,

    // Preferences
    preferences,
    setSkillLevel,
    savePreferences,

    // Tips
    activeTip,
    showTip,
    dismissTip,

    // Smart prompts
    smartPrompts: (SMART_PROMPTS as Record<string, any[]>)[preferences?.skillLevel || 'intermediate']
  }
}

// ============================================
// ONBOARDING MODAL COMPONENT
// ============================================

interface OnboardingModalProps {
  step: OnboardingStep
  stepIndex: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onSetSkillLevel?: (level: 'beginner' | 'intermediate' | 'expert') => void
  skillLevel?: string
}

export function OnboardingModal({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onSetSkillLevel,
  skillLevel
}: OnboardingModalProps) {
  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1
  const isSkillStep = step.id === 'skill_level'

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        {/* Progress */}
        <div className="onboarding-progress">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div 
              key={i} 
              className={`progress-dot ${i === stepIndex ? 'active' : i < stepIndex ? 'completed' : ''}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="onboarding-content">
          <h2>{step.title}</h2>
          <p>{step.description}</p>

          {/* Skill level selector */}
          {isSkillStep && onSetSkillLevel && (
            <div className="skill-selector">
              <button 
                className={`skill-option ${skillLevel === 'beginner' ? 'active' : ''}`}
                onClick={() => onSetSkillLevel('beginner')}
              >
                <span className="skill-icon"></span>
                <span className="skill-label">Beginner</span>
                <span className="skill-desc">New to coding or AI tools</span>
              </button>
              <button 
                className={`skill-option ${skillLevel === 'intermediate' ? 'active' : ''}`}
                onClick={() => onSetSkillLevel('intermediate')}
              >
                <span className="skill-icon"></span>
                <span className="skill-label">Intermediate</span>
                <span className="skill-desc">Comfortable with code</span>
              </button>
              <button 
                className={`skill-option ${skillLevel === 'expert' ? 'active' : ''}`}
                onClick={() => onSetSkillLevel('expert')}
              >
                <span className="skill-icon"></span>
                <span className="skill-label">Expert</span>
                <span className="skill-desc">Professional developer</span>
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="onboarding-actions">
          {!isFirst && (
            <button className="onboarding-btn secondary" onClick={onPrev}>
              Back
            </button>
          )}
          <button className="onboarding-btn text" onClick={onSkip}>
            Skip tour
          </button>
          <button className="onboarding-btn primary" onClick={onNext}>
            {isLast ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .onboarding-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(8px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .onboarding-modal {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: 32px;
          max-width: 480px;
          width: 90%;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .onboarding-progress {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 24px;
        }

        .progress-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          transition: all 0.2s;
        }

        .progress-dot.active {
          background: var(--accent-primary);
          width: 24px;
          border-radius: 4px;
        }

        .progress-dot.completed {
          background: var(--accent-primary);
        }

        .onboarding-content {
          text-align: center;
          margin-bottom: 24px;
        }

        .onboarding-content h2 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .onboarding-content p {
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .skill-selector {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 24px;
        }

        .skill-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--bg-tertiary);
          border: 2px solid var(--border-subtle);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }

        .skill-option:hover {
          border-color: var(--border-default);
        }

        .skill-option.active {
          border-color: var(--accent-primary);
          background: rgba(16, 185, 129, 0.05);
        }

        .skill-icon {
          font-size: 24px;
        }

        .skill-label {
          font-weight: 600;
          display: block;
        }

        .skill-desc {
          font-size: 12px;
          color: var(--text-muted);
        }

        .onboarding-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .onboarding-btn {
          padding: 12px 24px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          font-size: 14px;
        }

        .onboarding-btn.primary {
          background: var(--accent-primary);
          color: var(--bg-primary);
          border: none;
        }

        .onboarding-btn.primary:hover {
          box-shadow: var(--shadow-glow);
        }

        .onboarding-btn.secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
        }

        .onboarding-btn.text {
          background: none;
          border: none;
          color: var(--text-muted);
        }

        .onboarding-btn.text:hover {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}

// ============================================
// CONTEXTUAL TIP COMPONENT
// ============================================

interface ContextualTipProps {
  tipId: string
  onDismiss: () => void
}

export function ContextualTip({ tipId, onDismiss }: ContextualTipProps) {
  const tip = CONTEXTUAL_TIPS[tipId as keyof typeof CONTEXTUAL_TIPS]
  if (!tip) return null

  return (
    <div className="contextual-tip">
      <div className="tip-content">
        <strong>{tip.title}</strong>
        <p>{tip.message}</p>
      </div>
      {tip.dismissable && (
        <button className="tip-dismiss" onClick={onDismiss}>×</button>
      )}

      <style jsx>{`
        .contextual-tip {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          background: var(--accent-primary), rgba(0, 136, 255, 0.1));
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: var(--radius-md);
          margin-bottom: 12px;
          animation: tipSlide 0.3s ease;
        }

        @keyframes tipSlide {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .tip-content {
          flex: 1;
        }

        .tip-content strong {
          display: block;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .tip-content p {
          font-size: 12px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        .tip-dismiss {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 18px;
          padding: 0;
          line-height: 1;
        }

        .tip-dismiss:hover {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}
