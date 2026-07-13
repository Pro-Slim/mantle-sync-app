import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const ApprovalStatus: React.FC = () => {
  const { user, userApprovalStatus, signOut } = useAuth();

  if (userApprovalStatus === 'approved') {
    return null; // User is approved, show main app
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-[#65B3AE] border-opacity-30 rounded-lg p-8 text-center">
        {userApprovalStatus === 'pending' && (
          <>
            <div className="text-5xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold text-[#7FD4D0] mb-4">Account Pending Approval</h1>
            <p className="text-gray-300 mb-6">
              Your account has been created. An administrator will review and approve your access shortly.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Email: <span className="text-[#7FD4D0]">{user?.email}</span>
            </p>
            <button
              onClick={() => signOut()}
              className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 font-semibold rounded transition"
            >
              Sign Out
            </button>
          </>
        )}

        {userApprovalStatus === 'rejected' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
            <p className="text-gray-300 mb-6">
              Your account request has been rejected. If you believe this is a mistake, please contact an administrator.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Email: <span className="text-[#7FD4D0]">{user?.email}</span>
            </p>
            <button
              onClick={() => signOut()}
              className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 font-semibold rounded transition"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ApprovalStatus;
