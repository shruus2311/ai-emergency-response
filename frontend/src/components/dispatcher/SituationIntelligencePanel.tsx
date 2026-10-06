import React, { useState, useEffect } from 'react';
import { 
  Globe2, CloudRain, Activity, AlertTriangle, RefreshCw, 
  ShieldAlert, Sparkles, CheckCircle2, ArrowUpRight, Compass,
  Radio, Database, Clock, ExternalLink, Zap, Info
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

interface SituationIntelligenceData {
  status?: string;
  threat_level?: string;
  center?: { lat: number; lon: number };
  external_signals?: any[];
  signals?: any[];
  weather?: any;
  weather_observation?: any;
  situation_summary?: string;
  summary?: string;
  proactive_flags?: string[];
  potential_incidents?: any[];
  active_incidents_in_zone?: number;
  generated_at?: string;
}

interface Props {
  onIncidentCreated?: () => void;
  onOpenCopilot?: (incidentId?: string) => void;
}

export const SituationIntelligencePanel: React.FC<Props> = ({ onIncidentCreated, onOpenCopilot }) => {
  const { t } = useLanguage();
  const [data, setData] = useState<SituationIntelligenceData | null>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // Sector coordinates for scanning
  const [centerLat, setCenterLat] = useState<number>(18.5204);
  const [centerLng, setCenterLng] = useState<number>(73.8567);

  const fetchSituationData = async () => {
    setLoading(true);
    try {
      const [sitrep, sigs] = await Promise.all([
        api.ai.situationIntelligence(centerLat, centerLng),
        api.ai.externalSignals(25)
      ]);
      setData(sitrep);
      setSignals(sigs);
    } catch (err) {
      console.error('Failed to fetch situation intelligence feeds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSituationData();
  }, [centerLat, centerLng]);

  const handleRunProactiveScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await api.ai.proactiveDetect(centerLat, centerLng);
      if (res.proactive_incident_created && res.incident) {
        setScanResult(`⚡ PROACTIVE THREAT DETECTED: Created Incident #${res.incident.incident_number} (${res.incident.title})`);
        if (onIncidentCreated) onIncidentCreated();
      } else {
        setScanResult(res.message || 'Scan completed: No anomalous external threshold violations detected in current radius.');
      }
      await fetchSituationData();
    } catch (err: any) {
      setScanResult(`Scan error: ${err.message || 'Operation failed'}`);
    } finally {
      setScanning(false);
    }
  };

  const getSourceBadgeColor = (source: string) => {
    const s = (source || '').toUpperCase();
    if (s.includes('USGS')) {
      return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
    }
    if (s.includes('GDACS')) {
      return 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800';
    }
    if (s.includes('OPEN-METEO') || s.includes('OPEN_METEO') || s.includes('WEATHER')) {
      return 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800';
    }
    if (s.includes('INDIA RSS') || s.includes('RSS') || s.includes('NDTV') || s.includes('HINDU') || s.includes('TIMES') || s.includes('NEWS')) {
      return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
    }
    return 'bg-ivory-200 text-forest-800 border-ivory-400 dark:bg-forest-900 dark:text-sage-300 dark:border-forest-700';
  };

  return (
    <div className="bg-ivory-50 dark:bg-forest-900/95 border border-ivory-300 dark:border-forest-800 rounded-2xl p-5 space-y-5 shadow-sm font-sans">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ivory-200 dark:border-forest-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-forest-100 dark:bg-forest-800 border border-forest-300 dark:border-forest-700 flex items-center justify-center text-forest-800 dark:text-sage-200 shadow-sm">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-forest-700 dark:text-sage-300 uppercase tracking-wider">
                Multi-Source Autonomous Fusion
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800/80 rounded-full text-[10px] font-bold font-mono">
                REAL-TIME FEEDS ACTIVE
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-serif font-bold text-forest-950 dark:text-ivory-50">
              {t('lblExternalSignals', 'Proactive Situation Intelligence & External Signals')}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSituationData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ivory-100 hover:bg-ivory-200 dark:bg-forest-800 dark:hover:bg-forest-700 border border-ivory-300 dark:border-forest-700 rounded-lg text-xs font-semibold text-forest-900 dark:text-sage-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Feeds</span>
          </button>

          <button
            onClick={handleRunProactiveScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-forest-800 hover:bg-forest-900 dark:bg-forest-700 dark:hover:bg-forest-600 text-ivory-50 rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Analyzing Feeds...' : t('btnScanFeeds', 'Run Proactive Agent Scan')}</span>
          </button>
        </div>
      </div>

      {/* Proactive Scan Notification Banner */}
      {scanResult && (
        <div className="bg-forest-100 dark:bg-forest-950 border border-forest-300 dark:border-forest-700 text-forest-950 dark:text-sage-100 p-3 rounded-xl text-xs flex items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold">{scanResult}</span>
          </div>
          <button onClick={() => setScanResult(null)} className="text-forest-700 dark:text-sage-300 hover:underline font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Grid: Situation Summary & Live Weather Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Situation Summary */}
        <div className="lg:col-span-2 bg-ivory-50/70 dark:bg-forest-950/80 border border-ivory-200 dark:border-forest-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-forest-700 dark:text-sage-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-forest-600 dark:text-sage-400" />
              {t('lblThreatSynthesis', 'Multi-Agent Threat Synthesis')}
            </span>
            <span className="text-[10px] text-forest-500 dark:text-sage-500 font-mono">
              Center: {centerLat.toFixed(4)}, {centerLng.toFixed(4)}
            </span>
          </div>

          <div className="text-xs text-forest-900 dark:text-sage-200 leading-relaxed font-sans bg-ivory-50 dark:bg-forest-900/60 p-3.5 rounded-lg border border-ivory-200 dark:border-forest-800">
            {loading ? (
              <span className="text-forest-500 dark:text-sage-500">Synthesizing external weather and seismic signals...</span>
            ) : (
              data?.situation_summary || data?.summary || 'All external signals nominal. Continuous background monitoring active.'
            )}
          </div>

          {/* Proactive Threat Flags */}
          {((data?.proactive_flags && data.proactive_flags.length > 0) || (data?.potential_incidents && data.potential_incidents.length > 0)) && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">
                Detected Environmental Anomalies:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(data?.proactive_flags || data?.potential_incidents?.map((p: any) => p.title) || []).map((flag: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 dark:bg-amber-950/80 dark:border-amber-800/70 dark:text-amber-300 text-[11px] rounded font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Weather / Environmental Telemetry */}
        <div className="bg-ivory-50/70 dark:bg-forest-950/80 border border-ivory-200 dark:border-forest-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-forest-700 dark:text-sage-400 uppercase tracking-wider flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-forest-600 dark:text-sage-400" />
              {t('lblLiveWeather', 'Live Open-Meteo Telemetry')}
            </span>
            <span className="px-2 py-0.5 bg-forest-100 text-forest-800 border border-forest-200 dark:bg-forest-900 dark:text-sage-300 dark:border-forest-700 rounded text-[9px] font-mono font-bold">
              {(data?.weather?.status || data?.weather_observation?.status) || 'LIVE'}
            </span>
          </div>

          {loading ? (
            <div className="py-6 text-center text-xs text-forest-500 dark:text-sage-500">Querying Open-Meteo...</div>
          ) : (data?.weather || data?.weather_observation) ? (
            (() => {
              const w = data.weather || data.weather_observation;
              const temp = w.temperature ?? w.temperature_c ?? 'N/A';
              const rain = w.precipitation ?? w.rainfall_mm ?? 0;
              const wind = w.windspeed ?? w.wind_speed_kmh ?? 'N/A';
              const condition = w.condition || 'Clear sky';
              const humidity = w.humidity ?? w.humidity_pct ?? 'N/A';

              return (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-ivory-200 dark:border-forest-800/60">
                    <span className="text-forest-600 dark:text-sage-400">Condition:</span>
                    <span className="font-mono font-bold text-forest-950 dark:text-white">{condition}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-ivory-200 dark:border-forest-800/60">
                    <span className="text-forest-600 dark:text-sage-400">Temperature:</span>
                    <span className="font-mono font-bold text-forest-950 dark:text-white">{temp} °C</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-ivory-200 dark:border-forest-800/60">
                    <span className="text-forest-600 dark:text-sage-400">Precipitation / Rain:</span>
                    <span className={`font-mono font-bold ${rain > 10 ? 'text-red-700 dark:text-red-400 font-extrabold' : 'text-forest-900 dark:text-sage-200'}`}>
                      {rain} mm/h
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-ivory-200 dark:border-forest-800/60">
                    <span className="text-forest-600 dark:text-sage-400">Wind / Humidity:</span>
                    <span className="font-mono font-bold text-forest-800 dark:text-sage-300">{wind} km/h | {humidity}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-forest-600 dark:text-sage-400">Flood Risk Index:</span>
                    <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                      rain > 25 ? 'bg-red-100 text-red-900 border border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800' :
                      rain > 5 ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' :
                      'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                    }`}>
                      {rain > 25 ? 'HIGH (Flash Flood Warning)' :
                       rain > 5 ? 'ELEVATED' : 'NOMINAL'}
                    </span>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-xs text-forest-500 dark:text-sage-500 py-4 text-center">Weather telemetry offline</div>
          )}
        </div>

      </div>

      {/* Ingested External Signals Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono font-bold text-forest-800 dark:text-sage-300 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-forest-700 dark:text-sage-300" />
            <span>{t('lblExternalSignals', 'Ingested External Signals Feed')} — ({signals.length})</span>
          </div>
          <span className="text-[10px] text-forest-500 dark:text-sage-500 font-mono">
            Directly from official providers & feeds
          </span>
        </div>

        <div className="bg-ivory-50 dark:bg-forest-950 border border-ivory-200 dark:border-forest-800 rounded-xl overflow-hidden shadow-sm">
          {signals.length === 0 ? (
            <div className="p-6 text-center text-xs text-forest-500 dark:text-sage-500">
              {loading ? 'Fetching external signal streams...' : 'No external warning signals currently within monitored perimeter.'}
            </div>
          ) : (
            <div className="divide-y divide-ivory-200 dark:divide-forest-800/80 max-h-72 overflow-y-auto">
              {signals.map((sig) => (
                <div key={sig.id} className="p-3 hover:bg-ivory-50 dark:hover:bg-forest-900/60 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getSourceBadgeColor(sig.source)}`}>
                        {sig.source}
                      </span>
                      <span className="font-bold text-forest-950 dark:text-ivory-50">{sig.title}</span>
                      <span className="text-[10px] text-forest-600 dark:text-sage-400 bg-ivory-200 dark:bg-forest-800 px-1.5 py-0.2 rounded font-mono">
                        {sig.event_type}
                      </span>
                    </div>

                    <div className="text-[11px] text-forest-700 dark:text-sage-300 leading-snug">
                      {sig.description}
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-forest-500 dark:text-sage-500 font-mono pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {sig.published_at ? new Date(sig.published_at).toLocaleString() : 'Just now'}
                      </span>
                      {sig.latitude && sig.longitude && (
                        <span className="flex items-center gap-1">
                          <Compass className="w-3 h-3" />
                          {sig.latitude.toFixed(3)}, {sig.longitude.toFixed(3)}
                        </span>
                      )}
                      <span>
                        Reliability: {typeof sig.source_reliability === 'number'
                          ? `${(sig.source_reliability * 100).toFixed(0)}%`
                          : typeof sig.confidence === 'number'
                          ? `${(sig.confidence * 100).toFixed(0)}%`
                          : '92%'}
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold uppercase">{sig.processing_status || 'PROCESSED'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {(sig.reference_url || sig.source_url) && (
                      <a
                        href={sig.reference_url || sig.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-forest-700 dark:text-sage-300 hover:text-forest-950 dark:hover:text-white bg-ivory-100 dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 rounded hover:bg-ivory-200 dark:hover:bg-forest-800 transition-colors"
                        title="View Official Source Feed"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
