import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShieldAlert, Radio, Map, BarChart3, Database, Users, 
  Activity, Bell, Bot, LogOut, ChevronDown, Check, AlertOctagon,
  Truck, Sun, Moon, Globe, Wifi, WifiOff, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Language } from '../../context/translations';
import { UserRole } from '../../types';

interface Props {
  onToggleCopilot?: () => void;
  unreadCount?: number;
}

export const Navbar: React.FC<Props> = ({ onToggleCopilot, unreadCount = 0 }) => {
  const { user, logout, loginDemo, isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(timer);
    };
  }, []);

  const roles: { role: UserRole; label: string; desc: string }[] = [
    { role: 'DISPATCHER', label: 'Operations Dispatcher', desc: 'Incident triage & emergency unit authorization' },
    { role: 'RESPONDER', label: 'Field Tactical Unit', desc: 'Turn-by-turn routing & on-scene updates' },
    { role: 'ANALYST', label: 'Intelligence Analyst', desc: 'USGS, GDACS, and risk assessment' },
    { role: 'ADMIN', label: 'System Administrator', desc: 'Audit logging & infrastructure control' },
    { role: 'CITIZEN', label: 'Civilian Portal', desc: 'Emergency distress reporting & offline SOS' },
  ];

  const handleRoleSwitch = async (role: UserRole) => {
    setShowRoleMenu(false);
    await loginDemo(role);
    if (role === 'CITIZEN') navigate('/citizen');
    else if (role === 'RESPONDER') navigate('/responder');
    else if (role === 'ANALYST') navigate('/analyst');
    else if (role === 'ADMIN') navigate('/admin');
    else navigate('/dispatcher');
  };

  const isActive = (path: string) => location.pathname === path;

  const languages: { code: Language; label: string; native: string }[] = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'mr', label: 'Marathi', native: 'मराठी' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-ivory-50/95 dark:bg-forest-950/95 backdrop-blur-md border-b border-ivory-300/80 dark:border-forest-800 shadow-sm transition-colors duration-200">
      {/* Editorial Telemetry Sub-header */}
      <div className="border-b border-ivory-200/80 dark:border-forest-900 bg-ivory-100/60 dark:bg-forest-950/90 px-4 sm:px-6 py-1 text-[11px] font-mono text-sage-700 dark:text-sage-400 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-forest-600"></span>
          </span>
          <span className="font-semibold text-forest-900 dark:text-sage-200 tracking-wide uppercase text-[10px]">
            {t('govtHeader', 'National Emergency Response & Situation Intelligence')}
          </span>
          <span className="text-sage-400 dark:text-forest-700 hidden md:inline">•</span>
          <span className="text-sage-600 dark:text-sage-400 hidden md:inline text-[10px]">
            {t('emergencyHotline', 'Emergency Advisory Hotline: 112 / 108')}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5 font-mono text-sage-600 dark:text-sage-400">
            <Clock className="w-3 h-3 text-sage-500" />
            <span>UTC {currentTime}</span>
          </div>

          <div className="flex items-center gap-1">
            {isOnline ? (
              <span className="flex items-center gap-1 text-forest-700 dark:text-sage-300 font-medium">
                <Wifi className="w-3 h-3 text-forest-600 dark:text-forest-400" />
                <span className="hidden sm:inline">ONLINE</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                <WifiOff className="w-3 h-3" />
                <span className="hidden sm:inline">OFFLINE CACHED</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Brand Identity with Editorial Serif Accent */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-forest-900/90 dark:bg-forest-800 flex items-center justify-center p-1 text-ivory-50 shadow-sm group-hover:scale-105 transition-transform border border-forest-600/30 overflow-hidden">
                <img src="/logo.png" alt="ResQIntel AI" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-bold text-base tracking-tight text-forest-950 dark:text-ivory-50 ">
                    ResQIntel
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-forest-100 dark:bg-forest-850 text-forest-800 dark:text-sage-300 border border-forest-300 dark:border-forest-700">
                    AI
                  </span>
                </div>
                <span className="text-[9px] font-medium text-sage-600 dark:text-sage-400 tracking-tight mt-0.5 hidden sm:inline uppercase font-sans">
                  Emergency Intelligence Platform
                </span>
              </div>
            </Link>

            {/* Main Navigation Links */}
            <div className="hidden lg:flex items-center gap-1 pl-4 border-l border-ivory-300 dark:border-forest-800">
              {isAuthenticated ? (
                <>
                  {(user?.role === 'DISPATCHER' || user?.role === 'ADMIN') && (
                    <Link
                      to="/dispatcher"
                      className={`px-3 py-1.5 rounded text-xs font-medium tracking-wide flex items-center gap-1.5 transition-colors ${
                        isActive('/dispatcher') 
                          ? 'bg-forest-800 dark:bg-forest-800 text-ivory-50 font-semibold shadow-inner' 
                          : 'text-forest-900 dark:text-sage-300 hover:text-forest-950 dark:hover:text-white hover:bg-ivory-200 dark:hover:bg-forest-850'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5 text-forest-600 dark:text-sage-300" />
                      {t('navCommandCenter', 'Command Center')}
                    </Link>
                  )}

                  <Link
                    to="/map"
                    className={`px-3 py-1.5 rounded text-xs font-medium tracking-wide flex items-center gap-1.5 transition-colors ${
                      isActive('/map') 
                        ? 'bg-forest-800 dark:bg-forest-800 text-ivory-50 font-semibold shadow-inner' 
                        : 'text-forest-900 dark:text-sage-300 hover:text-forest-950 dark:hover:text-white hover:bg-ivory-200 dark:hover:bg-forest-850'
                    }`}
                  >
                    <Map className="w-3.5 h-3.5 text-sage-600 dark:text-sage-400" />
                    {t('navLiveMap', 'GIS Map')}
                  </Link>

                  {user?.role === 'RESPONDER' && (
                    <Link
                      to="/responder"
                      className={`px-3 py-1.5 rounded text-xs font-medium tracking-wide flex items-center gap-1.5 transition-colors ${
                        isActive('/responder') 
                          ? 'bg-forest-800 dark:bg-forest-800 text-ivory-50 font-semibold shadow-inner' 
                          : 'text-forest-900 dark:text-sage-300 hover:text-forest-950 dark:hover:text-white hover:bg-ivory-200 dark:hover:bg-forest-850'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5 text-sage-500" />
                      {t('navFieldDuty', 'Field Duty')}
                    </Link>
                  )}

                  {(user?.role === 'DISPATCHER' || user?.role === 'ADMIN') && (
                    <Link
                      to="/resources"
                      className={`px-3 py-1.5 rounded text-xs font-medium tracking-wide flex items-center gap-1.5 transition-colors ${
                        isActive('/resources') 
                          ? 'bg-forest-800 dark:bg-forest-800 text-ivory-50 font-semibold shadow-inner' 
                          : 'text-forest-900 dark:text-sage-300 hover:text-forest-950 dark:hover:text-white hover:bg-ivory-200 dark:hover:bg-forest-850'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5 text-sage-500" />
                      {t('navResources', 'Fleet')}
                    </Link>
                  )}

                  {(user?.role === 'ANALYST' || user?.role === 'ADMIN') && (
                    <>
                      <Link
                        to="/analyst"
                        className={`px-3 py-1.5 rounded text-xs font-medium tracking-wide flex items-center gap-1.5 transition-colors ${
                          isActive('/analyst') 
                            ? 'bg-forest-800 dark:bg-forest-800 text-ivory-50 font-semibold shadow-inner' 
                            : 'text-forest-900 dark:text-sage-300 hover:text-forest-950 dark:hover:text-white hover:bg-ivory-200 dark:hover:bg-forest-850'
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-sage-500" />
                        {t('navAnalytics', 'Analytics')}
                      </Link>
                      <Link
                        to="/datasets"
                        className={`px-3 py-1.5 rounded text-xs font-medium tracking-wide flex items-center gap-1.5 transition-colors ${
                          isActive('/datasets') 
                            ? 'bg-forest-800 dark:bg-forest-800 text-ivory-50 font-semibold shadow-inner' 
                            : 'text-forest-900 dark:text-sage-300 hover:text-forest-950 dark:hover:text-white hover:bg-ivory-200 dark:hover:bg-forest-850'
                        }`}
                      >
                        <Database className="w-3.5 h-3.5 text-forest-600 dark:text-sage-400" />
                        {t('navDataSources', 'Data Feeds')}
                      </Link>
                    </>
                  )}

                  {user?.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      className={`px-3 py-1.5 rounded text-xs font-medium tracking-wide flex items-center gap-1.5 transition-colors ${
                        isActive('/admin') 
                          ? 'bg-forest-800 dark:bg-forest-800 text-ivory-50 font-semibold shadow-inner' 
                          : 'text-forest-900 dark:text-sage-300 hover:text-forest-950 dark:hover:text-white hover:bg-ivory-200 dark:hover:bg-forest-850'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      {t('navAdmin', 'Admin & Audit')}
                    </Link>
                  )}

                  {user?.role === 'CITIZEN' && (
                    <>
                      <Link
                        to="/citizen"
                        className={`px-3 py-1.5 rounded text-xs font-medium tracking-wide transition-colors ${
                          isActive('/citizen') 
                            ? 'bg-forest-800 dark:bg-forest-800 text-ivory-50 font-semibold shadow-inner' 
                            : 'text-forest-900 dark:text-sage-300 hover:text-forest-950 dark:hover:text-white hover:bg-ivory-200 dark:hover:bg-forest-850'
                        }`}
                      >
                        {t('navCitizenPortal', 'Portal')}
                      </Link>
                      <Link
                        to="/emergency"
                        className="px-2.5 py-1 rounded text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-center gap-1 transition-colors"
                      >
                        <AlertOctagon className="w-3.5 h-3.5" />
                        {t('navDisasterMode', 'Disaster SOS')}
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/map" className="px-3 py-1.5 text-xs text-forest-900 dark:text-sage-300 hover:text-forest-950 dark:hover:text-white font-medium">
                    {t('navLiveMap', 'GIS Map')}
                  </Link>
                  <Link to="/emergency" className="px-2.5 py-1 rounded text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-center gap-1">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    {t('navDisasterMode', 'Disaster SOS')}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Direct Report Button */}
            <Link
              to="/report"
              className="px-3 py-1.5 bg-forest-800 hover:bg-forest-700 dark:bg-forest-700 dark:hover:bg-forest-600 active:scale-[0.98] text-ivory-50 rounded text-xs font-medium shadow-sm transition-all flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-ivory-200" />
              <span>{t('navReportIncident', 'Report Incident')}</span>
            </Link>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 px-2 py-1 rounded border border-ivory-300 dark:border-forest-800 bg-ivory-100 dark:bg-forest-900 text-forest-900 dark:text-sage-300 text-xs font-medium hover:bg-ivory-200 dark:hover:bg-forest-850 transition-colors"
                title="Change Interface Language"
              >
                <Globe className="w-3.5 h-3.5 text-sage-600 dark:text-sage-400" />
                <span className="font-mono text-[11px] uppercase">{language}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-36 bg-ivory-50 dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 rounded shadow-xl py-1 z-50 text-xs">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-ivory-200 dark:hover:bg-forest-800 ${
                        language === l.code ? 'font-bold text-forest-800 dark:text-sage-200 bg-ivory-100 dark:bg-forest-850' : 'text-forest-900 dark:text-sage-300'
                      }`}
                    >
                      <span>{l.native}</span>
                      {language === l.code && <Check className="w-3 h-3 text-forest-700 dark:text-sage-300" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded border border-ivory-300 dark:border-forest-800 bg-ivory-100 dark:bg-forest-900 text-forest-900 dark:text-sage-300 hover:bg-ivory-200 dark:hover:bg-forest-850 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-forest-800" />}
            </button>

            {/* Streamlined Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-ivory-300 dark:border-forest-800 bg-ivory-100 dark:bg-forest-900 hover:bg-ivory-200 dark:hover:bg-forest-850 text-forest-900 dark:text-sage-200 text-xs font-mono transition-colors"
                title="Switch Demonstration User Role"
              >
                <span className="text-[10px] text-sage-600 dark:text-sage-400">ROLE:</span>
                <span className="font-bold">{user ? user.role : 'GUEST'}</span>
                <ChevronDown className="w-3 h-3 text-sage-500" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-ivory-50 dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 rounded shadow-2xl py-1.5 z-50 text-xs">
                  <div className="px-3 py-1.5 border-b border-ivory-200 dark:border-forest-800 text-[10px] font-mono font-semibold text-sage-600 dark:text-sage-400 uppercase tracking-wider">
                    Role-Based Access Simulation
                  </div>
                  {roles.map((r) => (
                    <button
                      key={r.role}
                      onClick={() => handleRoleSwitch(r.role)}
                      className={`w-full text-left px-3 py-2 hover:bg-ivory-200 dark:hover:bg-forest-800 transition-colors flex items-start justify-between ${
                        user?.role === r.role ? 'bg-ivory-100 dark:bg-forest-850 text-forest-950 dark:text-white font-medium' : 'text-forest-900 dark:text-sage-300'
                      }`}
                    >
                      <div>
                        <div className="font-semibold flex items-center gap-1.5 font-mono text-xs">
                          <span>{r.role}</span>
                          <span className="text-[10px] font-sans text-sage-600 dark:text-sage-400 font-normal">({r.label})</span>
                        </div>
                        <div className="text-[10px] text-sage-600 dark:text-sage-400 mt-0.5">{r.desc}</div>
                      </div>
                      {user?.role === r.role && <Check className="w-3.5 h-3.5 text-forest-700 dark:text-sage-300 mt-0.5 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI Copilot Drawer Launcher */}
            {onToggleCopilot && (
              <button
                onClick={onToggleCopilot}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-sage-100 dark:bg-forest-850 hover:bg-sage-200 dark:hover:bg-forest-800 text-forest-900 dark:text-sage-200 border border-sage-300 dark:border-forest-700 rounded text-xs font-semibold transition-colors"
              >
                <Bot className="w-3.5 h-3.5 text-forest-700 dark:text-sage-300" />
                <span className="hidden sm:inline">Copilot</span>
              </button>
            )}

            {/* System Health */}
            <Link
              to="/health"
              className="p-1.5 text-sage-600 dark:text-sage-400 hover:text-forest-800 dark:hover:text-sage-200 rounded hover:bg-ivory-200 dark:hover:bg-forest-850 transition-colors"
              title="System Health Probes"
            >
              <Activity className="w-3.5 h-3.5" />
            </Link>

            {/* Notifications */}
            <Link
              to="/notifications"
              className="relative p-1.5 text-sage-600 dark:text-sage-400 hover:text-forest-900 dark:hover:text-white rounded hover:bg-ivory-200 dark:hover:bg-forest-850 transition-colors"
              title="Operational Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-forest-600 rounded-full" />
              )}
            </Link>

            {/* Sign in / Sign out */}
            {isAuthenticated ? (
              <button
                onClick={logout}
                className="p-1.5 text-sage-600 dark:text-sage-400 hover:text-red-700 dark:hover:text-red-400 rounded hover:bg-ivory-200 dark:hover:bg-forest-850 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Link
                to="/login"
                className="px-2.5 py-1 bg-forest-800 hover:bg-forest-700 text-ivory-50 rounded text-xs font-medium transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

        </div>
      </nav>
    </header>
  );
};
