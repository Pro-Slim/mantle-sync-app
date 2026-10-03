import React, { useEffect, useState } from 'react';
import { CalendarReminder } from '../../types';
import { startOfDay } from '../../utils/dateHelpers';
import {
  REMINDER_COLOR,
  REMINDER_ICONS,
  RecurringReminder,
  WEEKDAY_OPTIONS,
  daysUntilLabel,
  nextOccurrence,
  scheduleText,
} from '../../constants/reminders';
import { ReminderFields, useRecurringReminderStore } from '../../stores/recurringReminderStore';

interface RemindersPanelProps {
  // Re-read the shared list each time the tray opens, so a reminder another
  // steward added since shows up without a reload.
  open: boolean;
  savedReminders: CalendarReminder[];
  onDeleteSaved: (id: string) => void;
}

const formatDay = (date: Date): string =>
  date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

const EMPTY_DRAFT: ReminderFields = {
  title: '',
  icon: '🔔',
  repeat: 'weekly',
  weekday: 5,
  monthDay: 30,
  aboutPreviousMonth: false,
};

const inputClass =
  'w-full bg-[rgba(101,179,174,0.1)] border border-[rgba(101,179,174,0.3)] rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-[rgba(101,179,174,0.45)] focus:outline-none focus:border-[#65B3AE]';

interface ReminderFormProps {
  initial: ReminderFields;
  submitLabel: string;
  onSubmit: (fields: ReminderFields) => Promise<boolean>;
  onCancel: () => void;
}

