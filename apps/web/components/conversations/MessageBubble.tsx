import type { Message } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import MarkdownContent from './MarkdownContent'

export default function MessageBubble({ message }: { message: Message }) {
  const isHuman = message.role === 'human'
  const isAgentToAgent = message.role === 'agent' && message.toAgent !== 'user'

  return (
    <div className={`flex flex-col gap-1 ${isHuman ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{message.fromAgent}</span>
        <span>→</span>
        <span className="font-medium text-foreground">{message.toAgent}</span>
        {isAgentToAgent && <Badge variant="warning" className="text-xs">agent→agent</Badge>}
      </div>
      <div
        className={`max-w-2xl px-4 py-3 rounded-xl text-sm leading-relaxed ${
          isHuman
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : isAgentToAgent
            ? 'bg-amber-50 border border-amber-200 text-foreground rounded-tl-sm'
            : 'bg-card border text-foreground rounded-tl-sm'
        }`}
      >
        {isHuman ? <span>{message.content}</span> : <MarkdownContent content={message.content} />}
      </div>
      <span className="text-xs text-muted-foreground">
        {new Date(message.createdAt).toLocaleTimeString()}
      </span>
    </div>
  )
}
