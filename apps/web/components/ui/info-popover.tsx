'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type InfoPopoverProps = {
  children: ReactNode
  side?: 'top' | 'bottom'
  className?: string
  panelClassName?: string
}

export function InfoPopover({ children, side = 'bottom', className, panelClassName }: InfoPopoverProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-full p-0.5 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">More information</span>
      </button>

      <div
        id={id}
        role="tooltip"
        className={cn(
          'absolute left-1/2 z-50 w-56 -translate-x-1/2 rounded-md border border-slate-200 bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-lg transition-all duration-150',
          panelClassName,
          side === 'top' ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top',
          open
            ? 'pointer-events-auto scale-100 opacity-100'
            : 'pointer-events-none scale-95 opacity-0',
        )}
      >
        {children}
        <span
          className={cn(
            'absolute left-1/2 size-2 -translate-x-1/2 rotate-45 border border-slate-200 bg-popover',
            side === 'top' ? 'top-full -mt-1 border-t-0 border-l-0' : 'bottom-full -mb-1 border-b-0 border-r-0',
          )}
          aria-hidden
        />
      </div>
    </div>
  )
}
