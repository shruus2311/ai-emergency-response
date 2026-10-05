import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, PieChart as PieIcon, Activity, FileText, 
  RefreshCw, TrendingUp, Users, AlertTriangle, Shield 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export const AnalystDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await api.admin.analytics();
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const COLORS = ['#dc2626', '#ea580c', '#d97706', '#2563eb', '#16a34a', '#7c3aed'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ivory-300 dark:border-forest-800 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-forest-100 text-forest-800 dark:bg-forest-900 dark:text-sage-300 border border-forest-200 dark:border-forest-700">
            Crisis Intelligence & Post-Incident Telemetry
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-forest-950 dark:text-ivory-50 mt-1">
            {t('navAnalytics', 'Operational Intelligence & Analytics')}
          </h1>
          <p className="text-xs text-forest-700 dark:text-sage-400 mt-0.5">
            Empirical data synthesis of disaster clusters, casualty demographics, and response impact.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-ivory-100 dark:bg-forest-900 hover:bg-ivory-200 dark:hover:bg-forest-800 border border-ivory-300 dark:border-forest-700 rounded-lg text-xs font-semibold text-forest-900 dark:text-sage-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('btnRefresh', 'Refresh Telemetry')}</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-forest-600 dark:text-sage-400">
          Aggregating telemetry from database records...
        </div>
      ) : !analytics || !analytics.has_data ? (
        <div className="py-16 text-center text-xs text-forest-600 dark:text-sage-400 bg-white dark:bg-forest-900/60 rounded-xl border border-ivory-300 dark:border-forest-800">
          No current data available in incident repository.
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Top Casualty & Population Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 p-4 rounded-xl shadow-sm">
              <span className="text-[11px] font-mono text-forest-600 dark:text-sage-400 uppercase tracking-wider block">
                Total Documented Incidents
              </span>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-forest-950 dark:text-ivory-50 mt-1">
                {analytics.total_incidents}
              </div>
            </div>

            <div className="bg-white dark:bg-forest-900/90 border border-red-200 dark:border-red-900/60 p-4 rounded-xl shadow-sm">
              <span className="text-[11px] font-mono text-red-700 dark:text-red-400 uppercase tracking-wider block">
                Total Reported Injuries
              </span>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-red-600 dark:text-red-400 mt-1">
                {analytics.total_injuries}
              </div>
            </div>

            <div className="bg-white dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 p-4 rounded-xl shadow-sm">
              <span className="text-[11px] font-mono text-forest-600 dark:text-sage-400 uppercase tracking-wider block">
                Recorded Fatalities
              </span>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-forest-900 dark:text-sage-200 mt-1">
                {analytics.total_fatalities}
              </div>
            </div>

            <div className="bg-white dark:bg-forest-900/90 border border-blue-200 dark:border-blue-900/60 p-4 rounded-xl shadow-sm">
              <span className="text-[11px] font-mono text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                Exposed / Displaced Persons
              </span>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-blue-600 dark:text-blue-300 mt-1">
                {analytics.total_affected}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Incident Types Distribution Chart */}
            <div className="bg-white dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-forest-950 dark:text-ivory-50 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-forest-600 dark:text-sage-400" />
                Incident Distribution by Hazard Classification
              </h3>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.type_distribution || []}>
                    <XAxis dataKey="name" stroke="#718C78" fontSize={11} />
                    <YAxis stroke="#718C78" fontSize={11} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#12231A', borderColor: '#274A38', borderRadius: '8px', fontSize: '12px', color: '#F5F1E8' }}
                      itemStyle={{ color: '#F5F1E8' }}
                    />
                    <Bar dataKey="count" fill="#1F4A36" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Severity Distribution Pie Chart */}
            <div className="bg-white dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-forest-950 dark:text-ivory-50 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-forest-600 dark:text-sage-400" />
                Incident Severity Classification Spread
              </h3>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.severity_distribution || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {(analytics.severity_distribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#12231A', borderColor: '#274A38', borderRadius: '8px', fontSize: '12px', color: '#F5F1E8' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
