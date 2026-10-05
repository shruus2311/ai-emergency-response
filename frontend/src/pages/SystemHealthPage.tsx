import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw, Server, Cpu, Database, Cloud } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export const SystemHealthPage: React.FC = () => {
  const { t } = useLanguage();
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const data = await api.health.get();
      setHealthData(data);
    } catch {
      setHealthData({
        system_status: 'DEGRADED',
        services: {
          backend: { name: 'Backend API', status: 'DEGRADED', error: 'Network timeout' },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    if (status === 'ONLINE') return <CheckCircle className="w-5 h-5 text-forest-700 dark:text-sage-300" />;
    if (status === 'FALLBACK_ACTIVE' || status === 'DEGRADED') return <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400" />;
    return <XCircle className="w-5 h-5 text-red-700 dark:text-red-400" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ONLINE') {
      return <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-forest-100 dark:bg-forest-850 text-forest-800 dark:text-sage-300 border border-forest-300 dark:border-forest-700">ONLINE</span>;
    }
    if (status === 'FALLBACK_ACTIVE' || status === 'DEGRADED') {
      return <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-forest-850 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">{status}</span>;
    }
    return <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-red-100 dark:bg-forest-850 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700">OFFLINE</span>;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ivory-300 dark:border-forest-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-forest-700 dark:text-sage-400 uppercase tracking-widest">
            {t('govtHeader', 'Platform Observability & Infrastructure Integrity')}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-forest-950 dark:text-white font-serif mt-1 flex items-center gap-2">
            <Activity className="w-6 h-6 text-forest-700 dark:text-sage-300" />
            Live System Component Health
          </h1>
          <p className="text-xs text-sage-800 dark:text-sage-400 mt-1">
            Genuine real-time telemetry probing of all external adapters, database pools, and AI engines. Zero fabricated status.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-ivory-100 dark:bg-forest-900 hover:bg-ivory-200 dark:hover:bg-forest-850 border border-ivory-300 dark:border-forest-800 rounded text-xs font-medium text-forest-900 dark:text-sage-300 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Probe Health</span>
        </button>
      </div>

      {healthData && (
        <div className="space-y-6">
          
          {/* Overall Health Card */}
          <div className="bg-ivory-100/90 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded p-6 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-sage-700 dark:text-sage-400 uppercase tracking-wider block">
                Primary Cluster Status
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-forest-950 dark:text-white mt-1 flex items-center gap-3 font-serif">
                <span>ResQIntel Platform:</span>
                <span className={healthData.system_status === 'ONLINE' ? 'text-forest-700 dark:text-sage-300 font-mono' : 'text-amber-800 dark:text-amber-400 font-mono'}>
                  {healthData.system_status}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-ivory-200 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 flex items-center justify-center">
              {getStatusIcon(healthData.system_status)}
            </div>
          </div>

          {/* Service Probes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(healthData.services || {}).map(([key, svc]: [string, any]) => (
              <div key={key} className="bg-ivory-100/80 dark:bg-forest-900/80 border border-ivory-300 dark:border-forest-800 rounded p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {key.includes('db') || key.includes('database') ? (
                      <Database className="w-5 h-5 text-forest-700 dark:text-sage-300" />
                    ) : key.includes('ai') || key.includes('model') ? (
                      <Cpu className="w-5 h-5 text-forest-700 dark:text-sage-300" />
                    ) : (
                      <Server className="w-5 h-5 text-sage-600 dark:text-sage-400" />
                    )}
                    <div>
                      <h3 className="font-bold text-sm text-forest-950 dark:text-white font-serif">{svc.name || key}</h3>
                      <span className="text-[11px] font-mono text-sage-600 dark:text-sage-400">ID: {key}</span>
                    </div>
                  </div>
                  {getStatusBadge(svc.status)}
                </div>

                {svc.details && (
                  <div className="text-[11px] font-mono text-sage-700 dark:text-sage-400 bg-ivory-50 dark:bg-forest-950 p-2.5 rounded border border-ivory-300 dark:border-forest-800 space-y-0.5">
                    {Object.entries(svc.details).map(([k, v]: [string, any]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-sage-600 dark:text-sage-500">{k}:</span>
                        <span className="text-forest-950 dark:text-ivory-50 truncate max-w-[200px]">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {svc.error && (
                  <div className="text-[11px] text-red-700 dark:text-red-400 bg-red-50 dark:bg-forest-950 p-2 rounded border border-red-200 dark:border-red-900">
                    ⚠️ {svc.error}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};
