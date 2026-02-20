// =====================================================
// FILE ENGINE - TEAM COLLABORATION
// Real-time collaboration features Claude doesn't have
// =====================================================

// =====================================================
// TYPES
// =====================================================

export interface Team {
  id: string
  name: string
  slug: string
  ownerId: string
  createdAt: string
  updatedAt: string
  
  // Settings
  settings: TeamSettings
  
  // Members
  members: TeamMember[]
  
  // Invites
  pendingInvites: TeamInvite[]
  
  // Subscription
  subscription: TeamSubscription
  
  // Usage
  usage: TeamUsage
}

export interface TeamMember {
  userId: string
  email: string
  name: string
  avatar?: string
  role: 'owner' | 'admin' | 'developer' | 'viewer'
  joinedAt: string
  lastActiveAt: string
  permissions: Permission[]
}

export interface Permission {
  resource: 'projects' | 'billing' | 'members' | 'settings' | 'deployments'
  actions: ('create' | 'read' | 'update' | 'delete')[]
}

export interface TeamInvite {
  id: string
  email: string
  role: TeamMember['role']
  invitedBy: string
  invitedAt: string
  expiresAt: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
}

export interface TeamSettings {
  // AI Settings
  defaultModel: string
  maxTokensPerRequest: number
  autoValidation: boolean
  
  // Approval workflows
  requireApproval: {
    deployments: boolean
    codeChanges: boolean
    newProjects: boolean
  }
  
  // Notifications
  notifications: {
    email: boolean
    slack?: string
    webhook?: string
  }
  
  // Security
  security: {
    enforceMFA: boolean
    ipWhitelist?: string[]
    auditLogging: boolean
  }
  
  // Branding
  branding?: {
    logo?: string
    primaryColor?: string
    customDomain?: string
  }
}

export interface TeamSubscription {
  plan: 'free' | 'pro' | 'team' | 'enterprise'
  status: 'active' | 'past_due' | 'canceled' | 'trialing'
  currentPeriodStart: string
  currentPeriodEnd: string
  
  // Limits
  limits: {
    projects: number
    members: number
    tokensPerMonth: number
    deploymentsPerMonth: number
    storageGB: number
  }
  
  // Features
  features: string[]
}

export interface TeamUsage {
  period: string // YYYY-MM
  
  // Token usage
  tokensUsed: number
  tokenLimit: number
  
  // By member
  byMember: {
    userId: string
    tokensUsed: number
    projectsCreated: number
    deploymentsCount: number
  }[]
  
  // By project
  byProject: {
    projectId: string
    tokensUsed: number
    cost: number
  }[]
  
  // Daily usage
  dailyUsage: {
    date: string
    tokens: number
    requests: number
    cost: number
  }[]
}

// =====================================================
// COLLABORATION FEATURES
// =====================================================

export interface CollaborationSession {
  id: string
  projectId: string
  startedAt: string
  endedAt?: string
  
  // Active participants
  participants: {
    userId: string
    name: string
    avatar?: string
    cursor?: CursorPosition
    status: 'active' | 'idle' | 'away'
    lastActivity: string
  }[]
  
  // Shared context
  sharedContext: {
    currentFile?: string
    selectedCode?: string
    chatHistory: SharedMessage[]
  }
  
  // Changes
  pendingChanges: PendingChange[]
  
  // Comments
  comments: CodeComment[]
}

export interface CursorPosition {
  file: string
  line: number
  column: number
}

export interface SharedMessage {
  id: string
  userId: string
  userName: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  reactions?: { emoji: string; userIds: string[] }[]
  threadReplies?: SharedMessage[]
}

export interface PendingChange {
  id: string
  userId: string
  userName: string
  type: 'create' | 'modify' | 'delete'
  file: string
  diff?: string
  description: string
  status: 'pending' | 'approved' | 'rejected' | 'applied'
  createdAt: string
  reviewedBy?: string
  reviewedAt?: string
  comments?: string
}

export interface CodeComment {
  id: string
  userId: string
  userName: string
  file: string
  line: number
  content: string
  createdAt: string
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: string
  replies?: {
    userId: string
    userName: string
    content: string
    createdAt: string
  }[]
}

// =====================================================
// APPROVAL WORKFLOW
// =====================================================

export interface ApprovalWorkflow {
  id: string
  projectId: string
  type: 'deployment' | 'code_change' | 'config_change'
  
