import { NextRequest, NextResponse } from 'next/server'
import { getUser, getSubscription, supabase } from '@/lib/supabase'
import { 

  getProjectTeam, 
  inviteTeamMember, 
  removeTeamMember, 
  updateMemberRole,
  checkProjectPermission,
  getProjectActivity
} from '@/lib/team'

// GET /api/team?projectId=xxx - Get team members
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = req.nextUrl.searchParams.get('projectId')
    const includeActivity = req.nextUrl.searchParams.get('activity') === 'true'

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    // Check permission
    const { hasPermission } = await checkProjectPermission(projectId, user.id, 'viewer')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const team = await getProjectTeam(projectId)
    
    const response: any = { team }
    
    if (includeActivity) {
      response.activity = await getProjectActivity(projectId, 20)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get team error:', error)
    return NextResponse.json({ error: 'Failed to get team' }, { status: 500 })
  }
}

// POST /api/team - Invite team member
export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, email, role = 'editor' } = await req.json()

    if (!projectId || !email) {
      return NextResponse.json({ error: 'projectId and email are required' }, { status: 400 })
    }

    // Check if user has permission to invite
    const { hasPermission, role: userRole } = await checkProjectPermission(projectId, user.id, 'owner')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Only owners can invite team members' }, { status: 403 })
    }

    // Check plan limits for team size
    const subscription = await getSubscription(user.id)
    const plan = subscription?.plan || 'free'
    
    const teamLimits = {
      free: 1,        // Only owner
      pro: 5,         // 5 members
      enterprise: 50  // 50 members
    }

    const currentTeam = await getProjectTeam(projectId)
    if (currentTeam.length >= teamLimits[plan as keyof typeof teamLimits]) {
      return NextResponse.json({ 
        error: `Team size limit reached (${teamLimits[plan as keyof typeof teamLimits]} for ${plan} plan)`,
        upgrade: plan !== 'enterprise'
      }, { status: 429 })
    }

    // Invite member
    const result = await inviteTeamMember(projectId, user.id, email, role)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      inviteId: result.inviteId,
      message: `Invite sent to ${email}`
    })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 })
  }
}

// PATCH /api/team - Update member role
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, memberId, role } = await req.json()

    if (!projectId || !memberId || !role) {
      return NextResponse.json({ error: 'projectId, memberId, and role are required' }, { status: 400 })
    }

    if (!['owner', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const result = await updateMemberRole(projectId, memberId, role, user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update role error:', error)
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}

// DELETE /api/team - Remove team member
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = req.nextUrl.searchParams.get('projectId')
    const memberId = req.nextUrl.searchParams.get('memberId')

    if (!projectId || !memberId) {
      return NextResponse.json({ error: 'projectId and memberId are required' }, { status: 400 })
    }

    const result = await removeTeamMember(projectId, memberId, user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
