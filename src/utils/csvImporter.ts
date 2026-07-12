import { Event } from '../types';

export interface CSVRow {
  [key: string]: string;
}

export const EVENT_COLUMNS = [
  'Title', 'Category', 'Start Date', 'End Date', 'Type', 'Description',
  'Requirements', 'Resources', 'Application Link', 'X Post Link',
  'Winner Criteria', 'Winner Announcement Date', 'Notion Link',
  'Reward Amount', 'Reward Currency', 'Default Delivery Date',
  'Realized Delivery Date', 'Reward Status', 'Tags', 'Is Favorite',
] as const;

const CATEGORY_VALUES: Event['category'][] = ['mantle', 'byreal', 'solana', 'meth', 'xeyit', 'other'];
const TYPE_VALUES: Event['type'][] = ['bounty', 'hackathon', 'news', 'campaign', 'featured'];
const STATUS_VALUES = ['pending', 'delayed', 'delivered'] as const;

const normalizeChoice = <T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T => {
  const normalized = (value || '').trim().toLowerCase() as T;
  return allowed.includes(normalized) ? normalized : fallback;
};

// Quote-aware CSV record parser: handles commas, escaped quotes, and
// newlines inside quoted fields (which line-based splitting corrupts).
const parseCSVRecords = (text: string): string[][] => {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (insideQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      insideQuotes = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      record.push(field);
      field = '';
      records.push(record);
      record = [];
    } else {
      field += char;
    }
  }

  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records;
};

export const parseCSV = (csvText: string): CSVRow[] => {
  const records = parseCSVRecords(csvText);
  if (records.length < 2) return [];

  const headers = records[0].map((h) => h.trim());

  return records
    .slice(1)
    .filter((values) => values.some((v) => v.trim() !== ''))
    .map((values) => {
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = (values[index] ?? '').trim();
      });
      return row;
    });
};

export const parseDate = (dateStr: string): Date => {
  if (!dateStr || !dateStr.trim()) return new Date();

  dateStr = dateStr.trim();

  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(dateStr + 'T00:00:00');
  }

  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const [month, day, year] = dateStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// Single row→Event mapping shared by the CSV and Excel importers.
// Category/Type are optional columns: absent in the simple import template,
// present in app exports so a round-trip preserves them.
export const rowToEvent = (row: CSVRow, index: number): Event => {
  const startDate = parseDate(row['Start Date']);
  const endDate = row['End Date'] ? parseDate(row['End Date']) : undefined;
  const rewardAmount = row['Reward Amount']?.trim();
  const defaultDeliveryDate = row['Default Delivery Date'] ? parseDate(row['Default Delivery Date']) : undefined;
  const realizedDeliveryDate = row['Realized Delivery Date'] ? parseDate(row['Realized Delivery Date']) : undefined;

  return {
    id: `imported-${Date.now()}-${index}`,
    title: row['Title'].trim() || 'Untitled Event',
    category: normalizeChoice(row['Category'], CATEGORY_VALUES, 'other'),
    type: normalizeChoice(row['Type'], TYPE_VALUES, 'news'),
    startDate,
    endDate,
    description: row['Description']?.trim() || '',
    requirements: row['Requirements']?.trim() || undefined,
    resources: row['Resources']?.trim() || undefined,
    applicationLink: row['Application Link']?.trim() || undefined,
    xPostLink: row['X Post Link']?.trim() || undefined,
    winnerCriteria: row['Winner Criteria']?.trim() || undefined,
    winnerAnnouncementDate: row['Winner Announcement Date']?.trim() ? parseDate(row['Winner Announcement Date']) : undefined,
    notionLink: row['Notion Link']?.trim() || undefined,
    rewards: rewardAmount && defaultDeliveryDate ? {
      amount: rewardAmount,
      currency: row['Reward Currency']?.trim() || 'MNT',
      defaultDeliveryDate,
      realizedDeliveryDate,
      status: normalizeChoice(row['Reward Status'], STATUS_VALUES, 'pending'),
    } : undefined,
    tags: row['Tags'] ? row['Tags'].split(';').map((t) => t.trim()).filter((t) => t) : [],
    isFavorite: row['Is Favorite']?.trim().toLowerCase() === 'true',
  };
};

export const csvToEvents = (rows: CSVRow[]): Event[] => {
  return rows
    .filter((row) => row['Title'] && row['Title'].trim())
    .map(rowToEvent);
};

const formatDateCell = (date: Date | undefined): string => {
  if (!date || isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
};

const escapeCell = (cell: string): string => {
  if (/[",\r\n]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
};

// Export counterpart of rowToEvent: same columns, same tag separator,
// so an exported file re-imports without losing data.
export const eventsToCSV = (events: Event[]): string => {
  const rows = events.map((event) => [
    event.title,
    event.category,
    formatDateCell(event.startDate),
    formatDateCell(event.endDate),
    event.type,
    event.description,
    event.requirements || '',
    event.resources || '',
    event.applicationLink || '',
    event.xPostLink || '',
    event.winnerCriteria || '',
    formatDateCell(event.winnerAnnouncementDate),
    event.notionLink || '',
    event.rewards?.amount || '',
    event.rewards?.currency || '',
    formatDateCell(event.rewards?.defaultDeliveryDate),
    formatDateCell(event.rewards?.realizedDeliveryDate),
    event.rewards?.status || '',
    event.tags.join(';'),
    event.isFavorite ? 'true' : 'false',
  ]);

  return [EVENT_COLUMNS.join(','), ...rows.map((row) => row.map(escapeCell).join(','))].join('\n');
};
