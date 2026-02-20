// =====================================================
// FILE ENGINE - ANALYTICS & INSIGHTS
// Track everything Claude doesn't: cost, quality, speed
// =====================================================

// =====================================================
// TYPES
// =====================================================

export interface ProjectAnalytics {
  projectId: string
  period: 'day' | 'week' | 'month' | 'all-time'
  
  // Cost tracking
  costs: CostMetrics
  
  // Quality metrics
  quality: QualityMetrics
  
  // Speed metrics
  speed: SpeedMetrics
  
  // Usage metrics
  usage: UsageMetrics
  
  // AI performance
  aiPerformance: AIPerformanceMetrics
  
  // Trends
  trends: TrendData
}

export interface CostMetrics {
  totalSpent: number
  currency: 'USD'
  
  // Breakdown by model
  byModel: {
    model: string
    tokens: number
    cost: number
    percentage: number
  }[]
  
  // Breakdown by feature
  byFeature: {
    feature: string
    cost: number
    percentage: number
  }[]
  
  // Daily costs
  dailyCosts: {
    date: string
    cost: number
  }[]
  
  // Projections
  projectedMonthly: number
  budgetRemaining?: number
  budgetLimit?: number
}

export interface QualityMetrics {
  // Code quality scores
  averageQualityScore: number // 0-100
  
  // Validation results
  validationStats: {
    totalValidations: number
    passedFirst: number // Passed on first try
    passedAfterFix: number
    failed: number
    passRate: number
  }
  
  // Error types
  commonErrors: {
    type: string
    count: number
    lastOccurred: string
  }[]
  
  // Fix success rate
  autoFixRate: number
  
  // Technical debt
  technicalDebt: {
    score: number // Lower is better
    issues: {
      type: string
      count: number
      severity: 'low' | 'medium' | 'high'
    }[]
  }
  
  // Test coverage (if testing enabled)
  testCoverage?: {
    statements: number
    branches: number
    functions: number
    lines: number
  }
}

export interface SpeedMetrics {
  // Generation speed
  averageGenerationTime: number // seconds
  generationTimeByComplexity: {
    complexity: 'simple' | 'medium' | 'complex'
    averageTime: number
    count: number
  }[]
  
  // Build speed
  averageBuildTime: number
  buildTimeHistory: {
    timestamp: string
    duration: number
    success: boolean
  }[]
  
  // Deployment speed
  averageDeployTime: number
  
  // Time to first working code
  timeToFirstCode: number
  
  // Iterations needed
  averageIterations: number // How many tries to get it right
}

export interface UsageMetrics {
  // Session metrics
  totalSessions: number
  averageSessionLength: number // minutes
  longestSession: number
  
  // Message metrics
  totalMessages: number
  messagesPerSession: number
  
  // File metrics
  filesGenerated: number
  filesModified: number
  linesOfCodeGenerated: number
  
  // Feature usage
  featureUsage: {
    feature: string
    usageCount: number
    lastUsed: string
  }[]
  
  // Active hours
  activeHours: {
    hour: number
    count: number
  }[]
  
  // Peak usage
  peakConcurrentUsers?: number
  peakTime?: string
}

export interface AIPerformanceMetrics {
  // Response quality
  userSatisfaction: number // 0-100 based on reactions/feedback
  
  // Accuracy
  firstTrySuccess: number // Percentage
  
  // Regeneration rate
  regenerationRate: number // How often users ask to try again
  
  // Common improvements requested
  commonFeedback: {
    type: string
    count: number
  }[]
  
  // Model comparison (if using multiple)
  modelPerformance: {
    model: string
    successRate: number
    averageQuality: number
    averageSpeed: number
    costEfficiency: number // Quality per dollar
  }[]
  
  // Learning curve
  improvementOverTime: {
    period: string
    successRate: number
    qualityScore: number
  }[]
}

