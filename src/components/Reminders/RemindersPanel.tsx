import React, { useEffect, useState } from 'react';
import { CalendarReminder } from '../../types';
import { startOfDay } from '../../utils/dateHelpers';
import {
  RECURRING_REMINDERS,
  REMINDER_COLOR,
  daysUntilLabel,
  nextOccurrence,
} from '../../constants/reminders';

interface RemindersPanelProps {
  savedReminders: CalendarReminder[];
  onDeleteSaved: (id: string) => void;
}

const formatDay = (date: Date): string =>
  date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

const RemindersPanel: React.FC<RemindersPanelProps> = ({ savedReminders, onDeleteSaved }) => {
  // Re-read the clock each minute so "Today" rolls over at midnight while the
  // tray sits open.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const today = startOfDay(now);
  const upcomingSaved = savedReminders
    .filter((r) => startOfDay(new Date(r.date)) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-2">
      {RECURRING_REMINDERS.map((reminder) => {
        const next = nextOccurrence(reminder, today);
        const due = daysUntilLabel(next.date, today);
        const isToday = due === 'Today';
        return (
          <div
            key={reminder.id}
            className="p-3 rounded-lg border transition-all"
            style={{
              background: isToday ? `${REMINDER_COLOR}26` : 'rgba(255,255,255,0.04)',
              borderColor: isToday ? REMINDER_COLOR : `${REMINDER_COLOR}40`,
            }}
          >
            <div className="flex items-start gap-2">
              <span className="text-base leading-5" aria-hidden="true">{reminder.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white">{reminder.title}</div>
                <div className="text-[11px] text-[#7FD4D0] opacity-70">{reminder.schedule}</div>
                <div className="mt-1.5 flex items-center gap-2 text-xs">
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold ${isToday ? 'animate-pulse' : ''}`}
                    style={{
                      background: isToday ? REMINDER_COLOR : `${REMINDER_COLOR}26`,
                      color: isToday ? '#050D20' : REMINDER_COLOR,
                    }}
                  >
                    {due}
                  </span>
                  <span className="text-[#7FD4D0] opacity-80">{formatDay(next.date)}</span>
                </div>
                {next.detail && (
                  <div className="text-[11px] text-[#7FD4D0] opacity-60 mt-0.5">{next.detail}</div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Reminders people added on the old calendar; still shown until their
          day has passed, and removable here. New ones are not created any more. */}
      {upcomingSaved.length > 0 && (
        <div className="pt-2">
          <div className="text-[10px] uppercase tracking-wider text-[#7FD4D0] opacity-50 mb-1">
            Your saved reminders
          </div>
          {upcomingSaved.map((r) => (
            <div key={r.id} className="flex items-center gap-2 py-1 text-xs">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: REMINDER_COLOR }} />
              <span className="text-[#7FD4D0] opacity-70 whitespace-nowrap">{formatDay(new Date(r.date))}</span>
              <span className="text-white truncate flex-1">{r.title}</span>
              <button
                onClick={() => onDeleteSaved(r.id)}
                className="w-6 h-6 flex items-center justify-center rounded text-[#65B3AE] hover:bg-[rgba(101,179,174,0.15)]"
                title="Remove this reminder"
                aria-label={`Remove reminder ${r.title}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RemindersPanel;
