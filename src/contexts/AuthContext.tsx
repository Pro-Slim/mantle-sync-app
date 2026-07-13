import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userApprovalStatus: 'approved' | 'pending' | 'rejected' | null;
  signUp: (email: string, password: string) => Promise<{ user: User | null; error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Shared by fetchApprovalStatus (lazy-create on first sight of a user with
// no `users` row) and signUp (create immediately on registration).
const insertPendingUserRecord = async (userId: string, email: string) => {
  const { error: insertError } = await supabase
    .from('users')
    .insert({
      id: userId,
      email,
      status: 'pending',
    });

  if (insertError) {
    console.warn('Could not create user record:', insertError);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userApprovalStatus, setUserApprovalStatus] = useState<'approved' | 'pending' | 'rejected' | null>(null);

  const fetchApprovalStatus = async (userId: string, userEmail?: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('status')
        .eq('id', userId)
        .single();

      if (error) {
        // PGRST116 = "no rows returned", i.e. this user genuinely has no
        // record yet - create one as pending. Any other error (network
        // hiccup, RLS, timeout) is transient/unknown, not proof the user
        // is unapproved, so don't downgrade their status on it.
        if (error.code === 'PGRST116') {
          if (userEmail) {
            await insertPendingUserRecord(userId, userEmail);
          }
          setUserApprovalStatus('pending');
        } else {
          console.warn('Error fetching approval status:', error);
        }
        return;
      }

      setUserApprovalStatus(data?.status || null);
    } catch (error) {
      console.warn('Error fetching approval status:', error);
      setUserApprovalStatus(null);
    }
  };

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.id && session?.user?.email) {
        fetchApprovalStatus(session.user.id, session.user.email);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.id && session?.user?.email) {
        fetchApprovalStatus(session.user.id, session.user.email);
      } else {
        setUserApprovalStatus(null);
      }
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user?.id) {
        await insertPendingUserRecord(data.user.id, email);
      }

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: String(error) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: String(error) };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userApprovalStatus, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
