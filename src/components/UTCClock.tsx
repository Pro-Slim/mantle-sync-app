import React, { useState, useEffect } from 'react';

interface UTCClockProps {
  isDarkMode?: boolean;
}

const UTCClock: React.FC<UTCClockProps> = ({ isDarkMode = false }) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utcTime = now.toLocaleString('en-US', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setTime(utcTime);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-0"
      style={{
        opacity: 0.05,
      }}
    >
      <div
        className={`text-center font-mono ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}
        style={{
          fontSize: '180px',
          fontWeight: 'bold',
          lineHeight: '1',
          letterSpacing: '8px',
        }}
      >
        {time}
        <div
          style={{
            fontSize: '48px',
            marginTop: '20px',
            letterSpacing: '0px',
            fontWeight: 'normal',
          }}
        >
          UTC+0
        </div>
      </div>
    </div>
  );
};

export default UTCClock;
