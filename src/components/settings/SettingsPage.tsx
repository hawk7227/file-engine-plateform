'use client'
import { BRAND_NAME } from '@/lib/brand'

// =====================================================
// FILE ENGINE - SETTINGS PAGE (Claude/ChatGPT Style)
// Complete settings with all tabs
// =====================================================

import { useState } from 'react'
import {
  X,
  Settings,
  User,
  Shield,
  CreditCard,
  BarChart3,
  Zap,
  Link2,
  Code,
  ChevronRight,
  Check,
  Moon,
  Sun,
  Globe,
  Bell,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Trash2
} from 'lucide-react'

interface SettingsPageProps {
  isOpen: boolean
  onClose: () => void
  user: {
    name: string
    email: string
    plan: string
    avatar?: string
  } | null
}

type SettingsTab = 'general' | 'account' | 'privacy' | 'billing' | 'usage' | 'capabilities' | 'connectors' | 'api'

export function SettingsPage({ isOpen, onClose, user }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  
  if (!isOpen) return null
  
  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
    { id: 'account', label: 'Account', icon: <User className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'usage', label: 'Usage', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'capabilities', label: 'Capabilities', icon: <Zap className="w-4 h-4" /> },
    { id: 'connectors', label: 'Connectors', icon: <Link2 className="w-4 h-4" /> },
    { id: 'api', label: 'API Keys', icon: <Code className="w-4 h-4" /> },
  ]
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-56 bg-zinc-950 border-r border-zinc-800 p-4">
          <h2 className="text-xl font-bold mb-6">Settings</h2>
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{tabs.find(t => t.id === activeTab)?.label}</h3>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'general' && <GeneralSettings user={user} />}
            {activeTab === 'account' && <AccountSettings user={user} />}
            {activeTab === 'privacy' && <PrivacySettings />}
            {activeTab === 'billing' && <BillingSettings user={user} />}
            {activeTab === 'usage' && <UsageSettings />}
            {activeTab === 'capabilities' && <CapabilitiesSettings />}
            {activeTab === 'connectors' && <ConnectorsSettings />}
            {activeTab === 'api' && <APISettings />}
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// GENERAL SETTINGS
// =====================================================

