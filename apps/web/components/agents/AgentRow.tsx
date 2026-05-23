'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Agent } from '@/lib/api'
import { TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'

export default function AgentRow({ agent }: { agent: Agent }) {
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
    <TableRow>
      <TableCell className="font-medium">{agent.name}</TableCell>
      <TableCell className="text-muted-foreground text-xs">{agent.role}</TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs font-normal">{agent.model}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {agent.tools.length === 0
            ? <span className="text-xs text-muted-foreground">—</span>
            : agent.tools.map((t) => (
              <Badge key={t} variant="outline" className="text-xs font-normal">{t}</Badge>
            ))}
        </div>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
          Active
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
            <Link href={`/agents/${agent.id}`}><Pencil className="size-3.5" /></Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
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
      </TableCell>
    </TableRow>
  )
}
