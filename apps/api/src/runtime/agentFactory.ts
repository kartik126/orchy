import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { SystemMessage } from '@langchain/core/messages'
import { getTools } from './toolRegistry'
import type { Agent } from '@prisma/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildAgent(agentConfig: Agent): { invoke: (input: any) => Promise<any> } {
  const llm = new ChatGoogleGenerativeAI({
    model: agentConfig.model,
    apiKey: process.env.GOOGLE_API_KEY,
  })

  const tools = getTools(agentConfig.tools)

  return createReactAgent({
    llm,
    tools,
    messageModifier: new SystemMessage(agentConfig.systemPrompt),
  })
}
