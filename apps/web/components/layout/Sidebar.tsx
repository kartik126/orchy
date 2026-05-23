'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, Workflow, MessageSquare, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const nav = [
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/workflows', label: 'Workflows', icon: Workflow },
  { href: '/conversations', label: 'Conversations', icon: MessageSquare },
  { href: '/logs', label: 'Live Logs', icon: Radio },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 fixed left-0 top-0 h-full bg-background border-r flex flex-col">
      <div className="px-4 py-5">
        <span className="text-lg tracking-tight" style={{ fontFamily: 'var(--font-cal)' }}>Orchy</span>
        <span className="ml-1.5 text-xs text-muted-foreground font-medium">AI</span>
      </div>
      <Separator />
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
      <Separator />
      <div className="px-4 py-3">
        <p className="text-muted-foreground text-xs">v0.1.0</p>
      </div>
    </aside>
  )
}
