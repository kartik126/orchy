import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { MemorySaver } from '@langchain/langgraph'
import { SystemMessage, trimMessages } from '@langchain/core/messages'
import { getTools } from './toolRegistry'

export type AgentConfig = {
  id: string
  name: string
  role: string
  systemPrompt: string
  model: string
  tools: string[]
  memoryType: string
  memoryWindow: number
  guardrails: unknown
  channelId: string | null
  createdAt: Date
  updatedAt: Date
}

type Guardrails = {
  maxTokens?: number
  bannedTopics?: string
  tone?: string
}

// One global checkpointer shared across all agents — keyed by thread_id internally
const checkpointer = new MemorySaver()

function buildSystemPrompt(agentConfig: AgentConfig): string {
  const guardrails = (agentConfig.guardrails ?? {}) as Guardrails
  const today = new Date().toISOString().split('T')[0]
  const lines: string[] = [`Today's date is ${today}.`, agentConfig.systemPrompt]

  if (guardrails.tone) {
    lines.push(`\nTone rule: ${guardrails.tone}`)
  }

  if (guardrails.bannedTopics) {
    const topics = guardrails.bannedTopics.split(',').map((t) => t.trim()).filter(Boolean)
    if (topics.length > 0) {
      lines.push(`\nYou must refuse to discuss the following topics: ${topics.join(', ')}. If asked, politely decline and stay on task.`)
    }
  }

  return lines.join('\n')
}

export function buildAgent(
  agentConfig: AgentConfig,
  options?: { threadId?: string },
) {
  const guardrails = (agentConfig.guardrails ?? {}) as Guardrails
  const memoryType = agentConfig.memoryType ?? 'buffer'
  const memoryWindow = agentConfig.memoryWindow ?? 10
  const useMemory = memoryType !== 'none'

  // Unique thread per agent per context (Telegram chat or workflow)
  const threadId = options?.threadId
    ? `${agentConfig.id}:${options.threadId}`
    : `${agentConfig.id}:default`

  const llm = new ChatGoogleGenerativeAI({
    model: agentConfig.model,
    apiKey: process.env.GOOGLE_API_KEY,
    ...(guardrails.maxTokens ? { maxOutputTokens: guardrails.maxTokens } : {}),
  })

  const tools = getTools(agentConfig.tools)
  const systemPrompt = buildSystemPrompt(agentConfig)

  const agent = createReactAgent({
    llm,
    tools,
    checkpointer: useMemory ? checkpointer : undefined,
    messageModifier: async (messages) => {
      const system = new SystemMessage(systemPrompt)
      if (!useMemory || messages.length === 0) return [system, ...messages]
      // Trim to last memoryWindow human+AI exchanges to stay within context limits
      const trimmed = await trimMessages(messages, {
        maxTokens: memoryWindow * 2,
        tokenCounter: (msgs) => msgs.length,
        strategy: 'last',
        includeSystem: false,
        allowPartial: false,
        startOn: 'human',
      })
      return [system, ...trimmed]
    },
  })

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invoke: (input: any) =>
      agent.invoke(input, { configurable: { thread_id: threadId } }),
  }
}
