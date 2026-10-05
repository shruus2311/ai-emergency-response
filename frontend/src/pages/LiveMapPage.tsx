import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Map as MapIcon, Layers, RefreshCw, 
  Truck, Users, AlertTriangle, ShieldCheck, CloudRain, Building2, Home
} from 'lucide-react';
import { api } from '../services/api';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { useLanguage } from '../context/LanguageContext';

export const LiveMapPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [layersData, setLayersData] = useState<any>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Layer Visibility Toggles
  const [showIncidents, setShowIncidents] = useState(true);
  const [showResources, setShowResources] = useState(true);
  const [showResponders, setShowResponders] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showRiskZones, setShowRiskZones] = useState(true);

  // Incident Filtering
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchLayers = async () => {
    try {
      setLoading(true);
      const data = await api.map.layers();
      setLayersData(data);
      if (data.center) {
        const wx = await api.map.weather(data.center.latitude, data.center.longitude);
        setWeatherData(wx);
      }
    } catch (e) {
      console.error('Failed to load map layers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayers();
  }, []);

  const incidents = (layersData?.incidents || []).filter((inc: any) => {
    if (severityFilter && inc.severity_class !== severityFilter) return false;
    if (typeFilter && inc.incident_type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col font-sans relative bg-ivory-50 dark:bg-forest-950 text-forest-900 dark:text-sage-100">
      
      {/* Top Control Bar */}
      <div className="p-3 bg-white/95 dark:bg-forest-900/95 backdrop-blur border-b border-ivory-300 dark:border-forest-800 z-10 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-forest-950 dark:text-white uppercase tracking-wider">
            <div className="p-1.5 rounded bg-forest-50 dark:bg-forest-800 text-forest-700 dark:text-sage-300">
              <MapIcon className="w-4 h-4" />
            </div>
            <span>{t('navLiveMap', 'Geospatial Tactical Command Map')}</span>
          </div>

          {weatherData && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-ivory-100 dark:bg-forest-950 rounded-lg border border-ivory-300 dark:border-forest-800 text-[11px] text-forest-800 dark:text-sage-300 font-mono">
              <CloudRain className="w-3.5 h-3.5 text-forest-600 dark:text-sage-400" />
              <span>{weatherData.condition} ({weatherData.temperature_c}°C)</span>
              <span className="text-forest-400 dark:text-sage-500 font-mono">| Rain: {weatherData.rainfall_mm}mm</span>
            </div>
          )}
        </div>

        {/* Filter Dropdowns & Layer Checkboxes */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-ivory-100 dark:bg-forest-950 border border-ivory-300 dark:border-forest-700 rounded-md px-2.5 py-1 text-forest-900 dark:text-sage-200 focus:outline-none focus:ring-1 focus:ring-forest-600 font-medium"
          >
            <option value="">{t('filterAllSeverities', 'All Severities')}</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-ivory-100 dark:bg-forest-950 border border-ivory-300 dark:border-forest-700 rounded-md px-2.5 py-1 text-forest-900 dark:text-sage-200 focus:outline-none focus:ring-1 focus:ring-forest-600 font-medium"
          >
            <option value="">{t('filterAllTypes', 'All Hazard Types')}</option>
            <option value="Flood">Flood</option>
            <option value="Fire">Fire</option>
            <option value="Building Collapse">Building Collapse</option>
            <option value="Medical Emergency">Medical Emergency</option>
          </select>

          {/* Layer toggles */}
          <div className="flex items-center gap-1.5 border-l border-ivory-300 dark:border-forest-800 pl-3">
            <button
              onClick={() => setShowIncidents(!showIncidents)}
              className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-all ${
                showIncidents ? 'bg-red-100 border-red-300 text-red-900 dark:bg-red-950 dark:border-red-700 dark:text-red-300 shadow-sm' : 'bg-ivory-100 dark:bg-forest-950 border-ivory-300 dark:border-forest-800 text-forest-600 dark:text-sage-500'
              }`}
            >
              Incidents
            </button>
            <button
              onClick={() => setShowResources(!showResources)}
              className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-all ${
                showResources ? 'bg-forest-800 border-forest-900 text-ivory-100 dark:bg-forest-700 dark:border-forest-600 dark:text-sage-100 shadow-sm' : 'bg-ivory-100 dark:bg-forest-950 border-ivory-300 dark:border-forest-800 text-forest-600 dark:text-sage-500'
              }`}
            >
              Resources
            </button>
            <button
              onClick={() => setShowResponders(!showResponders)}
              className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-all ${
                showResponders ? 'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300 shadow-sm' : 'bg-ivory-100 dark:bg-forest-950 border-ivory-300 dark:border-forest-800 text-forest-600 dark:text-sage-500'
              }`}
            >
              Responders
            </button>
            <button
              onClick={() => setShowRiskZones(!showRiskZones)}
              className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-all ${
                showRiskZones ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-300 shadow-sm' : 'bg-ivory-100 dark:bg-forest-950 border-ivory-300 dark:border-forest-800 text-forest-600 dark:text-sage-500'
              }`}
            >
              Risk Zones
            </button>
            <button
              onClick={() => setShowHospitals(!showHospitals)}
              className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-all ${
                showHospitals ? 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300 shadow-sm' : 'bg-ivory-100 dark:bg-forest-950 border-ivory-300 dark:border-forest-800 text-forest-600 dark:text-sage-500'
              }`}
            >
              Hospitals
            </button>
            <button
              onClick={() => setShowShelters(!showShelters)}
              className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-all ${
                showShelters ? 'bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-950 dark:border-purple-700 dark:text-purple-300 shadow-sm' : 'bg-ivory-100 dark:bg-forest-950 border-ivory-300 dark:border-forest-800 text-forest-600 dark:text-sage-500'
              }`}
            >
              Shelters
            </button>
          </div>

          <button
            onClick={fetchLayers}
            className="p-1.5 hover:bg-ivory-200 dark:hover:bg-forest-800 text-forest-700 dark:text-sage-300 rounded border border-ivory-300 dark:border-forest-700"
            title="Reload layers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Map Element Filling Remaining Height */}
      <div className="flex-1 w-full h-full relative">
        {layersData && (
          <EmergencyMap
            center={[layersData.center.latitude, layersData.center.longitude]}
            zoom={13}
            incidents={showIncidents ? incidents : []}
            resources={showResources ? layersData.resources : []}
            responders={showResponders ? layersData.responders : []}
            hospitals={showHospitals ? layersData.hospitals : []}
            shelters={showShelters ? layersData.shelters : []}
            riskZones={showRiskZones ? layersData.risk_zones : []}
            height="100%"
            onIncidentClick={(inc) => navigate(`/incidents/${inc.id}`)}
          />
        )}
      </div>

    </div>
  );
};
