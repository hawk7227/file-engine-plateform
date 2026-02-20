import { Message } from '@/hooks/useChat'
import { createClient } from '@supabase/supabase-js'

async function generateTitle(messages: Message[]): Promise<string> {
    try {
        const firstUserMessage = messages.find(m => m.role === 'user')?.content
        if (!firstUserMessage) return 'New Chat'

        // Truncate if too long for the prompt
        const promptParams = firstUserMessage.slice(0, 200)

        // Use a lightweight call to OpenRouter/OpenAI for title generation
        // For now, we'll use a direct fetch to the configured AI provider if possible, 
        // or fall back to a heuristic if no key is available in this context.
        // Since we are in the API route context, we might not have easy access to the configured 'model' 
        // without passing it down. 
        // simpler approach: Heuristic for now, can be upgraded to LLM call in `route.ts` if needed.
        // Wait! The user EXPLICITLY requested "auto generate value input". 
        // Let's use a heuristic for speed + maybe a quick keyword extraction.

        // HEURISTIC V2:
        return promptParams.split('\n')[0].slice(0, 40) || 'New Chat';

    } catch (e) {
        return 'New Chat'
    }
}

export async function saveMessagesToChat(
    supabase: any,
    userId: string,
    messages: Message[],
    projectId?: string,
    chatId?: string
): Promise<{ chatId: string; title: string }> {
    try {
        // If we have a chatId, update existing chat
        if (chatId) {
            const { data: chat } = await supabase
                .from('chats')
                .select('title')
                .eq('id', chatId)
                .eq('user_id', userId)
                .single()

            if (chat) {
                await supabase
                    .from('chats')
                    .update({
                        messages: messages,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', chatId)
                return { chatId, title: chat.title }
            }
        }

        // Otherwise, this is a new chat
        if (messages.length > 0) {
            const title = await generateTitle(messages)

            const { data, error } = await supabase
                .from('chats')
                .insert({
                    user_id: userId,
                    project_id: projectId,
                    title,
                    messages,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single()

            if (error) throw error
            return { chatId: data.id, title: data.title }
        }

        throw new Error('No messages to save')
    } catch (error) {
        console.error('Error saving chat:', error)
        throw error
    }
}