const ReminderForm: React.FC<ReminderFormProps> = ({ initial, submitLabel, onSubmit, onCancel }) => {
  const [draft, setDraft] = useState<ReminderFields>(initial);
  const [busy, setBusy] = useState(false);
  const patch = (fields: Partial<ReminderFields>) => setDraft((d) => ({ ...d, ...fields }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setBusy(true);
    const ok = await onSubmit(draft);
    setBusy(false);
    if (ok) onCancel();
  };

  const monthDay = draft.monthDay ?? 30;

  return (
    <form
      onSubmit={submit}
      className="p-3 rounded-lg border space-y-2"
      style={{ borderColor: `${REMINDER_COLOR}66`, background: `${REMINDER_COLOR}0F` }}
    >
      <input
        className={inputClass}
        value={draft.title}
        onChange={(e) => patch({ title: e.target.value })}
        placeholder="What to do, e.g. Weekly Steward Report"
        maxLength={80}
        autoFocus
      />

      <div className="flex gap-1 p-0.5 rounded-lg bg-[rgba(101,179,174,0.08)]">
        {(['weekly', 'monthly'] as const).map((repeat) => (
          <button
            key={repeat}
            type="button"
            onClick={() =>
              patch({
                repeat,
                weekday: draft.weekday ?? 5,
                monthDay: draft.monthDay ?? 30,
              })
            }
            className={`flex-1 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
              draft.repeat === repeat
                ? 'bg-[#65B3AE] text-[#050D20]'
                : 'text-[#7FD4D0] hover:bg-[rgba(101,179,174,0.15)]'
            }`}
          >
            {repeat === 'weekly' ? 'Every week' : 'Every month'}
          </button>
        ))}
      </div>

      {draft.repeat === 'weekly' ? (
        <label className="flex items-center gap-2 text-xs text-[#7FD4D0]">
          On
          <select
            className={inputClass}
            value={draft.weekday ?? 5}
            onChange={(e) => patch({ weekday: Number(e.target.value) })}
          >
            {WEEKDAY_OPTIONS.map((d) => (
              <option key={d.value} value={d.value} className="bg-[#0A1628]">
                {d.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <label className="flex items-center gap-2 text-xs text-[#7FD4D0] whitespace-nowrap">
            On day
            <select
              className={inputClass}
              value={monthDay}
              onChange={(e) => patch({ monthDay: Number(e.target.value) })}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day} className="bg-[#0A1628]">
                  {day}
                </option>
              ))}
            </select>
          </label>
          {monthDay > 28 && (
            <p className="text-[10px] text-[#7FD4D0] opacity-60">
              In a month too short for day {monthDay}, it falls on the last day.
            </p>
          )}
          <label className="flex items-center gap-2 text-xs text-[#7FD4D0] cursor-pointer">
            <input
              type="checkbox"
              checked={draft.aboutPreviousMonth}
              onChange={(e) => patch({ aboutPreviousMonth: e.target.checked })}
              className="accent-[#F472B6]"
            />
            For the previous month (shows e.g. &ldquo;for September&rdquo;)
          </label>
        </>
      )}

      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Icon">
        {REMINDER_ICONS.map((icon) => (
          <button
            key={icon}
            type="button"
            role="radio"
            aria-checked={draft.icon === icon}
            onClick={() => patch({ icon })}
            className="w-8 h-8 rounded-md text-base transition-all"
            style={{
              background: draft.icon === icon ? `${REMINDER_COLOR}33` : 'transparent',
              border: `1px solid ${draft.icon === icon ? REMINDER_COLOR : 'transparent'}`,
            }}
          >
            {icon}
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || !draft.title.trim()}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#65B3AE] text-[#050D20] hover:brightness-110 disabled:opacity-50"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
};

const RemindersPanel: React.FC<RemindersPanelProps> = ({ open, savedReminders, onDeleteSaved }) => {
  const { reminders, loaded, error, fetchReminders, addReminder, updateReminder, deleteReminder, clearError } =
    useRecurringReminderStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Re-read the clock each minute so "Today" rolls over at midnight while the
  // tray sits open.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (open) void fetchReminders();
  }, [open, fetchReminders]);

  const today = startOfDay(now);
  const upcomingSaved = savedReminders
    .filter((r) => startOfDay(new Date(r.date)) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const remove = (r: RecurringReminder) => {
    if (!confirm(`Remove "${r.title}" for every steward?`)) return;
    void deleteReminder(r.id);
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-xs text-red-200 flex justify-between gap-2">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-200" aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {reminders.length === 0 && loaded && !adding && (
        <p className="text-xs text-[#7FD4D0] opacity-60 px-1">No reminders yet. Add the first one below.</p>
      )}

      {reminders.map((reminder) => {
        if (editingId === reminder.id) {
          return (
            <ReminderForm
              key={reminder.id}
              initial={reminder}
              submitLabel="Save"
              onSubmit={(fields) => updateReminder(reminder.id, fields)}
              onCancel={() => setEditingId(null)}
            />
          );
        }
        const next = nextOccurrence(reminder, today);
        const due = next ? daysUntilLabel(next.date, today) : '—';
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
                <div className="text-sm font-bold text-white break-words">{reminder.title}</div>
                <div className="text-[11px] text-[#7FD4D0] opacity-70">{scheduleText(reminder)}</div>
                {next && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs flex-wrap">
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
                )}
                {next?.detail && (
                  <div className="text-[11px] text-[#7FD4D0] opacity-60 mt-0.5">For {next.detail}</div>
                )}
              </div>
              {/* Editing waits for the shared list: the built-in defaults shown
                  before it loads have no row to save to. */}
              {loaded && (
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => {
                      setAdding(false);
                      setEditingId(reminder.id);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded text-[#65B3AE] hover:bg-[rgba(101,179,174,0.15)]"
                    title="Edit this reminder"
                    aria-label={`Edit ${reminder.title}`}
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => remove(reminder)}
                    className="w-7 h-7 flex items-center justify-center rounded text-[#65B3AE] hover:bg-[rgba(239,68,68,0.2)] hover:text-red-300"
                    title="Remove this reminder for everyone"
                    aria-label={`Remove ${reminder.title}`}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {adding ? (
        <ReminderForm
          initial={EMPTY_DRAFT}
          submitLabel="Add reminder"
          onSubmit={addReminder}
          onCancel={() => setAdding(false)}
        />
      ) : (
        loaded && (
          <button
            onClick={() => {
              setEditingId(null);
              setAdding(true);
            }}
            className="w-full px-3 py-2 rounded-lg border border-dashed text-xs font-semibold transition-all hover:brightness-125"
            style={{ borderColor: `${REMINDER_COLOR}80`, color: REMINDER_COLOR }}
          >
            + Add reminder
          </button>
        )
      )}
      {loaded && (
        <p className="text-[10px] text-[#7FD4D0] opacity-40 px-1">
          Shared with every steward: changes here show for everyone.
        </p>
      )}

      {/* Reminders people added on the old calendar; still shown until their
          day has passed, and removable here. */}
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
