'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, Workflow, MessageSquare, Radio, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/workflows', label: 'Workflows', icon: Workflow },
  { href: '/conversations', label: 'Conversations', icon: MessageSquare },
  { href: '/logs', label: 'Live Logs', icon: Radio },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 fixed left-0 top-0 h-full bg-muted/60 border-r flex flex-col">
      <div className="px-4 py-4 flex items-center gap-1">
        <div className="flex items-center justify-center size-7 rounded-md bg-primary text-primary-foreground shrink-0">
          <img src={"/logo.png"} className="h-6 w-6"/>
        </div>
        <span className="text-sm font-semibold tracking-tight" style={{ fontFamily: 'var(--font-cal)' }}>
          Orchy
        </span>
        <span className="text-xs text-muted-foreground font-medium">AI</span>
      </div>

      <div className="px-3 pb-2">
        <p className="px-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
          Platform
        </p>
        <nav className="space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-border',
                )}
              >
                <Icon className={cn('size-4 shrink-0', active ? 'text-primary-foreground' : 'text-muted-foreground')} />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto px-4 py-4 border-t">
        <p className="text-[11px] text-muted-foreground">v0.1.0</p>
      </div>
    </aside>
  )
}
