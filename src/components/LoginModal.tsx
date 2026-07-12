import React, { useState } from 'react';
import { AVAILABLE_USERS, UserName } from '../utils/userContext';

interface LoginModalProps {
  onUserSelect: (user: UserName) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onUserSelect }) => {
  const [selectedUser, setSelectedUser] = useState<UserName | null>(null);

  const handleSelect = (user: UserName) => {
    setSelectedUser(user);
    onUserSelect(user);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-[#65B3AE] to-transparent opacity-5 blur-3xl rounded-full animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-gradient-to-t from-[#008F5A] to-transparent opacity-5 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mantle-frosted rounded-2xl border border-[rgba(101,179,174,0.3)] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="relative px-8 py-8 border-b border-[rgba(101,179,174,0.2)] bg-gradient-to-r from-[rgba(101,179,174,0.1)] to-[rgba(0,143,90,0.05)]">
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Mantle<span className="text-[#65B3AE]">Sync</span>
            </h1>
            <p className="text-sm text-[#7FD4D0] mt-2">Select your profile to continue</p>

            {/* Decorative line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#65B3AE] to-transparent opacity-30" />
          </div>

          {/* User Selection Grid */}
          <div className="p-8">
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_USERS.map((user) => (
                <button
                  key={user}
                  onClick={() => handleSelect(user)}
                  disabled={selectedUser !== null}
                  className={`
                    relative px-4 py-4 rounded-lg font-semibold text-sm transition-all duration-300
                    ${
                      selectedUser === user
                        ? 'bg-gradient-to-r from-[#65B3AE] to-[#7FD4D0] text-[#050D20] shadow-lg shadow-[#65B3AE]/50'
                        : 'bg-[rgba(101,179,174,0.1)] border border-[rgba(101,179,174,0.3)] text-[#7FD4D0] hover:border-[#65B3AE] hover:bg-[rgba(101,179,174,0.15)] hover:text-white'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  title={`Select ${user}`}
                >
                  {/* Selection indicator */}
                  {selectedUser === user && (
                    <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#65B3AE] to-[#7FD4D0] opacity-0 group-hover:opacity-10 transition-opacity" />
                  )}
                  <span className="relative flex items-center justify-center gap-2">
                    {selectedUser === user && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {user}
                  </span>
                </button>
              ))}
            </div>

            {/* Loading indicator */}
            {selectedUser && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#65B3AE] animate-pulse" />
                <p className="text-xs text-[#7FD4D0]">Welcome, {selectedUser}...</p>
                <div className="w-2 h-2 rounded-full bg-[#65B3AE] animate-pulse" style={{ animationDelay: '0.2s' }} />
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-8 py-4 bg-[rgba(101,179,174,0.05)] border-t border-[rgba(101,179,174,0.1)]">
            <p className="text-xs text-[rgba(101,179,174,0.6)] text-center">
              Your username will be used to track activities in the logs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
