// =====================================================
// FILE ENGINE - SAVE PROJECT FILES TO SUPABASE STORAGE
// After AI generates code blocks, this saves them to:
//   1. Supabase Storage (projects bucket) - actual file content
//   2. project_files table - metadata for fast lookups
// =====================================================

import { SupabaseClient } from '@supabase/supabase-js'

export interface GeneratedFile {
    path: string
    content: string
    language?: string
}

interface SaveResult {
    saved: string[]
    errors: string[]
}

/**
 * Parse code blocks from AI response into GeneratedFile array.
 * Matches the format: ```language:filepath\n...\n```
 */
export function parseCodeBlocksFromResponse(content: string): GeneratedFile[] {
    const files: GeneratedFile[] = []

    // Primary format: ```language:filepath\ncontent\n```
    const filePathRegex = /```(\w+):([^\n]+)\n([\s\S]*?)```/g
    let match
    while ((match = filePathRegex.exec(content)) !== null) {
        const language = match[1] || 'text'
        const filepath = match[2]?.trim()
        const code = match[3]?.trim()

        if (code && filepath) {
            files.push({
                path: filepath,
                content: code,
                language
            })
        }
    }

    // Fallback: ```language // filename\ncontent\n```
    if (files.length === 0) {
        const fallbackRegex = /```(\w+)?\s*(?:\/\/\s*(.+?)\n)([\s\S]*?)```/g
        while ((match = fallbackRegex.exec(content)) !== null) {
            const language = match[1] || 'text'
            const filename = match[2]?.trim()
            const code = match[3]?.trim()

            if (code && filename) {
                files.push({
                    path: filename,
                    content: code,
                    language
                })
            }
        }
    }

    return files
}

/**
 * Save generated files to Supabase Storage and project_files table.
 * 
 * Storage path: {userId}/{projectId}/{filePath}
 * Example: abc-123/def-456/src/App.tsx
 */
export async function saveProjectFiles(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    chatId: string | undefined,
    files: GeneratedFile[]
): Promise<SaveResult> {
    const saved: string[] = []
    const errors: string[] = []

    for (const file of files) {
        try {
            const storagePath = `${userId}/${projectId}/${file.path}`

            // Upload to Supabase Storage (upsert = overwrite if exists)
            const { error: uploadError } = await supabase.storage
                .from('projects')
                .upload(storagePath, file.content, {
                    contentType: 'text/plain',
                    upsert: true
                })

            if (uploadError) {
                console.error(`[SaveFiles] Storage upload failed for ${file.path}:`, uploadError.message)
                errors.push(`${file.path}: ${uploadError.message}`)
                continue
            }

            // Upsert metadata in project_files table
            const { error: dbError } = await supabase
                .from('project_files')
                .upsert(
                    {
                        project_id: projectId,
                        chat_id: chatId || null,
                        file_path: file.path,
                        storage_path: storagePath,
                        file_size: new Blob([file.content]).size,
                        language: file.language || null,
                        updated_at: new Date().toISOString()
                    },
                    {
                        onConflict: 'project_id,file_path'
                    }
                )

            if (dbError) {
                console.error(`[SaveFiles] DB upsert failed for ${file.path}:`, dbError.message)
                errors.push(`${file.path}: ${dbError.message}`)
                continue
            }

            saved.push(file.path)
        } catch (err: any) {
            console.error(`[SaveFiles] Error saving ${file.path}:`, err.message)
            errors.push(`${file.path}: ${err.message}`)
        }
    }

    console.log(`[SaveFiles] Saved ${saved.length}/${files.length} files to project ${projectId}`)
    return { saved, errors }
}
