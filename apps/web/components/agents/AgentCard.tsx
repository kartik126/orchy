'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Agent } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'

export default function AgentCard({ agent }: { agent: Agent }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.agents.delete(agent.id)
      router.refresh()
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-background rounded-xl border p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
      {/* Top row: model badge + active status */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs font-normal">{agent.model}</Badge>
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
          <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
          Active
        </span>
      </div>

      {/* Name + role */}
      <div>
        <p className="text-base font-semibold leading-snug">{agent.name}</p>
        {agent.role && (
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">{agent.role}</p>
        )}
      </div>

      {/* Tools — flex-1 pushes actions to the bottom */}
      <div className="flex-1">
        {agent.tools.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {agent.tools.map((t) => (
              <Badge key={t} variant="outline" className="text-xs font-normal">{t}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1 border-t">
        <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs gap-1.5">
          <Link href={`/agents/${agent.id}`}>
            <Pencil className="size-3" />
            Edit
          </Link>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-destructive ml-auto">
              <Trash2 className="size-3" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete agent?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <span className="font-medium text-foreground">{agent.name}</span>. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
