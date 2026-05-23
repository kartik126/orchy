import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { google } from 'googleapis'

function getAuthClient() {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_PATH
  if (!keyFile) throw new Error('GOOGLE_SERVICE_ACCOUNT_PATH env var is not set')
  return new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

export class ReadGoogleSheetTool extends StructuredTool {
  name = 'google_sheets_read'
  description =
    'Reads rows from a Google Sheet and returns them as a table. Use this to fetch existing data before making decisions.'

  schema = z.object({
    range: z
      .string()
      .optional()
      .describe('A1 notation range to read, e.g. "Sheet1!A:I" or "Sheet1!A1:D10". Defaults to Sheet1!A:Z.'),
  })

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) throw new Error('GOOGLE_SHEET_ID env var is not set')

    const auth = getAuthClient()
    const sheets = google.sheets({ version: 'v4', auth })

    const range = input.range ?? 'Sheet1!A:Z'
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    })

    const rows = res.data.values
    if (!rows || rows.length === 0) return 'The sheet is empty.'

    return rows.map((row) => row.join('\t')).join('\n')
  }
}

export class AppendInvoiceRowTool extends StructuredTool {
  name = 'append_invoice_row'
  description = 'Appends a single invoice record as a new row in Google Sheets. Call this once per invoice after extraction.'

  schema = z.object({
    invoice_number: z.string().describe('Invoice number or ID'),
    date: z.string().describe('Invoice date'),
    vendor_name: z.string().describe('Name of the vendor / supplier'),
    description: z.string().describe('Summary of goods or services'),
    subtotal: z.string().describe('Subtotal before tax'),
    tax: z.string().describe('Tax amount, empty string if none'),
    total: z.string().describe('Total amount due'),
    currency: z.string().describe('Currency code, e.g. USD, INR'),
  })

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) throw new Error('GOOGLE_SHEET_ID env var is not set')

    const auth = getAuthClient()
    const sheets = google.sheets({ version: 'v4', auth })

    const row = [
      new Date().toISOString(),
      input.invoice_number,
      input.date,
      input.vendor_name,
      input.description,
      input.subtotal,
      input.tax,
      input.total,
      input.currency,
    ]

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    })

    return `Row appended to Google Sheet: ${input.vendor_name} | ${input.total} ${input.currency}`
  }
}