  // Request
  request: {
    userId: string
    userName: string
    description: string
    createdAt: string
    changes: {
      type: string
      target: string
      before?: string
      after?: string
    }[]
  }
  
  // Approval chain
  approvalChain: {
    userId: string
    userName: string
    required: boolean
    status: 'pending' | 'approved' | 'rejected'
    respondedAt?: string
    comment?: string
  }[]
  
  // Status
  status: 'pending' | 'approved' | 'rejected' | 'canceled'
  
  // Execution
  executedAt?: string
  executedBy?: string
  result?: {
    success: boolean
    error?: string
    deploymentUrl?: string
  }
}

// =====================================================
// ACTIVITY FEED
// =====================================================

export interface ActivityItem {
  id: string
  teamId: string
  projectId?: string
  
  // Actor
  actor: {
    userId: string
    name: string
    avatar?: string
  }
  
  // Action
  action: ActivityAction
  type: ActivityType
  
  // Target
  target: {
    type: 'project' | 'file' | 'deployment' | 'member' | 'settings' | 'comment'
    id: string
    name: string
  }
  
  // Details
  details?: Record<string, any>
  
  // Timestamp
  timestamp: string
  
  // Visibility
  visibility: 'team' | 'project' | 'private'
}

type ActivityAction = 
  | 'created' | 'updated' | 'deleted' 
  | 'deployed' | 'rolled_back'
  | 'invited' | 'joined' | 'left' | 'removed'
  | 'approved' | 'rejected' | 'requested'
  | 'commented' | 'resolved' | 'mentioned'

type ActivityType =
  | 'project_activity'
  | 'code_change'
  | 'deployment'
  | 'team_change'
  | 'approval'
  | 'comment'
  | 'mention'

// =====================================================
// TEAM MANAGER
// =====================================================

export class TeamManager {
  private team: Team
  private activities: ActivityItem[] = []
  private sessions: Map<string, CollaborationSession> = new Map()
  
  constructor(team: Team) {
    this.team = team
  }
  
  // =====================================================
  // MEMBER MANAGEMENT
  // =====================================================
  
  inviteMember(email: string, role: TeamMember['role'], invitedBy: string): TeamInvite {
    const invite: TeamInvite = {
      id: `inv_${Date.now()}`,
      email,
      role,
      invitedBy,
      invitedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      status: 'pending'
    }
    
    this.team.pendingInvites.push(invite)
    
    this.recordActivity({
      action: 'invited',
      type: 'team_change',
      target: { type: 'member', id: email, name: email },
      details: { role }
    }, invitedBy)
    
    return invite
  }
  
  acceptInvite(inviteId: string, user: { userId: string; email: string; name: string }): TeamMember {
    const invite = this.team.pendingInvites.find(i => i.id === inviteId)
    if (!invite || invite.status !== 'pending') {
      throw new Error('Invalid or expired invite')
    }
    
    invite.status = 'accepted'
    
    const member: TeamMember = {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: invite.role,
      joinedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      permissions: this.getDefaultPermissions(invite.role)
    }
    
    this.team.members.push(member)
    
    this.recordActivity({
      action: 'joined',
      type: 'team_change',
      target: { type: 'member', id: user.userId, name: user.name }
    }, user.userId)
    
    return member
  }
  
  updateMemberRole(userId: string, newRole: TeamMember['role'], updatedBy: string): void {
    const member = this.team.members.find(m => m.userId === userId)
    if (!member) throw new Error('Member not found')
    
    const oldRole = member.role
    member.role = newRole
    member.permissions = this.getDefaultPermissions(newRole)
    
    this.recordActivity({
      action: 'updated',
      type: 'team_change',
      target: { type: 'member', id: userId, name: member.name },
      details: { oldRole, newRole }
    }, updatedBy)
  }
  
  removeMember(userId: string, removedBy: string): void {
    const memberIndex = this.team.members.findIndex(m => m.userId === userId)
    if (memberIndex === -1) throw new Error('Member not found')
    
    const member = this.team.members[memberIndex]
    this.team.members.splice(memberIndex, 1)
    
    this.recordActivity({
      action: 'removed',
      type: 'team_change',
      target: { type: 'member', id: userId, name: member.name }
    }, removedBy)
  }
  
