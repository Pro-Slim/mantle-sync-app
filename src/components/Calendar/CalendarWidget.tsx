import React, { useRef, useState } from 'react';
import { CalendarReminder } from '../../types';

const DOUBLE_CLICK_WINDOW_MS = 250;

interface CalendarWidgetProps {
  onDateSelect?: (date: Date) => void;
  onDateDoubleClick?: (date: Date) => void;
  reminders?: CalendarReminder[];
  onDeleteReminder?: (reminderId: string) => void;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ onDateSelect, onDateDoubleClick, reminders = [], onDeleteReminder }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredReminderDate, setHoveredReminderDate] = useState<string | null>(null);
  const pendingClickRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Monday-first index: native getDay() is 0=Sun..6=Sat, shift so 0=Mon..6=Sun.
  const getFirstDayOfMonth = (date: Date) => {
    return (new Date(date.getFullYear(), date.getMonth(), 1).getDay() + 6) % 7;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // A native dblclick fires two click events first, so delay the single-click
  // action just long enough to be cancelled if a double-click follows.
  const handleDayClick = (day: number) => {
    if (pendingClickRef.current) {
      clearTimeout(pendingClickRef.current);
    }
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    pendingClickRef.current = setTimeout(() => {
      pendingClickRef.current = null;
      onDateSelect?.(selectedDate);
    }, DOUBLE_CLICK_WINDOW_MS);
  };

  const handleDayDoubleClick = (day: number) => {
    if (pendingClickRef.current) {
      clearTimeout(pendingClickRef.current);
      pendingClickRef.current = null;
    }
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    onDateDoubleClick?.(selectedDate);
  };

  const getRemindersForDate = (day: number): CalendarReminder[] => {
    return reminders.filter(r => {
      const reminderDate = new Date(r.date);
      return reminderDate.getFullYear() === currentDate.getFullYear() &&
             reminderDate.getMonth() === currentDate.getMonth() &&
             reminderDate.getDate() === day;
    });
  };

  const dateKey = (day: number) => `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() &&
                        today.getMonth() === currentDate.getMonth();

  return (
    <div className="mantle-frosted rounded-xl p-3 w-full max-w-xs" style={{
      border: '1px solid rgba(101, 179, 174, 0.3)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 12px rgba(101, 179, 174, 0.15), inset 0 1px 1px rgba(101, 179, 174, 0.1)',
    }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-[rgba(101,179,174,0.1)]">
        <button
          onClick={previousMonth}
          className="font-bold text-[#7FD4D0] hover:text-[#65B3AE] transition text-sm"
        >
          ←
        </button>
        <h3 className="font-bold text-white text-xs text-center">
          {monthNames[currentDate.getMonth()]} <span className="text-[#65B3AE] text-xs">{currentDate.getFullYear()}</span>
        </h3>
        <button
          onClick={nextMonth}
          className="font-bold text-[#7FD4D0] hover:text-[#65B3AE] transition text-sm"
        >
          →
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-0.5 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-[10px] font-bold text-[#7FD4D0] opacity-60">
            {day}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-0.5 mb-2">
        {days.map((day, idx) => {
          const dayReminders = day ? getRemindersForDate(day) : [];
          const key = day ? dateKey(day) : `empty-${idx}`;
          const hasReminders = dayReminders.length > 0;

          return (
            <div key={idx} className="relative">
              <button
                onClick={() => day && handleDayClick(day)}
                onDoubleClick={() => day && handleDayDoubleClick(day)}
                onMouseEnter={() => hasReminders && setHoveredReminderDate(key)}
                onMouseLeave={() => setHoveredReminderDate(null)}
                title={day ? 'Click: go to date on timeline · Double-click: add reminder' : undefined}
                className={`
                  w-full text-xs font-semibold py-1 rounded transition relative
                  ${day === null ? 'text-transparent' : ''}
                  ${day === today.getDate() && isCurrentMonth
                    ? 'bg-[#65B3AE] text-[#050D20] font-bold hover:bg-[#7FD4D0] mantle-glow-pulse'
                    : day
                    ? 'hover:bg-[rgba(101,179,174,0.2)] text-[#7FD4D0] cursor-pointer'
                    : ''
                  }
                `}
              >
                {day}
                {hasReminders && (
                  <div className="flex justify-center gap-0.5 mt-0.5">
                    {dayReminders.slice(0, 2).map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-[#65B3AE]"></div>
                    ))}
                  </div>
                )}
              </button>

              {/* Reminder Tooltip */}
              {hoveredReminderDate === key && dayReminders.length > 0 && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 whitespace-nowrap">
                  <div className="bg-[rgba(5,13,32,0.95)] border border-[#65B3AE] rounded-lg p-2 shadow-lg backdrop-filter backdrop-blur-sm">
                    {dayReminders.map((reminder) => (
                      <div key={reminder.id} className="flex items-center gap-2 text-xs text-[#7FD4D0] mb-1 last:mb-0">
                        <span className="text-[10px] text-[#65B3AE]">•</span>
                        <span>{reminder.title}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteReminder?.(reminder.id);
                          }}
                          className="ml-2 text-[#ff6b6b] hover:text-[#ff8787] transition text-xs font-bold"
                          title="Delete reminder"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarWidget;
