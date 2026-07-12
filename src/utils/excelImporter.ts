import * as XLSX from 'xlsx';
import { Event } from '../types';
import { CSVRow, csvToEvents } from './csvImporter';

export interface ExcelRow {
  [key: string]: string | number | undefined;
}

const DATE_COLUMNS = new Set([
  'Start Date', 'End Date', 'Winner Announcement Date',
  'Default Delivery Date', 'Realized Delivery Date',
]);

// Excel serial → 'YYYY-MM-DD' via UTC components, so the calendar day
// survives regardless of the local timezone.
const excelSerialToDateString = (serial: number): string => {
  const utc = new Date(Math.round((serial - 25569) * 86400 * 1000));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseExcel = (fileContent: ArrayBuffer): ExcelRow[] => {
  const workbook = XLSX.read(fileContent, { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
};

// Normalize Excel cells to strings, then reuse the CSV importer's
// shared row→Event mapping so both formats import identically.
export const excelToEvents = (rows: ExcelRow[]): Event[] => {
  const stringRows: CSVRow[] = rows.map((row) => {
    const out: CSVRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === undefined || value === null) {
        out[key] = '';
      } else if (typeof value === 'number' && DATE_COLUMNS.has(key) && value > 0 && value < 100000) {
        out[key] = excelSerialToDateString(value);
      } else {
        out[key] = String(value);
      }
    }
    return out;
  });

  return csvToEvents(stringRows);
};
