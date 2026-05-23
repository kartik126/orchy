import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages'
import { buildAgent } from './agentFactory'
import { prisma } from '../db/client'
import { logEmitter } from '../websocket/logEmitter'

export interface WorkflowInput {
  text?: string
  imageBase64?: string
  mimeType?: string
}

interface FlowNode {
  id: string
  data: { agentId: string; label?: string; role?: string }
}

interface FlowEdge {
  source: string
  target: string
}

function topoSort(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()

  for (const node of nodes) {
    inDegree.set(node.id, 0)
    adj.set(node.id, [])
  }

  for (const edge of edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue
    adj.get(edge.source)!.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  const queue = [...inDegree.entries()].filter(([, d]) => d === 0).map(([id]) => id)
  const sorted: FlowNode[] = []

  while (queue.length > 0) {
    const id = queue.shift()!
    sorted.push(nodeMap.get(id)!)
    for (const neighbor of adj.get(id) ?? []) {
      const deg = inDegree.get(neighbor)! - 1
      inDegree.set(neighbor, deg)
      if (deg === 0) queue.push(neighbor)
    }
  }

  return sorted
}

function extractTokens(messages: AIMessage[]): number {
  return messages.reduce((sum, msg) => {
    const meta = msg.usage_metadata
    if (!meta) return sum
    return sum + (meta.input_tokens ?? 0) + (meta.output_tokens ?? 0)
  }, 0)
}

export async function runWorkflow(runId: string, workflowId: string, input: WorkflowInput) {
  await prisma.workflowRun.update({ where: { id: runId }, data: { status: 'running' } })
  logEmitter.status(runId, 'running')

  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } })
  if (!workflow) throw new Error(`Workflow ${workflowId} not found`)

  const nodes = (workflow.nodes as unknown as FlowNode[]).filter((n) => n.data?.agentId)
  const edges = workflow.edges as unknown as FlowEdge[]

  if (nodes.length === 0) {
    await prisma.workflowRun.update({ where: { id: runId }, data: { status: 'failed', finishedAt: new Date() } })
    logEmitter.status(runId, 'failed')
    throw new Error('Workflow has no configured agent nodes. Add agents from the UI first.')
  }

  const sortedNodes = topoSort(nodes, edges)
  const stepOutputs: { agentName: string; output: string }[] = []
  let finalOutput = ''

  try {
    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i]
      const agentConfig = await prisma.agent.findUnique({ where: { id: node.data.agentId } })
      if (!agentConfig) throw new Error(`Agent ${node.data.agentId} not found`)

      const agentName = agentConfig.name
      const start = Date.now()

      await prisma.log.create({
        data: { runId, agentName, step: 'start', output: `Starting ${agentName}...` },
      })
      logEmitter.emit({ runId, agentName, step: 'start', message: `Starting ${agentName}...` })

      const agent = buildAgent(agentConfig)

      type ContentPart =
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }

      const parts: ContentPart[] = []

      if (i === 0 && input.imageBase64) {
        parts.push({
          type: 'image_url',
          image_url: { url: `data:${input.mimeType ?? 'image/jpeg'};base64,${input.imageBase64}` },
        })
      }

      let textContent: string
      if (i === 0) {
        textContent = input.text || (input.imageBase64 ? 'Process this image according to your instructions.' : '')
      } else {
        const history = stepOutputs
          .map((s) => `### ${s.agentName}\n${s.output}`)
          .join('\n\n')
        textContent = `Previous steps:\n\n${history}`
      }
      if (textContent) {
        parts.push({ type: 'text', text: textContent })
      }

      const messageContent: string | ContentPart[] =
        parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts

      let result
      try {
        result = await agent.invoke({
          messages: [new HumanMessage({ content: messageContent })],
        })
      } catch (err) {
        const latencyMs = Date.now() - start
        const errMsg = err instanceof Error ? err.message : String(err)
        await prisma.log.create({
          data: { runId, agentName, step: 'error', output: errMsg, latencyMs },
        })
        logEmitter.error(runId, agentName, err)
        throw err
      }

      const latencyMs = Date.now() - start
      const aiMessages = (result.messages as BaseMessage[]).filter(
        (m) => m instanceof AIMessage,
      ) as AIMessage[]
      const tokensUsed = extractTokens(aiMessages)
      const lastMsg = result.messages[result.messages.length - 1] as BaseMessage
      const output =
        typeof lastMsg.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg.content)

      const nextName =
        i < sortedNodes.length - 1 ? (sortedNodes[i + 1].data.label ?? 'next agent') : 'user'

      await prisma.message.create({
        data: { runId, fromAgent: agentName, toAgent: nextName, content: output, role: 'agent' },
      })
      await prisma.log.create({
        data: { runId, agentName, step: 'complete', output, latencyMs, tokensUsed },
      })
      logEmitter.emit({
        runId,
        agentName,
        step: 'complete',
        message: `${agentName} done`,
        latencyMs,
        tokensUsed,
      })

      stepOutputs.push({ agentName, output })
      finalOutput = output
    }
  } catch (err) {
    await prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'failed', finishedAt: new Date() },
    })
    logEmitter.status(runId, 'failed')
    throw err
  }

  await prisma.workflowRun.update({
    where: { id: runId },
    data: { status: 'completed', finishedAt: new Date() },
  })
  logEmitter.status(runId, 'completed')

  return { output: finalOutput }
}
