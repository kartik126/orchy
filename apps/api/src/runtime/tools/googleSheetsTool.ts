import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { google } from 'googleapis'

// Column layout (0-indexed):
// A(0): Invoice No. | B(1): Company Name | C(2): Invoice Date | D(3): Description
// E(4): Amount | F(5): Currency | G(6): Category | H(7): Sub-category | I(8): Status

const HEADERS = ['Invoice No.', 'Company Name', 'Invoice Date', 'Description', 'Amount', 'Currency', 'Category', 'Sub-category', 'Status']

function getAuthClient() {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_PATH
  if (!keyFile) throw new Error('GOOGLE_SERVICE_ACCOUNT_PATH env var is not set')
  return new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

async function ensureHeaders(sheets: ReturnType<typeof google.sheets>, sheetId: string) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Sheet1!A1:I1' })
  const firstRow = res.data.values?.[0] ?? []
  if (firstRow[0] !== 'Invoice No.') {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Sheet1!A1:I1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADERS] },
    })
  }
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
    date: z.string().describe('Invoice date in YYYY-MM-DD'),
    vendor_name: z.string().describe('Name of the vendor / supplier'),
    description: z.string().describe('Summary of goods or services'),
    total: z.string().describe('Total amount due (grand total)'),
    currency: z.string().describe('Currency code, e.g. USD, INR'),
    category: z.string().optional().describe('Expense category'),
    subcategory: z.string().optional().describe('Expense sub-category'),
  })

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) throw new Error('GOOGLE_SHEET_ID env var is not set')

    const auth = getAuthClient()
    const sheets = google.sheets({ version: 'v4', auth })
    await ensureHeaders(sheets, sheetId)

    const row = [
      input.invoice_number,
      input.vendor_name,
      input.date,
      input.description,
      input.total,
      input.currency,
      input.category ?? '',
      input.subcategory ?? '',
      'unpaid',
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

export class UpdateGoogleSheetTool extends StructuredTool {
  name = 'google_sheets_update'
  description =
    'Updates specific cells or a row in Google Sheets using A1 notation. Use this to edit existing data (e.g. mark an invoice as paid, correct a value).'

  schema = z.object({
    range: z
      .string()
      .describe(
        'A1 notation range to update, e.g. "Sheet1!B5" for a single cell or "Sheet1!A2:I2" for a full row.',
      ),
    values: z
      .array(z.array(z.string()))
      .describe(
        'A 2D array of values to write. Each inner array is one row. Example: [["paid", "2025-01-15"]] updates two cells in one row.',
      ),
  })

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const sheetId = process.env.GOOGLE_SHEET_ID
    if (!sheetId) throw new Error('GOOGLE_SHEET_ID env var is not set')

    const auth = getAuthClient()
    const sheets = google.sheets({ version: 'v4', auth })

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: input.range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: input.values },
    })

    return `Updated ${input.range} in Google Sheet.`
  }
}
