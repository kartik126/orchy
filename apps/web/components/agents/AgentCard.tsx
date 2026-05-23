'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Agent } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm truncate">{agent.name}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{agent.role}</CardDescription>
          </div>
          <Badge variant="success" className="shrink-0 text-xs">Active</Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3 flex-1">
        <p className="text-muted-foreground text-xs line-clamp-2 mb-3">{agent.systemPrompt}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs font-normal">{agent.model}</Badge>
          {agent.tools.map((t) => (
            <Badge key={t} variant="outline" className="text-xs font-normal">{t}</Badge>
          ))}
        </div>
      </CardContent>

      <Separator />

      <CardFooter className="pt-3 gap-2">
        <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
          <Link href={`/agents/${agent.id}`}>
            <Pencil className="size-3 mr-1" />
            Edit
          </Link>
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
      </CardFooter>
    </Card>
  )
}
