import cron from 'node-cron'
import { prisma } from './db/client'
import { runWorkflow } from './runtime/workflowExecutor'

export function startScheduler() {
  cron.schedule('* * * * *', async () => {
    const workflows = await prisma.workflow.findMany({
      where: { schedule: { not: null } },
    })

    for (const workflow of workflows) {
      if (!workflow.schedule) continue
      if (!cron.validate(workflow.schedule)) continue
      if (!matchesNow(workflow.schedule)) continue

      try {
        const run = await prisma.workflowRun.create({
          data: { workflowId: workflow.id, triggeredBy: 'schedule' },
        })
        runWorkflow(run.id, workflow.id, {
          text: workflow.scheduleMsg ?? 'Scheduled run triggered.',
        }).catch((err) => {
          console.error(`Scheduled run failed for workflow ${workflow.id}:`, err)
        })
      } catch (err) {
        console.error(`Failed to start scheduled run for workflow ${workflow.id}:`, err)
      }
    }
  })

  console.log('Scheduler running — checking cron workflows every minute')
}

function matchesNow(expression: string): boolean {
  try {
    const now = new Date()
    const parts = expression.trim().split(/\s+/)
    if (parts.length !== 5) return false
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
    const match = (field: string, val: number) =>
      field === '*' || field.split(',').includes(String(val))
    return (
      match(minute, now.getMinutes()) &&
      match(hour, now.getHours()) &&
      match(dayOfMonth, now.getDate()) &&
      match(month, now.getMonth() + 1) &&
      match(dayOfWeek, now.getDay())
    )
  } catch {
    return false
  }
}
