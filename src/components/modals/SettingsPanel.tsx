'use client'

// =====================================================
// FILE ENGINE - SETTINGS PANEL (COMPLETE)
// =====================================================

import { useState } from 'react'
import {
  Settings,
  User,
  CreditCard,
  Bell,
  Shield,
  Palette,
  Code,
  Zap,
  Moon,
  Sun,
  Check
} from 'lucide-react'
import { getBrandModelTiers } from '@/lib/brand'

export function SettingsPanel() {
  const [activeSection, setActiveSection] = useState('general')
  
  const sections = [
    { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
    { id: 'account', label: 'Account', icon: <User className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Settings', icon: <Zap className="w-4 h-4" /> },
    { id: 'editor', label: 'Editor', icon: <Code className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> }
  ]
  
  return (
    <div className="flex-1 flex bg-zinc-950">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800 p-4">
        <h2 className="text-lg font-semibold text-white mb-4 px-3">Settings</h2>
        <nav className="space-y-1">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === section.id
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeSection === 'general' && <GeneralSettings />}
        {activeSection === 'ai' && <AISettings />}
        {activeSection === 'editor' && <EditorSettings />}
        {activeSection === 'appearance' && <AppearanceSettings />}
        {activeSection === 'account' && <AccountSettings />}
        {activeSection === 'billing' && <BillingSettings />}
        {activeSection === 'notifications' && <NotificationSettings />}
        {activeSection === 'security' && <SecuritySettings />}
      </div>
    </div>
  )
}

function GeneralSettings() {
  return (
    <div className="max-w-2xl">
      <h3 className="text-xl font-semibold text-white mb-6">General Settings</h3>
      <div className="space-y-6">
        <SettingItem label="Language" description="Select your preferred language">
          <select className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white">
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
          </select>
        </SettingItem>
        <SettingItem label="Timezone" description="Your local timezone">
          <select className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white">
            <option>America/Phoenix (MST)</option>
            <option>America/New_York (EST)</option>
            <option>America/Los_Angeles (PST)</option>
          </select>
        </SettingItem>
        <SettingItem label="Auto-save" description="Automatically save changes">
          <Toggle defaultChecked />
        </SettingItem>
      </div>
    </div>
  )
}

function AISettings() {
  return (
    <div className="max-w-2xl">
      <h3 className="text-xl font-semibold text-white mb-6">AI Settings</h3>
      <div className="space-y-6">
        <SettingItem label="Default Model" description="Model for code generation">
          <select className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white">
            {getBrandModelTiers().map(tier => (
              <option key={tier.id} value={tier.id}>{tier.name} ({tier.desc})</option>
            ))}
          </select>
        </SettingItem>
        <SettingItem label="Auto-validation" description="Validate generated code">
          <Toggle defaultChecked />
        </SettingItem>
        <SettingItem label="Smart Guardrails" description="Apply coding rules">
          <Toggle defaultChecked />
        </SettingItem>
        <SettingItem label="Token Saving Mode" description="Compress context">
          <Toggle />
        </SettingItem>
      </div>
    </div>
  )
}

function EditorSettings() {
  return (
    <div className="max-w-2xl">
      <h3 className="text-xl font-semibold text-white mb-6">Editor Settings</h3>
      <div className="space-y-6">
        <SettingItem label="Tab Size" description="Spaces for indentation">
          <select className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white">
            <option>2 spaces</option>
            <option>4 spaces</option>
          </select>
        </SettingItem>
        <SettingItem label="Font Size" description="Code font size">
          <select className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white">
            <option>12px</option>
            <option>14px</option>
            <option>16px</option>
          </select>
        </SettingItem>
        <SettingItem label="Line Numbers" description="Show line numbers">
          <Toggle defaultChecked />
        </SettingItem>
        <SettingItem label="Word Wrap" description="Wrap long lines">
          <Toggle defaultChecked />
        </SettingItem>
      </div>
    </div>
  )
}

function AppearanceSettings() {
  const [theme, setTheme] = useState('dark')
  
  return (
    <div className="max-w-2xl">
      <h3 className="text-xl font-semibold text-white mb-6">Appearance</h3>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">Theme</label>
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: 'light', label: 'Light', icon: <Sun className="w-5 h-5" /> },
              { id: 'dark', label: 'Dark', icon: <Moon className="w-5 h-5" /> },
              { id: 'system', label: 'System', icon: <Settings className="w-5 h-5" /> }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                  theme === t.id
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                {t.icon}
                <span className="text-sm">{t.label}</span>
                {theme === t.id && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
        <SettingItem label="Accent Color" description="Primary color">
          <div className="flex gap-2">
            {['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'].map(color => (
              <button
                key={color}
                className="w-8 h-8 rounded-full border-2 border-transparent hover:border-white transition-all"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </SettingItem>
      </div>
    </div>
  )
}

function AccountSettings() {
  return (
    <div className="max-w-2xl">
      <h3 className="text-xl font-semibold text-white mb-6">Account</h3>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-2xl font-bold">
            M
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white">Marcus</h4>
            <p className="text-zinc-400">marcus@example.com</p>
          </div>
          <button className="ml-auto px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
            Edit Profile
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <SettingItem label="Email" description="Your account email">
          <input
            type="email"
            defaultValue="marcus@example.com"
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white w-64"
          />
        </SettingItem>
        <SettingItem label="Password" description="Change your password">
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
            Change Password
          </button>
        </SettingItem>
      </div>
    </div>
  )
}

function BillingSettings() {
  return (
    <div className="max-w-2xl">
      <h3 className="text-xl font-semibold text-white mb-6">Billing</h3>
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-blue-400">Current Plan</span>
            <h4 className="text-2xl font-bold text-white">Pro Plan</h4>
            <p className="text-zinc-400">$20/month · Renews Feb 15, 2024</p>
          </div>
          <button className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors">
            Upgrade
          </button>
        </div>
      </div>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
        <h4 className="font-semibold text-white mb-4">This Month&apos;s Usage</h4>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-zinc-400">Tokens</span>
              <span className="text-white">847K / 1M</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '84.7%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-zinc-400">Projects</span>
              <span className="text-white">3 / 10</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '30%' }} />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h4 className="font-semibold text-white mb-4">Payment Method</h4>
        <div className="flex items-center gap-4">
          <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold">
            VISA
          </div>
          <div>
            <p className="text-white">•••• •••• •••• 4242</p>
            <p className="text-sm text-zinc-500">Expires 12/25</p>
          </div>
          <button className="ml-auto text-sm text-blue-400 hover:text-blue-300">Update</button>
        </div>
      </div>
    </div>
  )
}

function NotificationSettings() {
  return (
    <div className="max-w-2xl">
      <h3 className="text-xl font-semibold text-white mb-6">Notifications</h3>
      <div className="space-y-6">
        <SettingItem label="Email Notifications" description="Receive email updates">
          <Toggle defaultChecked />
        </SettingItem>
        <SettingItem label="Build Notifications" description="Get notified when builds complete">
          <Toggle defaultChecked />
        </SettingItem>
        <SettingItem label="Weekly Summary" description="Weekly usage summary email">
          <Toggle />
        </SettingItem>
        <SettingItem label="Marketing" description="Product updates and tips">
          <Toggle />
        </SettingItem>
      </div>
    </div>
  )
}

function SecuritySettings() {
  return (
    <div className="max-w-2xl">
      <h3 className="text-xl font-semibold text-white mb-6">Security</h3>
      <div className="space-y-6">
        <SettingItem label="Two-Factor Authentication" description="Add extra security">
          <button className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm transition-colors">
            Enable 2FA
          </button>
        </SettingItem>
        <SettingItem label="Active Sessions" description="Manage logged in devices">
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
            View Sessions
          </button>
        </SettingItem>
        <SettingItem label="API Keys" description="Manage your API keys">
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
            Manage Keys
          </button>
        </SettingItem>
      </div>
    </div>
  )
}

function SettingItem({
  label,
  description,
  children
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-zinc-800">
      <div>
        <label className="block text-sm font-medium text-white">{label}</label>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
      {children}
    </div>
  )
}

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked)
  
  return (
    <button
      onClick={() => setChecked(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative ${
        checked ? 'bg-blue-600' : 'bg-zinc-700'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default SettingsPanel
