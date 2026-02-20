'use client'

// =====================================================
// FILE ENGINE - ANALYTICS DASHBOARD
// Cost Tracking, Quality Metrics, AI Performance
// =====================================================

import { useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  Code,
  FileCode,
  Activity,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react'

interface AnalyticsCollector {
  generateReport: (period: string) => any
}

interface AnalyticsDashboardProps {
  analytics: AnalyticsCollector | null
}

export function AnalyticsDashboard({ analytics }: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
  
  // Demo data
  const stats = {
    totalSpent: 12.47,
    tokensUsed: 847392,
    filesGenerated: 156,
    qualityScore: 94,
    successRate: 91,
    avgResponseTime: 2.3
  }
  
  const costByModel = [
    { model: 'claude-3-haiku', cost: 4.23, tokens: 423000, percentage: 34 },
    { model: 'claude-3-sonnet', cost: 6.89, tokens: 312000, percentage: 55 },
    { model: 'claude-3-opus', cost: 1.35, tokens: 112392, percentage: 11 }
  ]
  
  const qualityTrend = [
    { date: 'Mon', score: 89 },
    { date: 'Tue', score: 92 },
    { date: 'Wed', score: 88 },
    { date: 'Thu', score: 95 },
    { date: 'Fri', score: 91 },
    { date: 'Sat', score: 94 },
    { date: 'Sun', score: 96 }
  ]
  
  const recentActivity = [
    { type: 'generation', description: 'Created Button component', time: '5 min ago', success: true },
    { type: 'validation', description: 'Validated 3 files', time: '12 min ago', success: true },
    { type: 'generation', description: 'Built API route', time: '25 min ago', success: true },
    { type: 'fix', description: 'Fixed TypeScript error', time: '1 hour ago', success: true },
    { type: 'generation', description: 'Created form component', time: '2 hours ago', success: false }
  ]
  
  const commonErrors = [
    { type: 'Missing type annotation', count: 12 },
    { type: 'Unused import', count: 8 },
    { type: 'Missing key prop', count: 5 },
    { type: 'Async without await', count: 3 }
  ]
  
  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Analytics Dashboard</h1>
          <p className="text-zinc-400">Track your usage, costs, and code quality</p>
        </div>
        
        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1">
          {(['day', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Spent"
          value={`$${stats.totalSpent.toFixed(2)}`}
          change="+12%"
          trend="up"
          color="green"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Tokens Used"
          value={formatNumber(stats.tokensUsed)}
          change="+8%"
          trend="up"
          color="blue"
        />
        <StatCard
          icon={<FileCode className="w-5 h-5" />}
          label="Files Generated"
          value={stats.filesGenerated.toString()}
          change="+23%"
          trend="up"
          color="purple"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Quality Score"
          value={`${stats.qualityScore}%`}
          change="+5%"
          trend="up"
          color="emerald"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Success Rate"
          value={`${stats.successRate}%`}
          change="-2%"
          trend="down"
          color="yellow"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg Response"
          value={`${stats.avgResponseTime}s`}
          change="-15%"
          trend="up"
          color="cyan"
        />
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cost by Model */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-zinc-400" />
            Cost by Model
          </h3>
          
          <div className="space-y-4">
            {costByModel.map(item => (
              <div key={item.model}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-zinc-300">{item.model}</span>
                  <span className="text-white font-medium">${item.cost.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.model.includes('haiku') ? 'bg-green-500' :
                      item.model.includes('sonnet') ? 'bg-blue-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {formatNumber(item.tokens)} tokens · {item.percentage}%
                </div>
              </div>
            ))}
          </div>
          
          {/* Projected */}
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Projected Monthly</span>
              <span className="text-white font-semibold">${(stats.totalSpent * 4).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Quality Trend */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-zinc-400" />
            Quality Trend
          </h3>
          
          {/* Simple Bar Chart */}
          <div className="h-48 flex items-end justify-between gap-2">
            {qualityTrend.map((item, i) => (
              <div key={item.date} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all hover:from-blue-500 hover:to-blue-300"
                  style={{ height: `${item.score}%` }}
                />
                <span className="text-xs text-zinc-500 mt-2">{item.date}</span>
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-zinc-400">Validation Pass Rate</span>
            </div>
            <span className="text-green-400 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" />
              +7% this week
            </span>
          </div>
        </div>
      </div>
      
      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-zinc-400" />
            Recent Activity
          </h3>
          
          <div className="space-y-3">
            {recentActivity.map((activity, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  activity.success ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {activity.type === 'generation' && <Sparkles className={`w-4 h-4 ${activity.success ? 'text-green-400' : 'text-red-400'}`} />}
                  {activity.type === 'validation' && <CheckCircle className={`w-4 h-4 ${activity.success ? 'text-green-400' : 'text-red-400'}`} />}
                  {activity.type === 'fix' && <Code className={`w-4 h-4 ${activity.success ? 'text-green-400' : 'text-red-400'}`} />}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">{activity.description}</div>
                  <div className="text-xs text-zinc-500">{activity.time}</div>
                </div>
                {activity.success ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Common Errors */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-zinc-400" />
            Common Issues
          </h3>
          
          <div className="space-y-3">
            {commonErrors.map((error, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                <span className="text-sm text-zinc-300">{error.type}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${(error.count / 15) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-zinc-400 w-8 text-right">{error.count}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-400">Pro Tip</div>
                <div className="text-xs text-zinc-400 mt-1">
                  Enable strict TypeScript mode to catch more issues automatically.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  change,
  trend,
  color
}: {
  icon: React.ReactNode
  label: string
  value: string
  change: string
  trend: 'up' | 'down'
  color: string
}) {
  const colors: Record<string, string> = {
    green: 'from-green-500/20 to-green-500/5 border-green-500/30',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30'
  }
  
  const iconColors: Record<string, string> = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    emerald: 'text-emerald-400',
    yellow: 'text-yellow-400',
    cyan: 'text-cyan-400'
  }
  
  return (
    <div className={`bg-gradient-to-b ${colors[color]} border rounded-xl p-4`}>
      <div className={`${iconColors[color]} mb-3`}>{icon}</div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-zinc-400 mb-2">{label}</div>
      <div className={`text-xs flex items-center gap-1 ${
        trend === 'up' && change.startsWith('+') ? 'text-green-400' :
        trend === 'down' && change.startsWith('-') ? 'text-green-400' :
        'text-red-400'
      }`}>
        {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {change}
      </div>
    </div>
  )
}

// Helper
function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

export default AnalyticsDashboard
