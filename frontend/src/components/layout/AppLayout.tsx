import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Compass, Radio, ShieldAlert, Truck, BarChart3, Database, 
  Users, Activity, Bell, Bot, LogOut, Sun, Moon, Globe, 
  Search, Shield, AlertOctagon, FileText, Check, ChevronDown, 
  UserCheck, Layers, Wifi, WifiOff, Sparkles, Lock, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Language } from '../../context/translations';
import { UserRole } from '../../types';
import { api } from '../../services/api';

interface Props {
  children: React.ReactNode;
  onToggleCopilot?: () => void;
  unreadCount?: number;
}

export const AppLayout: React.FC<Props> = ({ children, onToggleCopilot, unreadCount = 0 }) => {
  const { user, logout, login, isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Authentication Required Modal State for Privileged Roles
  const [authModalTargetRole, setAuthModalTargetRole] = useState<UserRole | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const roles: { role: UserRole; label: string; desc: string }[] = [
    { role: 'CITIZEN', label: 'Civilian Portal', desc: 'Emergency distress reporting & offline SOS (No Login Required)' },
    { role: 'DISPATCHER', label: 'Operations Dispatcher', desc: 'Incident triage & emergency unit dispatch (Auth Required)' },
    { role: 'RESPONDER', label: 'Field Tactical Unit', desc: 'Turn-by-turn routing & on-scene updates (Auth Required)' },
    { role: 'ANALYST', label: 'Intelligence Analyst', desc: 'USGS, GDACS, and risk assessment (Auth Required)' },
    { role: 'ADMIN', label: 'System Administrator', desc: 'Audit logging & infrastructure control (Auth Required)' },
  ];

  const closeAuthModal = () => {
    setAuthModalTargetRole(null);
    setAuthEmail('');
    setAuthPassword('');
    setAuthError('');
  };

  const handleRoleSwitch = (targetRole: UserRole) => {
    setShowRoleMenu(false);
    setAuthError('');
    setAuthEmail('');
    setAuthPassword('');

    // 1. Citizen does NOT require login
    if (targetRole === 'CITIZEN') {
      logout();
      navigate('/citizen');
      return;
    }

    // 2. If already authenticated and user's role matches or user is ADMIN
    if (user && user.role !== 'CITIZEN' && (user.role === targetRole || user.role === 'ADMIN')) {
      if (targetRole === 'RESPONDER') navigate('/responder');
      else if (targetRole === 'ANALYST') navigate('/analyst');
      else if (targetRole === 'ADMIN') navigate('/admin');
      else navigate('/dispatcher');
      return;
    }

    // 3. Otherwise, open the Authentication Required Modal with strictly empty fields
    setAuthModalTargetRole(targetRole);
    setAuthEmail('');
    setAuthPassword('');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authModalTargetRole) return;
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await api.auth.login({ email: authEmail.trim(), password: authPassword });
      
      // RBAC validation: check if the authenticated user's role matches targetRole or is ADMIN
      if (res.user.role !== authModalTargetRole && res.user.role !== 'ADMIN') {
        setAuthError(`Access Denied: Account role '${res.user.role}' is not authorized for ${authModalTargetRole} access.`);
        setAuthLoading(false);
        return;
      }

      // Set authenticated session in context
      await login({ email: authEmail.trim(), password: authPassword });

      const target = authModalTargetRole;
      closeAuthModal();

      // Navigate to authorized dashboard
      if (target === 'RESPONDER') navigate('/responder');
      else if (target === 'ANALYST') navigate('/analyst');
      else if (target === 'ADMIN') navigate('/admin');
      else navigate('/dispatcher');
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect email or password');
    } finally {
      setAuthLoading(false);
    }
  };

  const languages: { code: Language; label: string; native: string }[] = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'mr', label: 'Marathi', native: 'मराठी' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/dispatcher?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-ivory-100 dark:bg-forest-950 text-sage-950 dark:text-ivory-100 flex font-sans selection:bg-forest-700 selection:text-white transition-colors duration-200">
      
      {/* 1. Left Minimalist Deep Forest Green Sidebar Dock */}
      <aside className="w-16 sm:w-20 bg-forest-950 border-r border-forest-900/80 flex flex-col items-center justify-between py-6 z-40 flex-shrink-0 select-none">
        
        {/* Brand Icon Mark */}
        <div className="flex flex-col items-center gap-6">
          <Link 
            to="/" 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-forest-800 hover:bg-forest-700 border border-forest-600/40 flex items-center justify-center text-ivory-50 shadow-md shadow-forest-950/50 hover:scale-105 transition-all"
            title="ResQIntel AI"
          >
            <ShieldAlert className="w-6 h-6 text-ivory-100" />
          </Link>

          {/* Navigation Icon Stack */}
          <nav className="flex flex-col items-center gap-3">
            {/* Live GIS Tactical Map */}
            <Link
              to="/map"
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all ${
                isActive('/map')
                  ? 'bg-forest-700 text-ivory-50 shadow-md border border-forest-500/40'
                  : 'text-sage-300 hover:text-ivory-50 hover:bg-forest-900'
              }`}
              title={t('navLiveMap', 'GIS Tactical Map')}
            >
              <Compass className="w-5 h-5" />
            </Link>

            {/* Dispatcher Command Center */}
            <Link
              to="/dispatcher"
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all ${
                isActive('/dispatcher')
                  ? 'bg-forest-700 text-ivory-50 shadow-md border border-forest-500/40'
                  : 'text-sage-300 hover:text-ivory-50 hover:bg-forest-900'
              }`}
              title={t('navCommandCenter', 'Command Center')}
            >
              <Radio className="w-5 h-5" />
            </Link>

            {/* Emergency Fleet & Logistics */}
            <Link
              to="/resources"
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all ${
                isActive('/resources')
                  ? 'bg-forest-700 text-ivory-50 shadow-md border border-forest-500/40'
                  : 'text-sage-300 hover:text-ivory-50 hover:bg-forest-900'
              }`}
              title={t('navResources', 'Fleet & Resources')}
            >
              <Truck className="w-5 h-5" />
            </Link>

            {/* Crisis SITREP & Intelligence */}
            <Link
              to="/sitrep"
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all ${
                isActive('/sitrep')
                  ? 'bg-forest-700 text-ivory-50 shadow-md border border-forest-500/40'
                  : 'text-sage-300 hover:text-ivory-50 hover:bg-forest-900'
              }`}
              title={t('navAnalytics', 'SITREP & Reports')}
            >
              <FileText className="w-5 h-5" />
            </Link>

            {/* Intelligence Analytics */}
            <Link
              to="/analyst"
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all ${
                isActive('/analyst')
                  ? 'bg-forest-700 text-ivory-50 shadow-md border border-forest-500/40'
                  : 'text-sage-300 hover:text-ivory-50 hover:bg-forest-900'
              }`}
              title="Analytics Telemetry"
            >
              <BarChart3 className="w-5 h-5" />
            </Link>

            {/* External Datasets & ML Registry */}
            <Link
              to="/datasets"
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all ${
                isActive('/datasets')
                  ? 'bg-forest-700 text-ivory-50 shadow-md border border-forest-500/40'
                  : 'text-sage-300 hover:text-ivory-50 hover:bg-forest-900'
              }`}
              title={t('navDataSources', 'Data Feeds & Model Registry')}
            >
              <Database className="w-5 h-5" />
            </Link>

            {/* Admin & Audit */}
            <Link
              to="/admin"
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all ${
                isActive('/admin')
                  ? 'bg-forest-700 text-ivory-50 shadow-md border border-forest-500/40'
                  : 'text-sage-300 hover:text-ivory-50 hover:bg-forest-900'
              }`}
              title={t('navAdmin', 'System Administration')}
            >
              <Users className="w-5 h-5" />
            </Link>

            {/* System Health */}
            <Link
              to="/health"
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all ${
                isActive('/health')
                  ? 'bg-forest-700 text-ivory-50 shadow-md border border-forest-500/40'
                  : 'text-sage-300 hover:text-ivory-50 hover:bg-forest-900'
              }`}
              title={t('navSystemHealth', 'System Health Telemetry')}
            >
              <Activity className="w-5 h-5" />
            </Link>
          </nav>
        </div>

        {/* Bottom Section: Disaster Mode & Sign Out */}
        <div className="flex flex-col items-center gap-3">
          {/* Quick Disaster SOS Mode */}
          <Link
            to="/emergency"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-red-950 hover:bg-red-900 border border-red-700 text-red-300 flex items-center justify-center transition-all shadow-md"
            title={t('navDisasterMode', 'Disaster SOS Mode')}
          >
            <AlertOctagon className="w-5 h-5 text-red-400" />
          </Link>

          {/* Sign Out / Sign In */}
          {isAuthenticated ? (
            <button
              onClick={logout}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl text-sage-300 hover:text-red-400 hover:bg-forest-900 flex items-center justify-center transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <Link
              to="/login"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl text-sage-300 hover:text-ivory-50 hover:bg-forest-900 flex items-center justify-center transition-colors"
              title="Sign In"
            >
              <Users className="w-5 h-5" />
            </Link>
          )}
        </div>

      </aside>

      {/* 2. Main Content Canvas & Top Bar */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* Top Deep Forest Green Header */}
        <header className="px-4 sm:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-forest-900 border-b border-forest-800 text-ivory-100 sticky top-0 z-30 shadow-md">
          
          {/* Left Brand & Title */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-serif font-bold text-ivory-50 tracking-tight">
                  ResQIntel <span className="text-sage-300 italic font-normal">AI</span>
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-forest-800 border border-forest-700 text-sage-300 font-semibold tracking-wider">
                  GOVT OPS
                </span>
              </div>
              <span className="text-[11px] text-sage-300 italic">
                “{t('appMission', 'From scattered emergency signals to coordinated action.')}”
              </span>
            </Link>
          </div>

          {/* Center & Right Controls */}
          <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
            
            {/* Search Pill */}
            <form onSubmit={handleSearchSubmit} className="relative hidden sm:block w-64 md:w-80">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder', 'Search incident, hazard, sector...')}
                  className="w-full bg-forest-950/80 border border-forest-700/80 rounded-full pl-4 pr-20 py-1.5 text-xs text-ivory-100 placeholder-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-400 transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-1 px-3 py-1 bg-forest-700 hover:bg-forest-600 text-ivory-50 rounded-full text-[11px] font-medium transition-all"
                >
                  Search
                </button>
              </div>
            </form>

            {/* User Profile Card */}
            <div className="flex items-center gap-2.5 bg-forest-950/90 border border-forest-700/80 rounded-full px-3 py-1 text-ivory-100">
              <div className="w-6 h-6 rounded-full bg-forest-800 border border-forest-600 flex items-center justify-center text-ivory-50 font-bold text-[11px]">
                {user && user.role !== 'CITIZEN' ? (user.full_name ? user.full_name.charAt(0) : 'U') : 'C'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-bold text-ivory-50 leading-none">
                  {user && user.role !== 'CITIZEN' ? (user.full_name || 'Emergency Operator') : 'Citizen'}
                </span>
                <span className="text-[9px] text-sage-300 leading-tight font-mono uppercase font-semibold">
                  {user && user.role !== 'CITIZEN' ? user.role : 'CITIZEN'}
                </span>
              </div>

              {/* Role switcher trigger button */}
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="ml-1 px-2.5 py-0.5 bg-forest-800 hover:bg-forest-700 text-ivory-100 rounded-full text-[10px] font-semibold border border-forest-600 transition-colors"
              >
                Switch Role
              </button>
            </div>

            {/* Role Dropdown */}
            {showRoleMenu && (
              <div className="absolute right-4 top-16 w-72 bg-ivory-50 dark:bg-forest-900 border border-ivory-300 dark:border-forest-700 rounded-2xl shadow-xl py-2 z-50 text-xs text-forest-950 dark:text-ivory-50">
                <div className="px-3.5 py-1.5 border-b border-ivory-200 dark:border-forest-800 text-[10px] font-mono font-bold text-sage-700 dark:text-sage-400 uppercase tracking-wider">
                  Select User Role
                </div>
                {roles.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => handleRoleSwitch(r.role)}
                    className={`w-full text-left px-3.5 py-2.5 hover:bg-ivory-200 dark:hover:bg-forest-800 transition-colors flex items-start justify-between ${
                      (user?.role || 'CITIZEN') === r.role ? 'bg-forest-100 dark:bg-forest-800 text-forest-900 dark:text-ivory-50 font-bold' : ''
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <span>{r.label}</span>
                        {r.role !== 'CITIZEN' && <Lock className="w-3 h-3 text-sage-500" />}
                      </div>
                      <div className="text-[10px] text-sage-600 dark:text-sage-400 mt-0.5">{r.desc}</div>
                    </div>
                    {(user?.role || 'CITIZEN') === r.role && <Check className="w-4 h-4 text-forest-700 dark:text-sage-300 mt-0.5" />}
                  </button>
                ))}
              </div>
            )}

            {/* AI Copilot Drawer Button */}
            {onToggleCopilot && (
              <button
                onClick={onToggleCopilot}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-forest-800 hover:bg-forest-700 text-ivory-100 border border-forest-700 rounded-full text-xs font-semibold transition-colors"
              >
                <Bot className="w-3.5 h-3.5 text-sage-300" />
                <span className="hidden sm:inline">Copilot</span>
              </button>
            )}

            {/* Language Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-forest-700 bg-forest-950 text-ivory-100 text-xs font-semibold hover:bg-forest-800 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-sage-300" />
                <span className="font-mono text-[11px] uppercase font-bold">{language}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-36 bg-ivory-50 dark:bg-forest-900 border border-ivory-300 dark:border-forest-700 rounded-2xl shadow-xl py-1 z-50 text-xs text-forest-950 dark:text-ivory-50 divide-y divide-ivory-200 dark:divide-forest-800">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-ivory-200 dark:hover:bg-forest-800 ${
                        language === l.code ? 'font-bold text-forest-800 dark:text-sage-300 bg-forest-100 dark:bg-forest-800/60' : ''
                      }`}
                    >
                      <span>{l.native}</span>
                      {language === l.code && <Check className="w-3.5 h-3.5 text-forest-700 dark:text-sage-300" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Toggle Pill */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full border border-forest-700 bg-forest-950 text-ivory-100 hover:bg-forest-800 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-sage-300" />}
            </button>

            {/* Notifications Pill with unread indicator */}
            <Link
              to="/notifications"
              className="relative p-1.5 rounded-full border border-forest-700 bg-forest-950 text-ivory-100 hover:bg-forest-800 transition-colors"
              title="Operational Notifications"
            >
              <Bell className="w-3.5 h-3.5 text-sage-300" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              )}
            </Link>

          </div>
        </header>

        {/* 3. Page Dynamic Canvas Area on Warm Ivory / Deep Forest */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {children}
        </main>

      </div>

      {/* 4. Authentication Required Modal */}
      {authModalTargetRole && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-ivory-50 dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ivory-200 dark:border-forest-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-forest-100 dark:bg-forest-850 text-forest-800 dark:text-sage-300 border border-forest-200 dark:border-forest-700">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-forest-950 dark:text-ivory-50 text-base font-serif leading-tight">
                    Authentication Required
                  </h3>
                  <span className="text-[11px] text-forest-700 dark:text-sage-400 font-mono font-semibold">
                    Switch to {roles.find(r => r.role === authModalTargetRole)?.label || authModalTargetRole}
                  </span>
                </div>
              </div>
              <button
                onClick={closeAuthModal}
                className="text-sage-600 dark:text-sage-400 hover:text-forest-900 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-sage-800 dark:text-sage-300 leading-relaxed">
              Authentication is required to access <strong className="text-forest-950 dark:text-ivory-50">{roles.find(r => r.role === authModalTargetRole)?.label || authModalTargetRole}</strong> operational controls and dispatch systems.
            </p>

            {authError && (
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} autoComplete="off" className="space-y-3.5 text-xs">
              <div>
                <label className="block text-forest-900 dark:text-sage-300 font-bold uppercase tracking-wider mb-1">
                  Username or Email
                </label>
                <input
                  type="text"
                  name="auth_user_identity"
                  id="auth_user_identity"
                  autoComplete="username"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="e.g. dispatcher@resqintel.ai"
                  className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded-lg p-2.5 text-forest-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-forest-600 font-sans"
                />
              </div>

              <div>
                <label className="block text-forest-900 dark:text-sage-300 font-bold uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="auth_user_credential"
                  id="auth_user_credential"
                  autoComplete="current-password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded-lg p-2.5 text-forest-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-forest-600 font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-ivory-200 dark:border-forest-800">
                <button
                  type="button"
                  onClick={closeAuthModal}
                  className="px-4 py-2 bg-ivory-200 dark:bg-forest-850 hover:bg-ivory-300 dark:hover:bg-forest-800 text-forest-900 dark:text-sage-300 rounded font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authLoading || !authEmail || !authPassword}
                  className="px-5 py-2 bg-forest-800 hover:bg-forest-700 text-ivory-50 font-bold rounded transition-colors flex items-center gap-1.5 shadow disabled:opacity-40"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{authLoading ? 'Authenticating...' : 'Authenticate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
