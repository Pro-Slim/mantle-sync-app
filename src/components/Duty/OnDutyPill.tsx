import React from 'react';
import { DAY_NAMES, slotColor, slotLabel } from '../../constants/stewards';
import { useCurrentDuty } from '../../hooks/useCurrentDuty';

interface OnDutyPillProps {
  onOpenRota?: () => void;
}

const pad = (n: number): string => String(n).padStart(2, '0');

const OnDutyPill: React.FC<OnDutyPillProps> = ({ onOpenRota }) => {
  const duty = useCurrentDuty();
  const onDuty = duty.slot === 'IDLE' ? null : slotLabel(duty.slot);
  const accent = slotColor(duty.slot);

  const hours = Math.floor(duty.minutesLeftInShift / 60);
  const mins = duty.minutesLeftInShift % 60;
  const countdown = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const shiftRange = `${DAY_NAMES[duty.shift.startDayIndex]} ${pad(duty.shift.startHour)}:00 → ${
    DAY_NAMES[duty.shift.endDayIndex]
  } ${pad(duty.shift.endHour)}:00 UTC`;

  return (
    <div className="group relative">
      <button
        onClick={onOpenRota}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all hover:brightness-125"
        style={{ background: `${accent}1A`, border: `1px solid ${accent}4D` }}
        title={onDuty ? `${onDuty} is on duty — open the rota` : 'Nobody rostered right now — open the rota'}
      >
        <span
          className={`w-2 h-2 rounded-full ${onDuty ? 'animate-pulse' : 'opacity-50'}`}
          style={{ background: accent }}
        />
        <span className="text-xs font-semibold" style={{ color: accent }}>
          {onDuty ?? 'Idle'}
        </span>
      </button>

      <div className="absolute top-full right-0 mt-2 hidden group-hover:block z-50 bg-[#050D20] border border-[#65B3AE] rounded-lg p-2.5 whitespace-nowrap text-xs shadow-lg">
        <div className="font-semibold mb-1" style={{ color: accent }}>
          {onDuty ? `${onDuty} is on duty` : 'No steward rostered'}
        </div>
        <div className="text-[#7FD4D0] opacity-80">{shiftRange}</div>
        <div className="text-[#7FD4D0] opacity-80">
          {onDuty ? 'Ends in' : 'Next shift in'} {countdown}
        </div>
        <div className="text-[#7FD4D0] opacity-40 mt-1 text-[10px]">Click to open the rota</div>
      </div>
    </div>
  );
};

export default OnDutyPill;
