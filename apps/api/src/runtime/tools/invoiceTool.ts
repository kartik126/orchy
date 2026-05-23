import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { google } from 'googleapis'
import { prisma } from '../../db/client'

function getAuthClient() {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_PATH
  if (!keyFile) throw new Error('GOOGLE_SERVICE_ACCOUNT_PATH env var is not set')
  return new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

// ─── log_invoice ─────────────────────────────────────────────────────────────
export class LogInvoiceTool extends StructuredTool {
  name = 'log_invoice'
  description =
    'Saves a processed invoice to the database and appends it to Google Sheets. Call this once per invoice after all validation steps.'

  schema = z.object({
    invoiceNumber: z.string().describe('Invoice number or ID'),
    vendor: z.string().describe('Vendor / supplier name'),
    invoiceDate: z.string().describe('Invoice date in YYYY-MM-DD'),
    dueDate: z.string().optional().describe('Due date in YYYY-MM-DD, if present'),
    description: z.string().optional().describe('Summary of goods or services'),
    subtotal: z.number().optional().describe('Subtotal before tax'),
    tax: z.number().optional().describe('Tax amount, 0 if none'),
    grandTotal: z.number().describe('Total amount due'),
    currency: z.string().describe('Currency code, e.g. USD, EUR, INR'),
    category: z.string().optional().describe('Expense category assigned by categorizer'),
    subcategory: z.string().optional().describe('Expense subcategory'),
    anomalyFlags: z.string().optional().describe('JSON string of anomaly flags, if any'),
  })

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) throw new Error('GOOGLE_SHEET_ID env var is not set')

    // Write to Postgres
    await prisma.invoice.create({
      data: {
        invoiceNumber: input.invoiceNumber,
        vendor: input.vendor,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate ?? null,
        description: input.description ?? null,
        subtotal: input.subtotal ?? null,
        tax: input.tax ?? null,
        grandTotal: input.grandTotal,
        currency: input.currency,
        category: input.category ?? null,
        subcategory: input.subcategory ?? null,
        paymentStatus: 'unpaid',
        anomalyFlags: input.anomalyFlags ? JSON.parse(input.anomalyFlags) : null,
      },
    })

    // Also append to Google Sheets for human visibility
    const auth = getAuthClient()
    const sheets = google.sheets({ version: 'v4', auth })
    const row = [
      new Date().toISOString(),
      input.invoiceNumber,
      input.invoiceDate,
      input.vendor,
      input.description ?? '',
      input.subtotal ?? '',
      input.tax ?? '',
      input.grandTotal,
      input.currency,
      input.category ?? '',
      input.subcategory ?? '',
      'unpaid',
    ]
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:L',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    })

    return `Invoice ${input.invoiceNumber} from ${input.vendor} (${input.grandTotal} ${input.currency}) saved to database and Google Sheets.`
  }
}

// ─── query_invoices ───────────────────────────────────────────────────────────
export class QueryInvoicesTool extends StructuredTool {
  name = 'query_invoices'
  description =
    'Queries the invoice database with optional filters. Fast — does not read Google Sheets. Use this for all invoice lookups, summaries, and reports.'

  schema = z.object({
    invoiceNumber: z.string().optional().describe('Exact invoice number to look up'),
    vendor: z.string().optional().describe('Filter by vendor name (partial match)'),
    paymentStatus: z.enum(['paid', 'unpaid', 'all']).optional().describe('Filter by payment status. Defaults to all.'),
    category: z.string().optional().describe('Filter by expense category'),
    month: z.string().optional().describe('Filter by month, e.g. "2025-01" or "January 2025"'),
    limit: z.number().optional().describe('Max rows to return. Defaults to 50.'),
  })

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (input.invoiceNumber) {
      where.invoiceNumber = { equals: input.invoiceNumber, mode: 'insensitive' }
    }
    if (input.vendor) {
      where.vendor = { contains: input.vendor, mode: 'insensitive' }
    }
    if (input.paymentStatus && input.paymentStatus !== 'all') {
      where.paymentStatus = input.paymentStatus
    }
    if (input.category) {
      where.category = { contains: input.category, mode: 'insensitive' }
    }
    if (input.month) {
      // Accept "2025-01" or "January 2025" — normalise to YYYY-MM prefix
      const monthMatch = input.month.match(/(\d{4})-(\d{2})/)
      const namedMatch = input.month.match(/(\w+)\s+(\d{4})/)
      if (monthMatch) {
        where.invoiceDate = { startsWith: `${monthMatch[1]}-${monthMatch[2]}` }
      } else if (namedMatch) {
        const months: Record<string, string> = {
          january: '01', february: '02', march: '03', april: '04',
          may: '05', june: '06', july: '07', august: '08',
          september: '09', october: '10', november: '11', december: '12',
        }
        const m = months[namedMatch[1].toLowerCase()]
        if (m) where.invoiceDate = { startsWith: `${namedMatch[2]}-${m}` }
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      take: input.limit ?? 50,
    })

