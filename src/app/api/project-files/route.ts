// =====================================================
// PROJECT FILES API
// GET /api/project-files?projectId=xxx         — list files
// GET /api/project-files?projectId=xxx&path=.. — get file content
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get('projectId')
        const filePath = searchParams.get('path')

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
        }

        // Auth
        const authHeader = request.headers.get('Authorization')
        let accessToken = authHeader?.replace('Bearer ', '') || null
        if (!accessToken) {
            accessToken = request.headers.get('x-user-token')
        }

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: { Authorization: `Bearer ${accessToken}` }
                }
            }
        )

        const { data: { user } } = await supabase.auth.getUser(accessToken)
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // If path is provided, return file content from storage
        if (filePath) {
            const storagePath = `${user.id}/${projectId}/${filePath}`

            const { data, error } = await supabase.storage
                .from('projects')
                .download(storagePath)

            if (error) {
                return NextResponse.json({ error: 'File not found' }, { status: 404 })
            }

            const content = await data.text()
            return NextResponse.json({ path: filePath, content })
        }

        // Otherwise, list all files for this project
        const { data: files, error } = await supabase
            .from('project_files')
            .select('id, file_path, language, file_size, created_at, updated_at')
            .eq('project_id', projectId)
            .order('file_path', { ascending: true })

        if (error) {
            console.error('[ProjectFiles] List error:', error)
            return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
        }

        return NextResponse.json({ files: files || [] })

    } catch (error: any) {
        console.error('[ProjectFiles] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
