import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { isAdmin } from '../constants/admins';

interface UserRecord {
  id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // Check if current user is an admin
  const userIsAdmin = isAdmin(user?.email);

  useEffect(() => {
    if (!userIsAdmin) return;
    fetchUsers();
  }, [userIsAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      // Refresh list
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
    }
  };

  if (!userIsAdmin) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">❌ Access denied. Admin panel is restricted.</p>
      </div>
    );
  }

  const pendingUsers = users.filter(u => u.status === 'pending');
  const approvedUsers = users.filter(u => u.status === 'approved');
  const rejectedUsers = users.filter(u => u.status === 'rejected');

  const tabUsers = {
    pending: pendingUsers,
    approved: approvedUsers,
    rejected: rejectedUsers,
  };

  const currentUsers = tabUsers[activeTab];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-[#7FD4D0]">👤 User Approval Panel</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-[#65B3AE] border-opacity-30">
        {(['pending', 'approved', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-4 font-semibold transition ${
              activeTab === tab
                ? 'border-b-2 border-[#7FD4D0] text-[#7FD4D0]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab === 'pending' && `⏳ Pending (${pendingUsers.length})`}
            {tab === 'approved' && `✅ Approved (${approvedUsers.length})`}
            {tab === 'rejected' && `❌ Rejected (${rejectedUsers.length})`}
          </button>
        ))}
      </div>

      {/* User List */}
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : currentUsers.length === 0 ? (
        <p className="text-gray-400">No {activeTab} users.</p>
      ) : (
        <div className="space-y-4">
          {currentUsers.map((userRecord) => (
            <div
              key={userRecord.id}
              className="bg-slate-800 bg-opacity-50 border border-[#65B3AE] border-opacity-20 p-4 rounded flex items-center justify-between hover:bg-opacity-70 transition"
            >
              <div>
                <p className="font-semibold text-[#7FD4D0]">{userRecord.email}</p>
                <p className="text-sm text-gray-400">
                  Joined {new Date(userRecord.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {activeTab === 'pending' && (
                  <>
                    <button
                      onClick={() => updateUserStatus(userRecord.id, 'approved')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold transition"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => updateUserStatus(userRecord.id, 'rejected')}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold transition"
                    >
                      ✕ Reject
                    </button>
                  </>
                )}
                {(activeTab === 'approved' || activeTab === 'rejected') && (
                  <button
                    onClick={() => updateUserStatus(userRecord.id, 'pending')}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded font-semibold transition"
                  >
                    ↩ Move to Pending
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
