import { supabase } from './supabase'

// Team member roles
export type TeamRole = 'owner' | 'editor' | 'viewer'

export interface TeamMember {
  id: string
  userId: string
  email: string
  name: string | null
  avatar: string | null
  role: TeamRole
  joinedAt: string
  lastActive: string | null
}

export interface TeamInvite {
  id: string
  email: string
  role: TeamRole
  invitedBy: string
  expiresAt: string
  status: 'pending' | 'accepted' | 'expired'
}

export interface ProjectActivity {
  id: string
  userId: string
  userName: string
  action: 'created' | 'edited' | 'deployed' | 'invited' | 'commented' | 'generated'
  details: string
  timestamp: string
}

// Get team members for a project
export async function getProjectTeam(projectId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      id,
      user_id,
      role,
      joined_at,
      last_active,
      profiles:user_id (
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('project_id', projectId)
    .order('joined_at', { ascending: true })

  if (error) throw error

  return (data || []).map((member: any) => ({
    id: member.id,
    userId: member.user_id,
    email: (member.profiles as any)?.email || '',
    name: (member.profiles as any)?.full_name || null,
    avatar: (member.profiles as any)?.avatar_url || null,
    role: member.role as TeamRole,
    joinedAt: member.joined_at,
    lastActive: member.last_active
  }))
}

// Invite team member
export async function inviteTeamMember(
  projectId: string,
  invitedByUserId: string,
  email: string,
  role: TeamRole = 'editor'
): Promise<{ success: boolean; error?: string; inviteId?: string }> {
  // Check if already a member
  const { data: existingMember } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('profiles.email', email)
    .single()

  if (existingMember) {
    return { success: false, error: 'User is already a team member' }
  }

  // Check if invite already pending
  const { data: existingInvite } = await supabase
    .from('project_invites')
    .select('id')
    .eq('project_id', projectId)
    .eq('email', email)
    .eq('status', 'pending')
    .single()

  if (existingInvite) {
    return { success: false, error: 'Invite already pending for this email' }
  }

  // Create invite
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiry

  const { data: invite, error } = await supabase
    .from('project_invites')
    .insert({
      project_id: projectId,
      email,
      role,
      invited_by: invitedByUserId,
      expires_at: expiresAt.toISOString(),
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Log activity
  await logActivity(projectId, invitedByUserId, 'invited', `Invited ${email} as ${role}`)

  // Email sending is configured via environment variables
  // Set RESEND_API_KEY or SENDGRID_API_KEY to enable invite emails
  // For now, invites work via direct link sharing

  return { success: true, inviteId: invite.id }
}

// Accept invite
export async function acceptInvite(
  inviteId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Get invite
  const { data: invite, error: inviteError } = await supabase
    .from('project_invites')
    .select('*')
    .eq('id', inviteId)
    .single()

  if (inviteError || !invite) {
    return { success: false, error: 'Invite not found' }
  }

  if (invite.status !== 'pending') {
    return { success: false, error: 'Invite is no longer valid' }
  }

  if (new Date(invite.expires_at) < new Date()) {
    await supabase
      .from('project_invites')
      .update({ status: 'expired' })
      .eq('id', inviteId)
    return { success: false, error: 'Invite has expired' }
  }

  // Verify user email matches invite
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single()

  if (profile?.email !== invite.email) {
    return { success: false, error: 'This invite is for a different email address' }
  }

  // Add as team member
  const { error: memberError } = await supabase
    .from('project_members')
    .insert({
      project_id: invite.project_id,
      user_id: userId,
      role: invite.role,
      joined_at: new Date().toISOString()
    })

  if (memberError) {
    return { success: false, error: memberError.message }
  }

  // Update invite status
  await supabase
    .from('project_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId)

  // Log activity
  await logActivity(invite.project_id, userId, 'created', 'Joined the project')

  return { success: true }
}

// Remove team member
export async function removeTeamMember(
  projectId: string,
  memberId: string,
  removedByUserId: string
): Promise<{ success: boolean; error?: string }> {
  // Verify remover has permission
  const { data: removerMember } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', removedByUserId)
    .single()

  if (!removerMember || removerMember.role !== 'owner') {
    return { success: false, error: 'Only project owners can remove members' }
  }

  // Get member being removed
  const { data: member } = await supabase
    .from('project_members')
    .select('user_id, role')
    .eq('id', memberId)
    .single()

  if (!member) {
    return { success: false, error: 'Member not found' }
  }

  if (member.role === 'owner') {
    return { success: false, error: 'Cannot remove the project owner' }
  }

  // Remove member
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Log activity
  await logActivity(projectId, removedByUserId, 'edited', 'Removed a team member')

  return { success: true }
}

// Update member role
export async function updateMemberRole(
  projectId: string,
  memberId: string,
  newRole: TeamRole,
  updatedByUserId: string
): Promise<{ success: boolean; error?: string }> {
  // Verify updater has permission
  const { data: updaterMember } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', updatedByUserId)
    .single()

  if (!updaterMember || updaterMember.role !== 'owner') {
    return { success: false, error: 'Only project owners can change roles' }
  }

  // Update role
  const { error } = await supabase
    .from('project_members')
    .update({ role: newRole })
    .eq('id', memberId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Check user permission for project
export async function checkProjectPermission(
  projectId: string,
  userId: string,
  requiredRole: TeamRole = 'viewer'
): Promise<{ hasPermission: boolean; role: TeamRole | null }> {
  // Check if owner
  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single()

  if (project?.user_id === userId) {
    return { hasPermission: true, role: 'owner' }
  }

  // Check team membership
  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()

  if (!member) {
    return { hasPermission: false, role: null }
  }

  const roleHierarchy: Record<TeamRole, number> = {
    owner: 3,
    editor: 2,
    viewer: 1
  }

  const hasPermission = roleHierarchy[member.role as TeamRole] >= roleHierarchy[requiredRole]

  return { hasPermission, role: member.role as TeamRole }
}

// Log project activity
export async function logActivity(
  projectId: string,
  userId: string,
  action: ProjectActivity['action'],
  details: string
) {
  await supabase.from('project_activities').insert({
    project_id: projectId,
    user_id: userId,
    action,
    details
  })
}

// Get project activity feed
export async function getProjectActivity(
  projectId: string,
  limit = 20
): Promise<ProjectActivity[]> {
  const { data, error } = await supabase
    .from('project_activities')
    .select(`
      id,
      user_id,
      action,
      details,
      created_at,
      profiles:user_id (
        full_name,
        email
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data || []).map((activity: any) => ({
    id: activity.id,
    userId: activity.user_id,
    userName: (activity.profiles as any)?.full_name || (activity.profiles as any)?.email || 'Unknown',
    action: activity.action as ProjectActivity['action'],
    details: activity.details,
    timestamp: activity.created_at
  }))
}

// Update last active timestamp
export async function updateLastActive(projectId: string, userId: string) {
  await supabase
    .from('project_members')
    .update({ last_active: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('user_id', userId)
}

// Get active users in project (for real-time presence)
export async function getActiveUsers(projectId: string, withinMinutes = 5): Promise<TeamMember[]> {
  const cutoff = new Date()
  cutoff.setMinutes(cutoff.getMinutes() - withinMinutes)

  const { data, error } = await supabase
    .from('project_members')
    .select(`
      id,
      user_id,
      role,
      joined_at,
      last_active,
      profiles:user_id (
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('project_id', projectId)
    .gte('last_active', cutoff.toISOString())

  if (error) throw error

  return (data || []).map((member: any) => ({
    id: member.id,
    userId: member.user_id,
    email: (member.profiles as any)?.email || '',
    name: (member.profiles as any)?.full_name || null,
    avatar: (member.profiles as any)?.avatar_url || null,
    role: member.role as TeamRole,
    joinedAt: member.joined_at,
    lastActive: member.last_active
  }))
}