  private getDefaultPermissions(role: TeamMember['role']): Permission[] {
    switch (role) {
      case 'owner':
        return [
          { resource: 'projects', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'billing', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'members', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'settings', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'deployments', actions: ['create', 'read', 'update', 'delete'] }
        ]
      case 'admin':
        return [
          { resource: 'projects', actions: ['create', 'read', 'update', 'delete'] },
          { resource: 'billing', actions: ['read'] },
          { resource: 'members', actions: ['create', 'read', 'update'] },
          { resource: 'settings', actions: ['read', 'update'] },
          { resource: 'deployments', actions: ['create', 'read', 'update', 'delete'] }
        ]
      case 'developer':
        return [
          { resource: 'projects', actions: ['create', 'read', 'update'] },
          { resource: 'members', actions: ['read'] },
          { resource: 'deployments', actions: ['create', 'read'] }
        ]
      case 'viewer':
        return [
          { resource: 'projects', actions: ['read'] },
          { resource: 'members', actions: ['read'] },
          { resource: 'deployments', actions: ['read'] }
        ]
    }
  }
  
  // =====================================================
  // COLLABORATION SESSIONS
  // =====================================================
  
  startSession(projectId: string, userId: string): CollaborationSession {
    const sessionId = `sess_${Date.now()}`
    const member = this.team.members.find(m => m.userId === userId)
    
    const session: CollaborationSession = {
      id: sessionId,
      projectId,
      startedAt: new Date().toISOString(),
      participants: [{
        userId,
        name: member?.name || 'Unknown',
        avatar: member?.avatar,
        status: 'active',
        lastActivity: new Date().toISOString()
      }],
      sharedContext: {
        chatHistory: []
      },
      pendingChanges: [],
      comments: []
    }
    
    this.sessions.set(sessionId, session)
    return session
  }
  
  joinSession(sessionId: string, userId: string): CollaborationSession {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error('Session not found')
    
    const member = this.team.members.find(m => m.userId === userId)
    
    // Check if already in session
    if (!session.participants.find(p => p.userId === userId)) {
      session.participants.push({
        userId,
        name: member?.name || 'Unknown',
        avatar: member?.avatar,
        status: 'active',
        lastActivity: new Date().toISOString()
      })
    }
    
    return session
  }
  