    if (invoices.length === 0) return 'No invoices found matching your filters.'

    const lines = invoices.map((inv) =>
      `• ${inv.invoiceNumber} | ${inv.vendor} | ${inv.grandTotal} ${inv.currency} | ${inv.invoiceDate} | ${inv.paymentStatus}${inv.category ? ` | ${inv.category}` : ''}`,
    )
    return `Found ${invoices.length} invoice(s):\n${lines.join('\n')}`
  }
}

// ─── update_invoice ───────────────────────────────────────────────────────────
export class UpdateInvoiceTool extends StructuredTool {
  name = 'update_invoice'
  description =
    'Updates fields on an existing invoice in the database by invoice number. Use this to mark invoices as paid or update category.'

  schema = z.object({
    invoiceNumber: z.string().describe('The invoice number to update'),
    paymentStatus: z.string().optional().describe('New payment status, e.g. "paid" or "unpaid"'),
    category: z.string().optional().describe('Updated expense category'),
    subcategory: z.string().optional().describe('Updated expense subcategory'),
  })

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const invoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: { equals: input.invoiceNumber, mode: 'insensitive' } },
    })

    if (invoice) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {}
      if (input.paymentStatus) updateData.paymentStatus = input.paymentStatus
      if (input.category) updateData.category = input.category
      if (input.subcategory) updateData.subcategory = input.subcategory

      await prisma.invoice.update({ where: { id: invoice.id }, data: updateData })

      // Mirror the update to Google Sheets
      const sheetId = process.env.GOOGLE_SHEET_ID
      if (sheetId) {
        try {
          const auth = getAuthClient()
          const sheets = google.sheets({ version: 'v4', auth })
          const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Sheet1!A:L' })
          const rows = res.data.values ?? []
          const rowIndex = rows.findIndex((r) => r[1]?.toString().toLowerCase() === input.invoiceNumber.toLowerCase())
          if (rowIndex !== -1) {
            const sheetRow = rows[rowIndex]
            if (input.paymentStatus) sheetRow[11] = input.paymentStatus
            if (input.category) sheetRow[9] = input.category
            if (input.subcategory) sheetRow[10] = input.subcategory
            const gsheetRow = rowIndex + 1
            await sheets.spreadsheets.values.update({
              spreadsheetId: sheetId,
              range: `Sheet1!A${gsheetRow}:L${gsheetRow}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [sheetRow] },
            })
          }
        } catch {
          // Sheet sync failure is non-fatal — DB is already updated
        }
      }

      return `Invoice ${input.invoiceNumber} from ${invoice.vendor} updated: ${Object.entries(updateData).map(([k, v]) => `${k} → ${v}`).join(', ')}.`
    }

    // Fallback: try Google Sheets
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) return `Invoice ${input.invoiceNumber} not found in database.`

    const auth = getAuthClient()
    const sheets = google.sheets({ version: 'v4', auth })
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Sheet1!A:L' })
    const rows = res.data.values ?? []

    // Row layout: [logged_at, invoice_number, date, vendor, desc, subtotal, tax, total, currency, category, subcategory, payment_status]
    const rowIndex = rows.findIndex((r) => r[1]?.toString().toLowerCase() === input.invoiceNumber.toLowerCase())
    if (rowIndex === -1) return `Invoice ${input.invoiceNumber} not found in database or Google Sheets.`

    const sheetRow = rows[rowIndex]
    const updates: string[] = []

    if (input.paymentStatus) {
      sheetRow[11] = input.paymentStatus
      updates.push(`paymentStatus → ${input.paymentStatus}`)
    }
    if (input.category) {
      sheetRow[9] = input.category
      updates.push(`category → ${input.category}`)
    }
    if (input.subcategory) {
      sheetRow[10] = input.subcategory
      updates.push(`subcategory → ${input.subcategory}`)
    }

    const gsheetRow = rowIndex + 1 // 1-indexed
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Sheet1!A${gsheetRow}:L${gsheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [sheetRow] },
    })

    const vendor = sheetRow[3] ?? 'unknown vendor'
    return `Invoice ${input.invoiceNumber} from ${vendor} updated in Google Sheets: ${updates.join(', ')}.`
  }
}
