// =====================================================
// FILE ENGINE - ChatContainer Component
// The main chat wrapper that brings together messages,
// input, and scroll handling
// =====================================================

'use client'
import { BRAND_NAME } from '@/lib/brand'

import { useRef, useEffect, useCallback } from 'react'
import { useChat, Message, Attachment } from '@/hooks/useChat'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'

// =====================================================
// TYPES
// =====================================================

interface ChatContainerProps {
  projectId?: string
  model?: string
  initialMessages?: Message[]
  onMessagesChange?: (messages: Message[]) => void
  className?: string
}

// =====================================================
// WELCOME SCREEN
// =====================================================

function WelcomeScreen({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  const suggestions = [
    {
      icon: '🚀',
      title: 'Build a landing page',
      prompt: 'Create a modern landing page for a SaaS product with hero section, features, pricing, and footer'
    },
    {
      icon: '📊',
      title: 'Create a dashboard',
      prompt: 'Build a dashboard with charts, stats cards, and a data table using React and Tailwind'
    },
    {
      icon: '🔐',
      title: 'Add authentication',
      prompt: 'Create a login and signup form with email/password and social auth using Supabase'
    },
    {
      icon: '🛒',
      title: 'Build an e-commerce cart',
      prompt: 'Create a shopping cart component with add/remove items, quantity controls, and total calculation'
    }
  ]
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to {BRAND_NAME}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          I can help you build, fix, and improve code. Start with a prompt below or try one of these suggestions.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(suggestion.prompt)}
            className="flex items-start gap-3 p-4 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all"
          >
            <span className="text-2xl">{suggestion.icon}</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {suggestion.title}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {suggestion.prompt}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// =====================================================
// LOADING INDICATOR
// =====================================================

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-gray-500 dark:text-gray-400">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm">{BRAND_NAME} is thinking...</span>
    </div>
  )
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ChatContainer({
  projectId,
  model,
  initialMessages,
  onMessagesChange,
  className = ''
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    regenerate,
    stopGeneration,
    setMessages
  } = useChat({
    projectId,
    model,
    onMessage: () => {
      // Scroll to bottom on new message
      scrollToBottom()
    }
  })
  
  // Initialize with provided messages
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages)
    }
  }, [initialMessages, setMessages])
  
  // Notify parent of message changes
  useEffect(() => {
    onMessagesChange?.(messages)
  }, [messages, onMessagesChange])
  
  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  
  // Scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])
  
  // Handle suggestion click
  const handleSuggestionClick = (text: string) => {
    sendMessage(text)
  }
  
  // Handle copy
  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content)
  }
  
  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Messages area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
        ) : (
          <div className="pb-32">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                onRegenerate={
                  message.role === 'assistant' && index === messages.length - 1 && !isLoading
                    ? () => regenerate(message.id)
                    : undefined
                }
                onCopy={handleCopy}
              />
            ))}
            
            {/* Loading indicator */}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="py-6 bg-gray-50 dark:bg-gray-800/50">
                <div className="max-w-3xl mx-auto px-4">
                  <LoadingIndicator />
                </div>
              </div>
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">
            Error: {error}
          </p>
        </div>
      )}
      
      {/* Input area */}
      <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
            onStop={stopGeneration}
            placeholder={`Ask ${BRAND_NAME} to build something...`}
          />
          <p className="mt-2 text-xs text-center text-gray-400">
            {BRAND_NAME} can make mistakes. Review generated code carefully.
          </p>
        </div>
      </div>
    </div>
  )
}
