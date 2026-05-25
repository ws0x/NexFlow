'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, X, CheckCheck, FileText, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

type Notif = {
  id:        string
  type:      string
  title:     string
  message:   string
  leadId:    string | null
  readAt:    string | null
  createdAt: string
}

const TYPE_ICON: Record<string, { color: string; bg: string }> = {
  LEAD_CREATED:   { color: '#06B6D4', bg: '#06B6D415' },
  LEAD_SENT:      { color: '#F59E0B', bg: '#F59E0B15' },
  LEAD_COMPLETED: { color: '#22C55E', bg: '#22C55E15' },
  DEFAULT:        { color: '#818CF8', bg: '#818CF815' },
}

const POLL_MS = 30_000

export function NotificationBell() {
  const [open,          setOpen]  = useState(false)
  const [notifications, setNotifs] = useState<Notif[]>([])
  const [unread,        setUnread] = useState(0)
  const [loading,       setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setNotifs(data.notifications ?? [])
      setUnread(data.unreadCount ?? 0)
    } catch {}
  }, [])

  // Initial fetch + 30-second polling
  useEffect(() => {
    fetchNotifs()
    const id = setInterval(fetchNotifs, POLL_MS)
    return () => clearInterval(id)
  }, [fetchNotifs])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function markAll() {
    setLoading(true)
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ all: true }),
      })
      await fetchNotifs()
    } finally {
      setLoading(false)
    }
  }

  async function markOne(id: string) {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    setUnread((c) => Math.max(0, c - 1))
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg btn-ghost"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span
            className="absolute top-0.5 right-0.5 min-w-[16px] h-4 rounded-full text-[10px] font-bold flex items-center justify-center px-0.5"
            style={{ background: 'var(--nf-accent)', color: '#0F172A' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-10 w-80 card shadow-2xl z-50 overflow-hidden"
          style={{ border: '1px solid var(--nf-border)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--nf-border)' }}
          >
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5" style={{ color: 'var(--nf-accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--nf-text)' }}>
                Notifications
              </span>
              {unread > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: 'var(--nf-accent)', color: '#0F172A' }}
                >
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAll}
                  disabled={loading}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                  style={{ color: 'var(--nf-muted)' }}
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded btn-ghost"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
            {notifications.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-10 gap-2"
                style={{ color: 'var(--nf-subtle)' }}
              >
                <Bell className="w-6 h-6 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_ICON[n.type] ?? TYPE_ICON.DEFAULT
                const isUnread = !n.readAt
                const ago = formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })

                const inner = (
                  <div
                    className="flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer"
                    style={{
                      background: isUnread ? 'var(--nf-surface-2)' : 'transparent',
                      borderBottom: '1px solid var(--nf-border)',
                    }}
                    onClick={() => {
                      if (isUnread) markOne(n.id)
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: cfg.bg }}
                    >
                      <FileText className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs font-semibold leading-snug"
                        style={{ color: 'var(--nf-text)' }}
                      >
                        {n.title}
                        {isUnread && (
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full ml-1.5 mb-0.5"
                            style={{ background: 'var(--nf-accent)' }}
                          />
                        )}
                      </p>
                      <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--nf-muted)' }}>
                        {n.message}
                      </p>
                      <p className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--nf-subtle)' }}>
                        <Clock className="w-3 h-3" />
                        {ago}
                      </p>
                    </div>
                  </div>
                )

                return n.leadId ? (
                  <Link key={n.id} href={`/leads/${n.leadId}`} onClick={() => setOpen(false)}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
