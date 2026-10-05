import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, LogIn, Lock, Mail, AlertCircle, Radio, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { useLanguage } from '../context/LanguageContext';

export const LoginPage: React.FC = () => {
  const { login, loginDemo } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/dispatcher');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    setError('');
    setLoading(true);
    try {
      await loginDemo(role);
      if (role === 'CITIZEN') navigate('/citizen');
      else if (role === 'RESPONDER') navigate('/responder');
      else if (role === 'ANALYST') navigate('/analyst');
      else if (role === 'ADMIN') navigate('/admin');
      else navigate('/dispatcher');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-ivory-50 dark:bg-forest-950 text-forest-900 dark:text-sage-100">
      <div className="max-w-md w-full bg-ivory-50 dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 rounded-2xl shadow-sm p-6 sm:p-8">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-forest-800 text-ivory-50 dark:bg-forest-700 flex items-center justify-center mx-auto shadow-sm mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-forest-950 dark:text-ivory-50 tracking-wide">
            Sign In to ResQIntel AI
          </h2>
          <p className="text-xs text-forest-700 dark:text-sage-400 mt-1">
            Access secure emergency operations and field response intelligence
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-700/60 rounded-lg text-xs text-red-900 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Demo Fast-Login Section */}
        <div className="mb-6 p-3 bg-ivory-100 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded-xl">
          <div className="text-[11px] font-mono text-forest-700 dark:text-sage-400 uppercase tracking-wider mb-2 text-center font-bold">
            One-Click Fast Demo Role Access
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('DISPATCHER')}
              className="py-1.5 px-2 bg-ivory-50 dark:bg-forest-900 hover:bg-ivory-200 dark:hover:bg-forest-800 border border-ivory-300 dark:border-forest-700 text-forest-900 dark:text-sage-200 text-xs rounded font-mono font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Radio className="w-3.5 h-3.5 text-forest-700 dark:text-sage-300" />
              Dispatcher
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('RESPONDER')}
              className="py-1.5 px-2 bg-ivory-50 dark:bg-forest-900 hover:bg-ivory-200 dark:hover:bg-forest-800 border border-ivory-300 dark:border-forest-700 text-forest-900 dark:text-sage-200 text-xs rounded font-mono font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <UserCheck className="w-3.5 h-3.5 text-forest-700 dark:text-sage-300" />
              Responder
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('ANALYST')}
              className="py-1.5 px-2 bg-ivory-50 dark:bg-forest-900 hover:bg-ivory-200 dark:hover:bg-forest-800 border border-ivory-300 dark:border-forest-700 text-forest-900 dark:text-sage-200 text-xs rounded font-mono font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              Analyst
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('ADMIN')}
              className="py-1.5 px-2 bg-ivory-50 dark:bg-forest-900 hover:bg-ivory-200 dark:hover:bg-forest-800 border border-ivory-300 dark:border-forest-700 text-forest-900 dark:text-sage-200 text-xs rounded font-mono font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              Admin
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleDemoLogin('CITIZEN')}
            className="w-full mt-2 py-1.5 px-2 bg-forest-800 hover:bg-forest-900 dark:bg-forest-700 dark:hover:bg-forest-600 text-ivory-50 text-xs rounded font-mono font-semibold transition-colors text-center shadow-sm"
          >
            Citizen Reporter Account
          </button>
        </div>

        {/* Standard Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-forest-800 dark:text-sage-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-forest-500 dark:text-sage-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dispatcher@resqintel.ai"
                className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-700 rounded-lg pl-9 pr-3 py-2 text-xs text-forest-950 dark:text-white placeholder-forest-400 dark:placeholder-sage-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-forest-800 dark:text-sage-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-forest-500 dark:text-sage-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-700 rounded-lg pl-9 pr-3 py-2 text-xs text-forest-950 dark:text-white placeholder-forest-400 dark:placeholder-sage-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-forest-800 hover:bg-forest-900 dark:bg-forest-700 dark:hover:bg-forest-600 text-ivory-50 rounded-lg font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-forest-600 dark:text-sage-400">
          <span>Need a citizen account? </span>
          <Link to="/register" className="text-forest-800 dark:text-sage-200 hover:underline font-semibold">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
