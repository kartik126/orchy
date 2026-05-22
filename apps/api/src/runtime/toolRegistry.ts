export const TOOL_REGISTRY: Record<string, { name: string; description: string }> = {
  web_search: { name: 'web_search', description: 'Search the web for current information' },
  calculator: { name: 'calculator', description: 'Perform mathematical calculations' },
}

export function getToolNames(): string[] {
  return Object.keys(TOOL_REGISTRY)
}
