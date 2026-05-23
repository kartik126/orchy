import LogStream from '@/components/logs/LogStream'

export default function LogsPage() {
  return (
    <div className="h-screen flex flex-col">
      <div className="px-8 py-6 bg-background border-b shrink-0">
        <h1 className="text-xl font-semibold">Live Logs</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Real-time agent activity stream</p>
      </div>
      <div className="flex-1 overflow-hidden bg-background m-6 rounded-xl border">
        <LogStream />
      </div>
    </div>
  )
}