function GeneralSettings({ user }: { user: any }) {
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [callName, setCallName] = useState(user?.name || '')
  const [workFunction, setWorkFunction] = useState('')
  const [preferences, setPreferences] = useState('')
  
  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <section>
        <h4 className="text-lg font-semibold mb-4">Profile</h4>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Full name</label>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-sm font-bold">
                {displayName.charAt(0) || 'U'}
              </div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-zinc-400 mb-2">What should {BRAND_NAME} call you?</label>
            <input
              type="text"
              value={callName}
              onChange={(e) => setCallName(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <label className="block text-sm text-zinc-400 mb-2">What best describes your work?</label>
          <select
            value={workFunction}
            onChange={(e) => setWorkFunction(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
          >
            <option value="">Select your work function</option>
            <option value="software">Software Development</option>
            <option value="design">Design</option>
            <option value="product">Product Management</option>
            <option value="data">Data Science</option>
            <option value="marketing">Marketing</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div className="mt-6">
          <label className="block text-sm text-zinc-400 mb-2">
            What <span className="text-blue-400 underline cursor-pointer">personal preferences</span> should {BRAND_NAME} consider in responses?
          </label>
          <p className="text-xs text-zinc-500 mb-2">Your preferences will apply to all conversations.</p>
          <textarea
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder="e.g. ask clarifying questions before giving detailed answers"
            rows={4}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none"
          />
        </div>
      </section>
      
      {/* Notifications Section */}
      <section className="border-t border-zinc-800 pt-8">
        <h4 className="text-lg font-semibold mb-4">Notifications</h4>
        
        <div className="space-y-4">
          <ToggleSetting
            label="Response completions"
            description={`Get notified when ${BRAND_NAME} has finished a response. Most useful for long-running tasks.`}
            defaultValue={false}
          />
          
          <ToggleSetting
            label="Email notifications"
            description={`Get an email when ${BRAND_NAME} has finished building or needs your response.`}
            defaultValue={false}
          />
        </div>
      </section>
      
      {/* Appearance Section */}
      <section className="border-t border-zinc-800 pt-8">
        <h4 className="text-lg font-semibold mb-4">Appearance</h4>
        
        <div className="flex gap-4">
          <button className="flex-1 p-4 bg-zinc-800 border-2 border-blue-500 rounded-xl">
            <Moon className="w-6 h-6 mb-2" />
            <div className="text-sm font-medium">Dark</div>
          </button>
          <button className="flex-1 p-4 bg-zinc-800 border border-zinc-700 rounded-xl hover:border-zinc-600">
            <Sun className="w-6 h-6 mb-2" />
            <div className="text-sm font-medium">Light</div>
          </button>
          <button className="flex-1 p-4 bg-zinc-800 border border-zinc-700 rounded-xl hover:border-zinc-600">
            <Settings className="w-6 h-6 mb-2" />
            <div className="text-sm font-medium">System</div>
          </button>
        </div>
      </section>
    </div>
  )
}

// =====================================================
// ACCOUNT SETTINGS
// =====================================================

function AccountSettings({ user }: { user: any }) {
  return (
    <div className="space-y-8">
      <section>
        <h4 className="text-lg font-semibold mb-4">Account Information</h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
            <div>
              <div className="text-sm text-zinc-400">Email</div>
              <div className="font-medium">{user?.email || 'user@example.com'}</div>
            </div>
            <button className="px-4 py-2 text-sm text-blue-400 hover:text-blue-300">Change</button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
            <div>
              <div className="text-sm text-zinc-400">Password</div>
              <div className="font-medium">••••••••••</div>
            </div>
            <button className="px-4 py-2 text-sm text-blue-400 hover:text-blue-300">Change</button>
          </div>
        </div>
      </section>
      
      <section className="border-t border-zinc-800 pt-8">
        <h4 className="text-lg font-semibold mb-4">Connected Accounts</h4>
        
        <div className="space-y-3">
          <ConnectedAccount provider="Google" connected email="marcus@gmail.com" />
          <ConnectedAccount provider="GitHub" connected={false} />
        </div>
      </section>
      
      <section className="border-t border-zinc-800 pt-8">
        <h4 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h4>
        
        <button className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20">
          Delete Account
        </button>
        <p className="mt-2 text-sm text-zinc-500">
          This will permanently delete your account and all associated data.
        </p>
      </section>
    </div>
  )
}

// =====================================================
// PRIVACY SETTINGS
// =====================================================

function PrivacySettings() {
  return (
    <div className="space-y-8">
      <section>
        <h4 className="text-lg font-semibold mb-4">Data & Privacy</h4>
        
        <div className="space-y-4">
          <ToggleSetting
            label={`Improve ${BRAND_NAME}`}
            description="Allow your conversations to help improve our AI models. Your data is anonymized."
            defaultValue={true}
          />
          
          <ToggleSetting
            label="Chat history"
            description="Save your chat history to continue conversations later."
            defaultValue={true}
          />
          
          <ToggleSetting
            label="Project memory"
            description="Remember context about your projects across conversations."
            defaultValue={true}
          />
        </div>
      </section>
      
      <section className="border-t border-zinc-800 pt-8">
        <h4 className="text-lg font-semibold mb-4">Data Export</h4>
        
        <p className="text-sm text-zinc-400 mb-4">
          Download a copy of your data including conversations, projects, and settings.
        </p>
        
        <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm">
          Request Data Export
        </button>
      </section>
      
      <section className="border-t border-zinc-800 pt-8">
        <h4 className="text-lg font-semibold mb-4">Clear Data</h4>
        
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800">
            <div>
              <div className="font-medium">Clear chat history</div>
              <div className="text-sm text-zinc-500">Delete all your conversations</div>
            </div>
            <Trash2 className="w-5 h-5 text-zinc-500" />
          </button>
          
          <button className="w-full flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800">
            <div>
              <div className="font-medium">Clear project memory</div>
              <div className="text-sm text-zinc-500">Forget all learned context about your projects</div>
            </div>
            <Trash2 className="w-5 h-5 text-zinc-500" />
          </button>
        </div>
      </section>
    </div>
  )
}

// =====================================================
// BILLING SETTINGS
// =====================================================

function BillingSettings({ user }: { user: any }) {
  const plan = user?.plan || 'Free'
  
  return (
    <div className="space-y-8">
      <section>
        <h4 className="text-lg font-semibold mb-4">Current Plan</h4>
        
        <div className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold">{plan} Plan</div>
              <div className="text-zinc-400">{plan === 'Free' ? '10 generations/day' : plan === 'Pro' ? '100 generations/day' : 'Unlimited generations'}</div>
            </div>
            {plan !== 'Enterprise' && (
              <button className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium">
                Upgrade
              </button>
            )}
          </div>
          
          {plan !== 'Free' && (
            <div className="text-sm text-zinc-400">
              Next billing date: March 1, 2025
            </div>
          )}
        </div>
      </section>
      
      <section className="border-t border-zinc-800 pt-8">
        <h4 className="text-lg font-semibold mb-4">Payment Method</h4>
        
        {plan === 'Free' ? (
          <p className="text-zinc-400">No payment method on file. Upgrade to add one.</p>
        ) : (
          <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 bg-zinc-700 rounded flex items-center justify-center text-xs font-bold">
                VISA
              </div>
              <div>
                <div className="font-medium">•••• •••• •••• 4242</div>
                <div className="text-sm text-zinc-500">Expires 12/25</div>
              </div>
            </div>
            <button className="text-sm text-blue-400 hover:text-blue-300">Update</button>
          </div>
        )}
      </section>
      
      <section className="border-t border-zinc-800 pt-8">
        <h4 className="text-lg font-semibold mb-4">Billing History</h4>
        
        {plan === 'Free' ? (
          <p className="text-zinc-400">No billing history yet.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <div>
                <div className="font-medium">February 2025</div>
                <div className="text-sm text-zinc-500">Pro Plan - Monthly</div>
              </div>
              <div className="text-right">
                <div className="font-medium">$29.00</div>
                <button className="text-sm text-blue-400">Download</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// =====================================================
// USAGE SETTINGS
// =====================================================

function UsageSettings() {
  return (
    <div className="space-y-8">
      <section>
        <h4 className="text-lg font-semibold mb-4">Today&apos;s Usage</h4>
        
        <div className="grid grid-cols-3 gap-4">
          <UsageCard label="Generations" value="7" max="10" />
          <UsageCard label="Tokens Used" value="45K" max="100K" />
          <UsageCard label="Files Created" value="12" max="50" />
        </div>
      </section>
      
      <section className="border-t border-zinc-800 pt-8">
        <h4 className="text-lg font-semibold mb-4">This Month</h4>
        
        <div className="grid grid-cols-3 gap-4">
          <UsageCard label="Generations" value="156" max="300" />
          <UsageCard label="Tokens Used" value="1.2M" max="3M" />
          <UsageCard label="Projects" value="8" max="20" />
        </div>
      </section>
      
      <section className="border-t border-zinc-800 pt-8">
        <h4 className="text-lg font-semibold mb-4">Usage History</h4>
        
        <div className="h-48 bg-zinc-800/50 rounded-lg flex items-center justify-center text-zinc-500">
          Usage chart would go here
        </div>
      </section>
    </div>
  )
}

// =====================================================
// CAPABILITIES SETTINGS
// =====================================================

function CapabilitiesSettings() {
  return (
    <div className="space-y-8">
      <section>
        <h4 className="text-lg font-semibold mb-4">AI Features</h4>
        
        <div className="space-y-4">
          <ToggleSetting
            label="Web search"
            description={`Let ${BRAND_NAME} search the web for up-to-date information.`}
            defaultValue={true}
          />
          
          <ToggleSetting
            label="Code execution"
            description={`Let ${BRAND_NAME} run code to verify it works.`}
            defaultValue={true}
          />
          
          <ToggleSetting
            label="Auto-fix errors"
            description="Automatically fix validation errors in generated code."
            defaultValue={true}
          />
          
          <ToggleSetting
            label="Smart suggestions"
            description="Show intelligent suggestions based on your context."
            defaultValue={true}
          />
        </div>
      </section>
      
      <section className="border-t border-zinc-800 pt-8">
        <h4 className="text-lg font-semibold mb-4">Validation</h4>
        
        <div className="space-y-4">
          <ToggleSetting
            label="Syntax validation"
            description="Check code for syntax errors before returning."
            defaultValue={true}
          />
          
          <ToggleSetting
            label="Type checking"
            description="Validate TypeScript types in generated code."
            defaultValue={true}
          />
          
          <ToggleSetting
            label="Security scanning"
            description="Scan for common security vulnerabilities."
            defaultValue={true}
          />
          
          <ToggleSetting
            label="Best practices"
            description="Enforce coding best practices and conventions."
            defaultValue={true}
          />
        </div>
      </section>
    </div>
  )
}

// =====================================================
// CONNECTORS SETTINGS
// =====================================================

function ConnectorsSettings() {
  return (
    <div className="space-y-8">
      <section>
        <h4 className="text-lg font-semibold mb-4">Integrations</h4>
        <p className="text-sm text-zinc-400 mb-6">Connect external services to enhance {BRAND_NAME}&apos;s capabilities.</p>
        
        <div className="space-y-3">
          <ConnectorCard
            name="GitHub"
            description="Deploy code directly to GitHub repositories"
            connected
          />
          <ConnectorCard
            name="Vercel"
            description="Deploy and preview projects on Vercel"
            connected={false}
          />
          <ConnectorCard
            name="Supabase"
            description="Connect to Supabase for database operations"
            connected={false}
          />
          <ConnectorCard
            name="Figma"
            description="Import designs from Figma"
            connected={false}
          />
        </div>
      </section>
    </div>
  )
}

// =====================================================
// API SETTINGS
// =====================================================

function APISettings() {
  const [showKey, setShowKey] = useState(false)
  const apiKey = 'fe_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  
  return (
    <div className="space-y-8">
      <section>
        <h4 className="text-lg font-semibold mb-4">Your API Keys</h4>
        <p className="text-sm text-zinc-400 mb-6">
          Use these keys to access the {BRAND_NAME} API programmatically.
        </p>
        
        <div className="p-4 bg-zinc-800/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-zinc-400">Production Key</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowKey(!showKey)}
                className="p-1.5 hover:bg-zinc-700 rounded"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button className="p-1.5 hover:bg-zinc-700 rounded">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <code className="text-sm font-mono">
            {showKey ? apiKey : '•'.repeat(40)}
          </code>
        </div>
        
        <button className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm">
          Generate New Key
        </button>
      </section>
      
      <section className="border-t border-zinc-800 pt-8">
        <h4 className="text-lg font-semibold mb-4">Bring Your Own Keys</h4>
        <p className="text-sm text-zinc-400 mb-6">
          Use your own API keys for AI providers.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Anthropic API Key</label>
            <input
              type="password"
              placeholder="sk-ant-xxxxxxxx"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>
          
          <div>
            <label className="block text-sm text-zinc-400 mb-2">OpenAI API Key</label>
            <input
              type="password"
              placeholder="sk-xxxxxxxx"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>
        
        <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium">
          Save Keys
        </button>
      </section>
      
      <section className="border-t border-zinc-800 pt-8">
        <h4 className="text-lg font-semibold mb-4">API Documentation</h4>
        
        <a
          href="/docs/api"
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
        >
          View API Documentation
          <ExternalLink className="w-4 h-4" />
        </a>
      </section>
    </div>
  )
}

// =====================================================
// SHARED COMPONENTS
// =====================================================

function ToggleSetting({
  label,
  description,
  defaultValue
}: {
  label: string
  description: string
  defaultValue: boolean
}) {
  const [enabled, setEnabled] = useState(defaultValue)
  
  return (
    <div className="flex items-start justify-between gap-4 p-4 bg-zinc-800/30 rounded-lg">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-sm text-zinc-500">{description}</div>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-zinc-700'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            enabled ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

function ConnectedAccount({
  provider,
  connected,
  email
}: {
  provider: string
  connected: boolean
  email?: string
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center">
          {provider === 'Google' ? '🔵' : '⚫'}
        </div>
        <div>
          <div className="font-medium">{provider}</div>
          {connected && email && <div className="text-sm text-zinc-500">{email}</div>}
        </div>
      </div>
      <button className={`px-4 py-2 rounded-lg text-sm ${
        connected
          ? 'bg-zinc-700 text-zinc-300'
          : 'bg-blue-600 text-white hover:bg-blue-500'
      }`}>
        {connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  )
}

function UsageCard({ label, value, max }: { label: string; value: string; max: string }) {
  const percentage = (parseInt(value.replace(/[^0-9]/g, '')) / parseInt(max.replace(/[^0-9]/g, ''))) * 100
  
  return (
    <div className="p-4 bg-zinc-800/50 rounded-lg">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-zinc-500 mb-2">{label}</div>
      <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="text-xs text-zinc-500 mt-1">{max} limit</div>
    </div>
  )
}

function ConnectorCard({
  name,
  description,
  connected
}: {
  name: string
  description: string
  connected: boolean
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center text-lg">
          {name === 'GitHub' ? '⚫' : name === 'Vercel' ? '▲' : name === 'Supabase' ? '⚡' : '🎨'}
        </div>
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-zinc-500">{description}</div>
        </div>
      </div>
      <button className={`px-4 py-2 rounded-lg text-sm ${
        connected
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-zinc-700 hover:bg-zinc-600'
      }`}>
        {connected ? (
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4" /> Connected
          </span>
        ) : 'Connect'}
      </button>
    </div>
  )
}

export default SettingsPage
