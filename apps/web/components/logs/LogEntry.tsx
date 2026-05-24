import type { LogEntry as LogEntryType } from '@/hooks/useLogStream'
import { Badge } from '@/components/ui/badge'

export default function LogEntry({ entry }: { entry: LogEntryType }) {
  const { agentName, step, message, latencyMs, tokensUsed, error, timestamp } = entry.payload
  const time = new Date(timestamp).toLocaleTimeString()
  const isError = step === 'error'

  const stepVariant =
    isError ? 'destructive' :
    step === 'complete' ? 'success' :
    step === 'start' ? 'warning' :
    'secondary'

  return (
    <div className={`flex gap-3 py-2.5 border-b last:border-0 min-w-0 ${isError ? 'bg-destructive/5' : ''}`}>
      <span className="text-muted-foreground text-xs font-mono w-20 shrink-0 pt-0.5">{time}</span>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold ${isError ? 'text-destructive' : 'text-foreground'}`}>
            {agentName}
          </span>
          <Badge variant={stepVariant} className="text-xs px-1.5 py-0">{step}</Badge>
          {latencyMs && (
            <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0">{latencyMs}ms</Badge>
          )}
          {tokensUsed && (
            <Badge variant="outline" className="text-xs font-normal px-1.5 py-0">{tokensUsed} tokens</Badge>
          )}
          {tokensUsed && (
            <span className="text-xs text-muted-foreground">${(tokensUsed * 0.000001).toFixed(5)}</span>
          )}
        </div>
        <p className={`text-xs mt-1 break-words ${isError ? 'text-destructive whitespace-pre-wrap' : 'text-muted-foreground'}`}>
          {message}
        </p>
        {error && error !== message && (
          <p className="text-xs text-destructive mt-0.5 font-mono break-words">{error}</p>
        )}
      </div>
    </div>
  )
}
