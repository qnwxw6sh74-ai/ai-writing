"use client"

import { useState, useEffect } from "react"
import { GuestbookForm } from "@/components/guestbook/GuestbookForm"
import { GuestbookList } from "@/components/guestbook/GuestbookList"

interface Message {
  id: number
  nickname: string
  content: string
  created_at: string
}

export function GuestbookClient() {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => { fetchMessages() }, [])

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/guestbook")
      const data = await res.json()
      setMessages(data.messages || [])
    } catch { /* ignore */ }
  }

  const handleSubmit = async (nickname: string, content: string) => {
    await fetch("/api/guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, content }),
    })
    await fetchMessages()
  }

  return (
    <div className="space-y-6">
      <GuestbookForm onSubmit={handleSubmit} />
      <GuestbookList messages={messages} />
    </div>
  )
}
