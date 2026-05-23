import { TavilySearch } from '@langchain/tavily'
import { Calculator } from '@langchain/community/tools/calculator'
import { StructuredTool } from '@langchain/core/tools'
import { AppendInvoiceRowTool, ReadGoogleSheetTool, UpdateGoogleSheetTool } from './tools/googleSheetsTool'

export const TOOL_REGISTRY: Record<string, StructuredTool> = {
  web_search: new TavilySearch({ maxResults: 5 }),
  calculator: new Calculator(),
  google_sheets: new AppendInvoiceRowTool(),
  google_sheets_read: new ReadGoogleSheetTool(),
  google_sheets_update: new UpdateGoogleSheetTool(),
}

export function getTools(names: string[]): StructuredTool[] {
  return names.filter((n) => TOOL_REGISTRY[n]).map((n) => TOOL_REGISTRY[n])
}

export function getToolNames(): string[] {
  return Object.keys(TOOL_REGISTRY)
}
