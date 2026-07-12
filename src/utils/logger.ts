import { getCurrentUser } from './userContext';

export interface LogEntry {
  id: string;
  timestamp: Date;
  action: string;
  details?: string;
  userName?: string;
}

const LOGS_STORAGE_KEY = 'mantle-sync-logs';
const MAX_LOGS = 100;

export const addLog = (action: string, details?: string): void => {
  try {
    const logs = getLogsFromStorage();
    const userName = getCurrentUser() || 'Guest';
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      action,
      details,
      userName,
    };
    const updated = [newLog, ...logs].slice(0, MAX_LOGS);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to add log:', e);
  }
};

export const getLogsFromStorage = (): LogEntry[] => {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (!raw) return [];
    const logs = JSON.parse(raw, (_k, value) => {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        return new Date(value);
      }
      return value;
    }) as LogEntry[];
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    return [];
  }
};

export const clearLogs = (): void => {
  try {
    localStorage.removeItem(LOGS_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear logs:', e);
  }
};
