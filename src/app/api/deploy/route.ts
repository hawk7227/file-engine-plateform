import { NextRequest, NextResponse } from 'next/server'
import { getUser, getSubscription, supabase } from '@/lib/supabase'
import { deployToVercel, getDeploymentStatus, setCustomDomain } from '@/lib/deploy'
import { parseBody, parseDeployRequest, validationErrorResponse } from '@/lib/schemas'

// POST /api/deploy - Create new deployment

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = await parseBody(req, parseDeployRequest)
    if (!parsed.success) return validationErrorResponse(parsed.error)
    const { projectId, production = false, customDomain } = parsed.data

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, name')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.user_id !== user.id) {
      // Check if user has team access
      const { data: teamAccess } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single()

      if (!teamAccess || !['owner', 'editor'].includes(teamAccess.role)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Check deployment limits based on plan
    const subscription = await getSubscription(user.id)
    const plan = subscription?.plan || 'free'
    
    const deployLimits = {
      free: 3,      // 3 deploys per month
      pro: 20,      // 20 deploys per month
      enterprise: Infinity
    }

    // Count this month's deployments
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: monthlyDeploys } = await supabase
      .from('deployments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())

    if ((monthlyDeploys || 0) >= deployLimits[plan as keyof typeof deployLimits]) {
      return NextResponse.json({ 
        error: `Monthly deploy limit reached (${deployLimits[plan as keyof typeof deployLimits]} for ${plan} plan)`,
        upgrade: plan !== 'enterprise'
      }, { status: 429 })
    }

    // Custom domains only for paid plans
    if (customDomain && plan === 'free') {
      return NextResponse.json({ 
        error: 'Custom domains require Pro or Enterprise plan',
        upgrade: true
      }, { status: 403 })
    }

    // Deploy to Vercel
    const deployment = await deployToVercel(projectId, user.id, {
      production,
      customDomain
    })

    return NextResponse.json({
      success: true,
      deployment: {
        id: deployment.id,
        url: deployment.url,
        previewUrl: deployment.previewUrl,
        inspectorUrl: deployment.inspectorUrl,
        status: deployment.status
      }
    })
  } catch (error) {
    console.error('Deploy error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Deployment failed' 
    }, { status: 500 })
  }
}

// GET /api/deploy?deploymentId=xxx - Check deployment status
export async function GET(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deploymentId = req.nextUrl.searchParams.get('deploymentId')
    
    if (!deploymentId) {
      return NextResponse.json({ error: 'deploymentId is required' }, { status: 400 })
    }

    const status = await getDeploymentStatus(deploymentId)

    // Update status in database
    await supabase
      .from('deployments')
      .update({ status: status.status })
      .eq('vercel_deployment_id', deploymentId)

    return NextResponse.json(status)
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to check status' 
    }, { status: 500 })
  }
}

// PATCH /api/deploy - Add custom domain
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, domain } = await req.json()

    if (!projectId || !domain) {
      return NextResponse.json({ error: 'projectId and domain are required' }, { status: 400 })
    }

    // Check plan
    const subscription = await getSubscription(user.id)
    if (!subscription || subscription.plan === 'free') {
      return NextResponse.json({ 
        error: 'Custom domains require Pro or Enterprise plan',
        upgrade: true
      }, { status: 403 })
    }

    const result = await setCustomDomain(projectId, domain)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, domain })
  } catch (error) {
    console.error('Custom domain error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to set custom domain' 
    }, { status: 500 })
  }
}