export interface TrendData {
  // Quality trend
  qualityTrend: 'improving' | 'stable' | 'declining'
  qualityChange: number // Percentage change
  
  // Cost trend
  costTrend: 'increasing' | 'stable' | 'decreasing'
  costChange: number
  
  // Speed trend
  speedTrend: 'faster' | 'stable' | 'slower'
  speedChange: number
  
  // Usage trend
  usageTrend: 'growing' | 'stable' | 'declining'
  usageChange: number
  
  // Predictions
  predictions: {
    metric: string
    currentValue: number
    predictedValue: number
    confidence: number
  }[]
}

// =====================================================
// ANALYTICS COLLECTOR
// =====================================================

export class AnalyticsCollector {
  private events: AnalyticsEvent[] = []
  private maxEvents = 10000
  
  // Track an event
  track(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): void {
    this.events.push({
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString()
    })
    
    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }
  }
  
  // Track cost
  trackCost(model: string, inputTokens: number, outputTokens: number): void {
    const cost = this.calculateCost(model, inputTokens, outputTokens)
    
    this.track({
      type: 'cost',
      category: 'ai',
      data: {
        model,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        cost
      }
    })
  }
  
  // Track generation
  trackGeneration(data: {
    prompt: string
    model: string
    duration: number
    success: boolean
    filesGenerated: number
    linesOfCode: number
    validationPassed: boolean
    iterationsNeeded: number
  }): void {
    this.track({
      type: 'generation',
      category: 'ai',
      data
    })
  }
  
  // Track validation
  trackValidation(data: {
    fileCount: number
    errorCount: number
    warningCount: number
    passed: boolean
    autoFixed: number
    duration: number
  }): void {
    this.track({
      type: 'validation',
      category: 'quality',
      data
    })
  }
  
  // Track user feedback
  trackFeedback(data: {
    messageId: string
    rating: 'positive' | 'negative'
    feedbackType?: string
    comment?: string
  }): void {
    this.track({
      type: 'feedback',
      category: 'user',
      data
    })
  }
  
  // Track session
  trackSession(data: {
    sessionId: string
    duration: number
    messageCount: number
    filesCreated: number
    filesModified: number
  }): void {
    this.track({
      type: 'session',
      category: 'usage',
      data
    })
  }
  
  // Calculate cost based on model
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'claude-sonnet-4': { input: 0.003, output: 0.015 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    }
    
    const modelPricing = pricing[model] || pricing['claude-3-haiku']
    const inputCost = (inputTokens / 1000) * modelPricing.input
    const outputCost = (outputTokens / 1000) * modelPricing.output
    
    return inputCost + outputCost
  }
  
  // Generate analytics report
  generateReport(period: ProjectAnalytics['period'] = 'week'): ProjectAnalytics {
    const now = new Date()
    const periodStart = this.getPeriodStart(now, period)
    const periodEvents = this.events.filter(e => new Date(e.timestamp) >= periodStart)
    
    return {
      projectId: 'current',
      period,
      costs: this.calculateCostMetrics(periodEvents),
      quality: this.calculateQualityMetrics(periodEvents),
      speed: this.calculateSpeedMetrics(periodEvents),
      usage: this.calculateUsageMetrics(periodEvents),
      aiPerformance: this.calculateAIPerformance(periodEvents),
      trends: this.calculateTrends(periodEvents)
    }
  }
  
  private getPeriodStart(now: Date, period: ProjectAnalytics['period']): Date {
    const start = new Date(now)
    switch (period) {
      case 'day':
        start.setDate(start.getDate() - 1)
        break
      case 'week':
        start.setDate(start.getDate() - 7)
        break
      case 'month':
        start.setMonth(start.getMonth() - 1)
        break
      case 'all-time':
        start.setFullYear(2020)
        break
    }
    return start
  }
  
  private calculateCostMetrics(events: AnalyticsEvent[]): CostMetrics {
    const costEvents = events.filter(e => e.type === 'cost')
    
    const byModel = new Map<string, { tokens: number; cost: number }>()
    let totalCost = 0
    
    for (const event of costEvents) {
      const { model, totalTokens, cost } = event.data
      totalCost += cost
      
      const existing = byModel.get(model) || { tokens: 0, cost: 0 }
      byModel.set(model, {
        tokens: existing.tokens + totalTokens,
        cost: existing.cost + cost
      })
    }
    
    const modelBreakdown = Array.from(byModel.entries()).map(([model, data]) => ({
      model,
      tokens: data.tokens,
      cost: data.cost,
      percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0
    }))
    
    // Daily costs
    const dailyCosts = this.groupByDay(costEvents).map(([date, events]) => ({
      date,
      cost: events.reduce((sum, e) => sum + (e.data.cost || 0), 0)
    }))
    
    return {
      totalSpent: totalCost,
      currency: 'USD',
      byModel: modelBreakdown,
      byFeature: [], // Would need feature tracking
      dailyCosts,
      projectedMonthly: (totalCost / Math.max(dailyCosts.length, 1)) * 30
    }
  }
  
  private calculateQualityMetrics(events: AnalyticsEvent[]): QualityMetrics {
    const validationEvents = events.filter(e => e.type === 'validation')
    
    const total = validationEvents.length
    const passed = validationEvents.filter(e => e.data.passed).length
    const passedFirst = validationEvents.filter(e => e.data.passed && e.data.errorCount === 0).length
    const autoFixed = validationEvents.reduce((sum, e) => sum + (e.data.autoFixed || 0), 0)
    
    // Common errors
    const errorCounts = new Map<string, number>()
    for (const event of validationEvents) {
      if (event.data.errorTypes) {
        for (const error of event.data.errorTypes) {
          errorCounts.set(error, (errorCounts.get(error) || 0) + 1)
        }
      }
    }
    
    const commonErrors = Array.from(errorCounts.entries())
      .map(([type, count]) => ({ type, count, lastOccurred: '' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    return {
      averageQualityScore: total > 0 ? (passed / total) * 100 : 100,
      validationStats: {
        totalValidations: total,
        passedFirst,
        passedAfterFix: passed - passedFirst,
        failed: total - passed,
        passRate: total > 0 ? (passed / total) * 100 : 100
      },
      commonErrors,
      autoFixRate: total > 0 ? (autoFixed / Math.max(total - passedFirst, 1)) * 100 : 100,
      technicalDebt: {
        score: 0,
        issues: []
      }
    }
  }
  
  private calculateSpeedMetrics(events: AnalyticsEvent[]): SpeedMetrics {
    const genEvents = events.filter(e => e.type === 'generation')
    
    const durations = genEvents.map(e => e.data.duration)
    const avgDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0
    
    const iterations = genEvents.map(e => e.data.iterationsNeeded || 1)
    const avgIterations = iterations.length > 0
      ? iterations.reduce((a, b) => a + b, 0) / iterations.length
      : 1
    
    return {
      averageGenerationTime: avgDuration,
      generationTimeByComplexity: [
        { complexity: 'simple', averageTime: avgDuration * 0.5, count: 0 },
        { complexity: 'medium', averageTime: avgDuration, count: 0 },
        { complexity: 'complex', averageTime: avgDuration * 2, count: 0 }
      ],
      averageBuildTime: 0,
      buildTimeHistory: [],
      averageDeployTime: 0,
      timeToFirstCode: avgDuration,
      averageIterations: avgIterations
    }
  }
  
  private calculateUsageMetrics(events: AnalyticsEvent[]): UsageMetrics {
    const sessionEvents = events.filter(e => e.type === 'session')
    const genEvents = events.filter(e => e.type === 'generation')
    
    const totalSessions = sessionEvents.length
    const sessionDurations = sessionEvents.map(e => e.data.duration || 0)
    const avgSession = sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
      : 0
    
    const totalMessages = sessionEvents.reduce((sum, e) => sum + (e.data.messageCount || 0), 0)
    const filesGenerated = genEvents.reduce((sum, e) => sum + (e.data.filesGenerated || 0), 0)
    const linesOfCode = genEvents.reduce((sum, e) => sum + (e.data.linesOfCode || 0), 0)
    
    // Active hours
    const hourCounts = new Map<number, number>()
    for (const event of events) {
      const hour = new Date(event.timestamp).getHours()
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
    }
    
    const activeHours = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour)
    
    return {
      totalSessions,
      averageSessionLength: avgSession / 60, // Convert to minutes
      longestSession: Math.max(...sessionDurations, 0) / 60,
      totalMessages,
      messagesPerSession: totalSessions > 0 ? totalMessages / totalSessions : 0,
      filesGenerated,
      filesModified: 0,
      linesOfCodeGenerated: linesOfCode,
      featureUsage: [],
      activeHours
    }
  }
  
  private calculateAIPerformance(events: AnalyticsEvent[]): AIPerformanceMetrics {
    const feedbackEvents = events.filter(e => e.type === 'feedback')
    const genEvents = events.filter(e => e.type === 'generation')
    
    const positive = feedbackEvents.filter(e => e.data.rating === 'positive').length
    const satisfaction = feedbackEvents.length > 0 
      ? (positive / feedbackEvents.length) * 100 
      : 50
    
    const successful = genEvents.filter(e => e.data.success).length
    const firstTry = genEvents.filter(e => e.data.success && e.data.iterationsNeeded === 1).length
    const regenerations = genEvents.filter(e => e.data.iterationsNeeded > 1).length
    
    return {
      userSatisfaction: satisfaction,
      firstTrySuccess: genEvents.length > 0 ? (firstTry / genEvents.length) * 100 : 0,
      regenerationRate: genEvents.length > 0 ? (regenerations / genEvents.length) * 100 : 0,
      commonFeedback: [],
      modelPerformance: [],
      improvementOverTime: []
    }
  }
  
  private calculateTrends(events: AnalyticsEvent[]): TrendData {
    // Simple trend calculation - compare first half to second half
    const mid = Math.floor(events.length / 2)
    const firstHalf = events.slice(0, mid)
    const secondHalf = events.slice(mid)
    
    const firstQuality = this.calculateQualityMetrics(firstHalf).averageQualityScore
    const secondQuality = this.calculateQualityMetrics(secondHalf).averageQualityScore
    const qualityChange = secondQuality - firstQuality
    
    const firstCost = this.calculateCostMetrics(firstHalf).totalSpent
    const secondCost = this.calculateCostMetrics(secondHalf).totalSpent
    const costChange = firstCost > 0 ? ((secondCost - firstCost) / firstCost) * 100 : 0
    
    return {
      qualityTrend: qualityChange > 5 ? 'improving' : qualityChange < -5 ? 'declining' : 'stable',
      qualityChange,
      costTrend: costChange > 10 ? 'increasing' : costChange < -10 ? 'decreasing' : 'stable',
      costChange,
      speedTrend: 'stable',
      speedChange: 0,
      usageTrend: 'stable',
      usageChange: 0,
      predictions: []
    }
  }
  
  private groupByDay(events: AnalyticsEvent[]): [string, AnalyticsEvent[]][] {
    const groups = new Map<string, AnalyticsEvent[]>()
    
    for (const event of events) {
      const date = event.timestamp.split('T')[0]
      const existing = groups.get(date) || []
      existing.push(event)
      groups.set(date, existing)
    }
    
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }
}

interface AnalyticsEvent {
  id: string
  timestamp: string
  type: 'cost' | 'generation' | 'validation' | 'feedback' | 'session' | 'error' | 'deploy'
  category: 'ai' | 'quality' | 'user' | 'usage' | 'system'
  data: Record<string, any>
}

export default AnalyticsCollector
