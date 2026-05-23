import LogStream from '@/components/logs/LogStream'
import { Separator } from '@/components/ui/separator'

export default function LogsPage() {
  return (
    <div className="h-screen flex flex-col">
      <div className="px-8 py-6">
        <h1 className="text-2xl font-bold">Live Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time agent activity stream</p>
      </div>
      <Separator />
      <div className="flex-1 overflow-hidden">
        <LogStream />
      </div>
    </div>
  )
}
