'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Workflow, Trash2 } from 'lucide-react'
import { api, WORKFLOW_CHANNELS } from '@/lib/api'
import type { Workflow as WorkflowType } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'

export default function WorkflowCard({ workflow }: { workflow: WorkflowType }) {
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

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2">
          <Workflow className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
          <div className="min-w-0">
            <CardTitle className="text-sm truncate">{workflow.name}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{new Date(workflow.createdAt).toLocaleDateString()}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3 flex-1 flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs font-normal">
          {workflow._count?.runs ?? 0} runs
        </Badge>
        {workflow.channel && (
          <Badge variant="outline" className="text-xs font-normal">
            📱 {WORKFLOW_CHANNELS.find((c) => c.value === workflow.channel)?.label ?? workflow.channel}
          </Badge>
        )}
      </CardContent>

      <Separator />

      <CardFooter className="pt-3 gap-2">
        <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
          <Link href={`/workflows/${workflow.id}`}>Open Builder</Link>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive ml-auto">
              <Trash2 className="size-3 mr-1" />
              Delete
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
      </CardFooter>
    </Card>
  )
}
