'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2, ExternalLink } from 'lucide-react'
import { api, WORKFLOW_CHANNELS } from '@/lib/api'
import type { Workflow } from '@/lib/api'
import { TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'

export default function WorkflowRow({ workflow }: { workflow: Workflow }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.workflows.delete(workflow.id)
      router.refresh()
    } catch {
      setDeleting(false)
    }
  }

  const channelLabel = WORKFLOW_CHANNELS.find((c) => c.value === workflow.channel)?.label ?? workflow.channel

  return (
    <TableRow>
      <TableCell className="font-medium">{workflow.name}</TableCell>
      <TableCell>
        {workflow.channel
          ? <Badge variant="secondary" className="text-xs font-normal">{channelLabel}</Badge>
          : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{workflow._count?.runs ?? 0}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(workflow.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs gap-1">
            <Link href={`/workflows/${workflow.id}`}>
              <ExternalLink className="size-3" />
              Open
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <span className="font-medium text-foreground">{workflow.name}</span> and all its runs. This action cannot be undone.
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
