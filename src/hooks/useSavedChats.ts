import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface SavedChat {
    id: string
    title: string
    updated_at: string
    messages: any[]
    project_id?: string
}

export function useSavedChats(projectId?: string) {
    const [chats, setChats] = useState<SavedChat[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchChats = useCallback(async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setChats([])
                return
            }

            let query = supabase
                .from('chats')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false })

            if (projectId) {
                query = query.eq('project_id', projectId)
            }

            const { data, error } = await query

            if (error) throw error

            setChats(data || [])
        } catch (err: any) {
            console.error('Error fetching chats:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [projectId])

    const deleteChat = useCallback(async (id: string) => {
        try {
            const { error } = await supabase
                .from('chats')
                .delete()
                .eq('id', id)

            if (error) throw error

            setChats(prev => prev.filter(c => c.id !== id))
        } catch (err: any) {
            console.error('Error deleting chat:', err)
            throw err
        }
    }, [])

    const renameChat = useCallback(async (id: string, newTitle: string) => {
        try {
            const { error } = await supabase
                .from('chats')
                .update({ title: newTitle })
                .eq('id', id)

            if (error) throw error

            setChats(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c))
        } catch (err: any) {
            console.error('Error renaming chat:', err)
            throw err
        }
    }, [])

    useEffect(() => {
        fetchChats()
    }, [fetchChats])

    return {
        chats,
        loading,
        error,
        refresh: fetchChats,
        deleteChat,
        renameChat
    }
}
