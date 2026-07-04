import React, { useState } from 'react';

interface CalendarWidgetProps {
  onDateSelect?: (date: Date) => void;
  isDarkMode?: boolean;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ onDateSelect, isDarkMode = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 4)); // July 4, 2026

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDayClick = (day: number) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    onDateSelect?.(selectedDate);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
    <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow-lg p-4 w-72`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={previousMonth}
          className={`font-bold ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
        >
          ←
        </button>
        <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <button
          onClick={nextMonth}
          className={`font-bold ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
        >
          →
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className={`text-center text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => (
          <button
            key={idx}
            onClick={() => day && handleDayClick(day)}
            className={`
              text-sm font-semibold py-2 rounded transition
              ${day === null ? 'text-transparent' : ''}
              ${day === today.getDate() && isCurrentMonth
                ? 'bg-amber-400 text-white font-bold'
                : day
                ? isDarkMode ? 'hover:bg-gray-600 text-gray-300 cursor-pointer' : 'hover:bg-gray-100 text-gray-700 cursor-pointer'
                : ''
              }
            `}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Create reminder section */}
      <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Create Reminder</p>
        <input
          type="date"
          defaultValue={new Date().toISOString().split('T')[0]}
          className={`w-full px-3 py-2 border rounded text-sm mb-2 ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        />
        <input
          type="text"
          placeholder="Reminder title"
          className={`w-full px-3 py-2 border rounded text-sm mb-2 ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
        />
        <button className="w-full bg-blue-500 text-white font-semibold py-2 rounded hover:bg-blue-600 transition text-sm">
          Add Reminder
        </button>
      </div>
    </div>
  );
};

export default CalendarWidget;
