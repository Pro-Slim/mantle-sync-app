import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  onAuthSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onAuthSuccess }) => {
  const { signIn, signUp, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { user, error: authError } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (authError) {
        setError(authError);
        setIsSubmitting(false);
        return;
      }

      if (user) {
        onAuthSuccess();
      }
    } catch (err) {
      setError(String(err));
      setIsSubmitting(false);
    }
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
            <p className="text-sm text-[#7FD4D0] mt-2">
              {isSignUp ? 'Create account to get started' : 'Sign in to your account'}
            </p>

            {/* Decorative line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#65B3AE] to-transparent opacity-30" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#7FD4D0] mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isSubmitting || loading}
                className="w-full px-4 py-2 bg-[rgba(101,179,174,0.1)] border border-[rgba(101,179,174,0.3)] rounded-lg text-white placeholder-[rgba(101,179,174,0.5)] focus:outline-none focus:border-[#65B3AE] transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#7FD4D0] mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmitting || loading}
                className="w-full px-4 py-2 bg-[rgba(101,179,174,0.1)] border border-[rgba(101,179,174,0.3)] rounded-lg text-white placeholder-[rgba(101,179,174,0.5)] focus:outline-none focus:border-[#65B3AE] transition-colors disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || loading || !email || !password}
              className="w-full px-4 py-2 mt-6 bg-gradient-to-r from-[#65B3AE] to-[#7FD4D0] text-[#050D20] font-semibold rounded-lg hover:shadow-lg hover:shadow-[#65B3AE]/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-transparent border-t-[#050D20] animate-spin" />
                  {isSignUp ? 'Creating...' : 'Signing in...'}
                </span>
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              disabled={isSubmitting || loading}
              className="w-full text-sm text-[#7FD4D0] hover:text-white transition-colors disabled:opacity-50"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </form>

          {/* Footer */}
          <div className="px-8 py-4 bg-[rgba(101,179,174,0.05)] border-t border-[rgba(101,179,174,0.1)]">
            <p className="text-xs text-[rgba(101,179,174,0.6)] text-center">
              Your data is securely stored and synced across devices
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