  updateCursor(sessionId: string, userId: string, position: CursorPosition): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    
    const participant = session.participants.find(p => p.userId === userId)
    if (participant) {
      participant.cursor = position
      participant.lastActivity = new Date().toISOString()
      participant.status = 'active'
    }
  }
  
  addSharedMessage(sessionId: string, message: Omit<SharedMessage, 'id' | 'timestamp'>): SharedMessage {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error('Session not found')
    
    const newMessage: SharedMessage = {
      ...message,
      id: `msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    }
    
    session.sharedContext.chatHistory.push(newMessage)
    return newMessage
  }
  
  // =====================================================
  // APPROVAL WORKFLOWS
  // =====================================================
  
  createApprovalRequest(
    projectId: string,
    type: ApprovalWorkflow['type'],
    request: ApprovalWorkflow['request'],
    approvers: string[]
  ): ApprovalWorkflow {
    const workflow: ApprovalWorkflow = {
      id: `appr_${Date.now()}`,
      projectId,
      type,
      request,
      approvalChain: approvers.map(userId => {
        const member = this.team.members.find(m => m.userId === userId)
        return {
          userId,
          userName: member?.name || 'Unknown',
          required: true,
          status: 'pending'
        }
      }),
      status: 'pending'
    }
    
    this.recordActivity({
      action: 'requested',
      type: 'approval',
      target: { type: 'project', id: projectId, name: projectId },
      details: { type, description: request.description }
    }, request.userId)
    
    return workflow
  }
  
  respondToApproval(
    workflowId: string,
    userId: string,
    approved: boolean,
    comment?: string
  ): void {
    // In real implementation, this would update the workflow in the database
    this.recordActivity({
      action: approved ? 'approved' : 'rejected',
      type: 'approval',
      target: { type: 'project', id: workflowId, name: 'Approval Request' },
      details: { comment }
    }, userId)
  }
  
  // =====================================================
  // CODE COMMENTS
  // =====================================================
  
  addComment(
    sessionId: string,
    userId: string,
    file: string,
    line: number,
    content: string
  ): CodeComment {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error('Session not found')
    
    const member = this.team.members.find(m => m.userId === userId)
    
    const comment: CodeComment = {
      id: `cmt_${Date.now()}`,
      userId,
      userName: member?.name || 'Unknown',
      file,
      line,
      content,
      createdAt: new Date().toISOString(),
      resolved: false,
      replies: []
    }
    
    session.comments.push(comment)
    
    this.recordActivity({
      action: 'commented',
      type: 'comment',
      target: { type: 'file', id: file, name: file },
      details: { line, preview: content.slice(0, 100) }
    }, userId)
    
    return comment
  }
  
  resolveComment(sessionId: string, commentId: string, userId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    
    const comment = session.comments.find(c => c.id === commentId)
    if (comment) {
      comment.resolved = true
      comment.resolvedBy = userId
      comment.resolvedAt = new Date().toISOString()
      
      this.recordActivity({
        action: 'resolved',
        type: 'comment',
        target: { type: 'comment', id: commentId, name: comment.file }
      }, userId)
    }
  }
  
  // =====================================================
  // ACTIVITY RECORDING
  // =====================================================
  
  private recordActivity(
    activity: Omit<ActivityItem, 'id' | 'teamId' | 'actor' | 'timestamp' | 'visibility'>,
    userId: string
  ): void {
    const member = this.team.members.find(m => m.userId === userId)
    
    this.activities.push({
      ...activity,
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      teamId: this.team.id,
      actor: {
        userId,
        name: member?.name || 'Unknown',
        avatar: member?.avatar
      },
      timestamp: new Date().toISOString(),
      visibility: 'team'
    })
    
    // Trim old activities
    if (this.activities.length > 1000) {
      this.activities = this.activities.slice(-1000)
    }
  }
  
  getActivities(options: {
    projectId?: string
    userId?: string
    type?: ActivityType
    limit?: number
  } = {}): ActivityItem[] {
    let filtered = [...this.activities]
    
    if (options.projectId) {
      filtered = filtered.filter(a => a.projectId === options.projectId)
    }
    if (options.userId) {
      filtered = filtered.filter(a => a.actor.userId === options.userId)
    }
    if (options.type) {
      filtered = filtered.filter(a => a.type === options.type)
    }
    
    return filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, options.limit || 50)
  }
  
  // =====================================================
  // USAGE TRACKING
  // =====================================================
  
  trackUsage(userId: string, projectId: string, tokens: number): void {
    const period = new Date().toISOString().slice(0, 7) // YYYY-MM
    
    // Update team usage
    if (this.team.usage.period !== period) {
      // Reset for new period
      this.team.usage = {
        period,
        tokensUsed: 0,
        tokenLimit: this.team.subscription.limits.tokensPerMonth,
        byMember: [],
        byProject: [],
        dailyUsage: []
      }
    }
    
    this.team.usage.tokensUsed += tokens
    
    // Update member usage
    const memberUsage = this.team.usage.byMember.find(m => m.userId === userId)
    if (memberUsage) {
      memberUsage.tokensUsed += tokens
    } else {
      this.team.usage.byMember.push({
        userId,
        tokensUsed: tokens,
        projectsCreated: 0,
        deploymentsCount: 0
      })
    }
    
    // Update project usage
    const projectUsage = this.team.usage.byProject.find(p => p.projectId === projectId)
    if (projectUsage) {
      projectUsage.tokensUsed += tokens
    } else {
      this.team.usage.byProject.push({
        projectId,
        tokensUsed: tokens,
        cost: 0
      })
    }
    
    // Daily usage
    const today = new Date().toISOString().split('T')[0]
    const dailyUsage = this.team.usage.dailyUsage.find(d => d.date === today)
    if (dailyUsage) {
      dailyUsage.tokens += tokens
      dailyUsage.requests++
    } else {
      this.team.usage.dailyUsage.push({
        date: today,
        tokens,
        requests: 1,
        cost: 0
      })
    }
  }
  
  checkUsageLimit(): { allowed: boolean; remaining: number; percentUsed: number } {
    const used = this.team.usage.tokensUsed
    const limit = this.team.usage.tokenLimit
    
    return {
      allowed: used < limit,
      remaining: Math.max(0, limit - used),
      percentUsed: (used / limit) * 100
    }
  }
}

export default TeamManager
