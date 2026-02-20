'use client'

import FileEngineApp from '@/components/FileEngineAppV2'
import { useParams } from 'next/navigation'

export default function ChatPage() {
  const params = useParams()
  const chatId = params.chatId as string
  
  return <FileEngineApp initialChatId={chatId} />
}
