import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { addDays, formatWeekRange, startOfWeek } from '../../utils/dateHelpers';

interface WeeklyFocusPanelProps {
  // Re-read whenever the tray opens, so a note another steward wrote since
  // is what you see rather than a stale copy.
  open: boolean;
}

type SaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

interface FocusRow {
  body: string;
  updated_at: string | null;
  updated_by_email: string | null;
}

const SAVE_DELAY_MS = 800;

const weekKey = (monday: Date): string =>
  `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

const WeeklyFocusPanel: React.FC<WeeklyFocusPanelProps> = ({ open }) => {
  const [monday, setMonday] = useState(() => startOfWeek(new Date()));
  const [body, setBody] = useState('');
  const [meta, setMeta] = useState<Omit<FocusRow, 'body'> | null>(null);
  const [state, setState] = useState<SaveState>('idle');
  const saveTimer = useRef<number>();
  const dirty = useRef(false);
  const latest = useRef({ key: weekKey(monday), body: '' });

  const thisMonday = startOfWeek(new Date());
  const isThisWeek = weekKey(monday) === weekKey(thisMonday);

  const save = useCallback(async () => {
    window.clearTimeout(saveTimer.current);
    if (!dirty.current) return;
    dirty.current = false;
    const { key, body: text } = latest.current;
    setState('saving');
    const { data, error } = await supabase
      .from('weekly_focus')
      .upsert({ week_start: key, body: text }, { onConflict: 'week_start' })
      .select('updated_at, updated_by_email')
      .single();
    if (error) {
      dirty.current = true;
      setState('error');
      return;
    }
    if (latest.current.key === key) {
      setMeta(data as Omit<FocusRow, 'body'>);
      setState('saved');
    }
  }, []);

  // Load the week being looked at; anything still unsaved for the previous
  // week is written first so stepping weeks never drops a note.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const key = weekKey(monday);
    (async () => {
      await save();
      if (cancelled) return;
      latest.current = { key, body: '' };
      setState('loading');
      const { data, error } = await supabase
        .from('weekly_focus')
        .select('body, updated_at, updated_by_email')
        .eq('week_start', key)
        .maybeSingle();
      if (cancelled || latest.current.key !== key) return;
      if (error) {
        setState('error');
        return;
      }
      const row = data as FocusRow | null;
      latest.current = { key, body: row?.body ?? '' };
      setBody(row?.body ?? '');
      setMeta(row ? { updated_at: row.updated_at, updated_by_email: row.updated_by_email } : null);
      setState('idle');
    })();
    return () => {
      cancelled = true;
    };
  }, [monday, open, save]);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const onChange = (text: string) => {
    setBody(text);
    latest.current = { ...latest.current, body: text };
    dirty.current = true;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void save(), SAVE_DELAY_MS);
  };

  const status =
    state === 'loading'
      ? 'Loading…'
      : state === 'saving'
        ? 'Saving…'
        : state === 'error'
          ? 'Could not save — check your connection; it retries on your next edit'
          : meta?.updated_at
            ? `${state === 'saved' ? 'Saved' : 'Last edited'}${
                meta.updated_by_email ? ` by ${meta.updated_by_email.split('@')[0]}` : ''
              } · ${new Date(meta.updated_at).toLocaleString('en-US', {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : 'Nothing written for this week yet';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          onClick={() => setMonday(addDays(monday, -7))}
          className="w-7 h-7 rounded-md text-[#65B3AE] font-bold hover:bg-[rgba(101,179,174,0.15)]"
          title="Previous week"
          aria-label="Previous week"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold text-white">{formatWeekRange(monday, addDays(monday, 6))}</div>
          {isThisWeek ? (
            <div className="text-[10px] text-[#65B3AE]">this week</div>
          ) : (
            <button
              onClick={() => setMonday(thisMonday)}
              className="text-[10px] text-[#65B3AE] underline"
            >
              back to this week
            </button>
          )}
        </div>
        <button
          onClick={() => setMonday(addDays(monday, 7))}
          className="w-7 h-7 rounded-md text-[#65B3AE] font-bold hover:bg-[rgba(101,179,174,0.15)]"
          title="Next week"
          aria-label="Next week"
        >
          ›
        </button>
      </div>

      <textarea
        value={body}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => void save()}
        disabled={state === 'loading'}
        placeholder={'What are we focusing on this week?\n\ne.g. Building a mini TG app\ne.g. Structure the Discord face-swap event by the 30th'}
        className="flex-1 min-h-[12rem] bg-[rgba(101,179,174,0.08)] border border-[rgba(101,179,174,0.25)] rounded-lg p-3 text-sm text-white leading-relaxed placeholder-[rgba(101,179,174,0.45)] focus:outline-none focus:border-[#65B3AE] resize-none disabled:opacity-50"
      />
      <p className={`text-[11px] mt-2 ${state === 'error' ? 'text-red-300' : 'text-[#7FD4D0] opacity-60'}`}>
        {status}
      </p>
      <p className="text-[10px] text-[#7FD4D0] opacity-40 mt-1">Shared with every steward · saves as you type</p>
    </div>
  );
};

export default WeeklyFocusPanel;
