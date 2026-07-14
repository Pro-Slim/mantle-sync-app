import React from 'react';
import { OnlineUser } from '../hooks/usePresence';

interface OnlineUsersProps {
  onlineUsers: OnlineUser[];
  loading: boolean;
}

const OnlineUsers: React.FC<OnlineUsersProps> = ({ onlineUsers, loading }) => {
  if (loading) {
    return (
      <div className="text-[#7FD4D0] text-xs opacity-60">
        Loading...
      </div>
    );
  }

  const userCount = onlineUsers.length;

  return (
    <div className="group relative">
      <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[rgba(101,179,174,0.1)] border border-[rgba(101,179,174,0.2)] cursor-default">
        {/* Green online indicator dot */}
        <div className="w-2 h-2 rounded-full bg-[#65B3AE] animate-pulse" />
        <span className="text-[#7FD4D0] text-xs font-semibold">
          {userCount} online
        </span>
      </div>

      {/* Tooltip showing user list on hover */}
      {userCount > 0 && (
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 bg-[#050D20] border border-[#65B3AE] rounded-lg p-2 whitespace-nowrap text-xs text-[#7FD4D0] shadow-lg">
          <div className="font-semibold mb-1 text-[#65B3AE]">Online Users:</div>
          {onlineUsers.map((user, idx) => (
            <div key={user.user_id} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#65B3AE]" />
              <span className="text-[#7FD4D0]">{idx + 1}. {user.email || user.user_id.slice(0, 8)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OnlineUsers;
