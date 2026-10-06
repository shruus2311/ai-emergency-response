import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Radio, AlertTriangle, ShieldCheck, Truck, Activity, 
  Search, ArrowUpRight, CheckCircle, RefreshCw, Bot, AlertOctagon,
  X, Send, List, Globe2
} from 'lucide-react';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { Incident, Resource, Responder } from '../types';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { SituationIntelligencePanel } from '../components/dispatcher/SituationIntelligencePanel';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  onOpenCopilot?: (incidentId?: string, incNumber?: string) => void;
}

export const DispatcherDashboard: React.FC<Props> = ({ onOpenCopilot }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveAlert, setLiveAlert] = useState<string | null>(null);

  // Quick Dispatch Modal State
  const [dispatchModalIncident, setDispatchModalIncident] = useState<Incident | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [selectedResponderId, setSelectedResponderId] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatching, setDispatching] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'INCIDENTS' | 'SITUATION_INTELLIGENCE'>('INCIDENTS');

  const loadData = async () => {
    try {
      const [incData, resData, respData] = await Promise.all([
        api.incidents.list(),
        api.resources.list(),
        api.responders.list(),
      ]);
      setIncidents(incData);
      setResources(resData);
      setResponders(respData);
    } catch (e) {
      console.error('Error fetching dashboard telemetry:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for real-time WebSocket events
    const unsubscribe = wsService.subscribe((event) => {
      if (
        event.event === 'NEW_REPORT_INGESTED' ||
        event.event === 'INCIDENT_VERIFIED' ||
        event.event === 'INCIDENT_STATUS_UPDATED' ||
        event.event === 'RESOURCE_DISPATCHED' ||
        event.event === 'ASSIGNMENT_STATUS_CHANGED' ||
        event.event === 'RESPONDER_LOCATION_UPDATE' ||
        event.event === 'SOS_ALERT' ||
        event.event === 'NEW_NOTIFICATION' ||
        event.type === 'NEW_INCIDENT' ||
        event.type === 'EXTERNAL_FEEDS_INGESTED' ||
        event.event === 'PROACTIVE_INCIDENT_DETECTED'
      ) {
        if (event.event === 'NEW_REPORT_INGESTED' || event.type === 'NEW_INCIDENT') {
          const incNum = event.data?.incident_number || event.incident_number || 'ALERT';
          const incTitle = event.data?.title || event.title || event.incident_type || 'Disaster Signal';
          setLiveAlert(`🚨 NEW EMERGENCY SIGNAL INGESTED: #${incNum} — ${incTitle}`);
        } else if (event.type === 'EXTERNAL_FEEDS_INGESTED') {
          setLiveAlert(`📡 FEED INGESTION ENGINE: ${event.data?.created_count || 0} external Indian news emergency reports processed and injected into Active Queue.`);
        } else if (event.event === 'SOS_ALERT') {
          setLiveAlert(`🚨 SOS ACTIVATION: #${event.incident_number}`);
        }
        loadData();
      }
    });

    return () => unsubscribe();
  }, []);

  // Quick Verify action directly from table
  const handleQuickVerify = async (incidentId: string) => {
    try {
      await api.incidents.verify(incidentId, {
        verification_status: 'VERIFIED',
        verification_notes: 'Verified via Emergency Operations Command Center',
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    }
  };

  // Quick Dispatch Submit
  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchModalIncident) return;
    if (!selectedResourceId && !selectedResponderId) {
      alert('Please select either an emergency vehicle/resource or a responder unit.');
      return;
    }

    setDispatching(true);
    try {
      await api.resources.assign({
        incident_id: dispatchModalIncident.id,
        resource_id: selectedResourceId || undefined,
        responder_id: selectedResponderId || undefined,
        notes: dispatchNotes || 'Deployment authorized by Operations Commander',
      });
      setDispatchModalIncident(null);
      setSelectedResourceId('');
      setSelectedResponderId('');
      setDispatchNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch units');
    } finally {
      setDispatching(false);
    }
  };

  // Filtered incidents
  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter && inc.status !== statusFilter) return false;
    if (severityFilter && inc.severity_class !== severityFilter) return false;
    if (typeFilter && inc.incident_type !== typeFilter) return false;
    if (searchTerm) {
      const match = `${inc.title} ${inc.incident_number} ${inc.address}`.toLowerCase();
      if (!match.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  // Key operational counts
  const activeCount = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
  const criticalCount = incidents.filter((i) => i.severity_class === 'CRITICAL' && i.status !== 'RESOLVED').length;
  const pendingVerifCount = incidents.filter((i) => i.verification_status === 'UNVERIFIED').length;
  const availableResourcesCount = resources.filter((r) => r.status === 'AVAILABLE').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      
      {/* Real-Time Live Signal Alert */}
      {liveAlert && (
        <div className="bg-amber-50 dark:bg-forest-900 border border-amber-300 dark:border-amber-700/80 rounded p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 text-amber-900 dark:text-amber-200 font-bold text-sm">
            <AlertOctagon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>{liveAlert}</span>
          </div>
          <button
            onClick={() => setLiveAlert(null)}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded transition-colors"
          >
            {t('actionDismiss', 'Dismiss')}
          </button>
        </div>
      )}

      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ivory-300 dark:border-forest-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-forest-600 dark:bg-forest-400 animate-ping" />
            <span className="text-xs font-mono font-bold text-forest-800 dark:text-sage-400 uppercase tracking-widest">
              {t('govtHeader', 'National Emergency Operations & Public Safety Command')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-forest-950 dark:text-ivory-50 font-serif tracking-tight mt-1">
            {t('navCommandCenter', 'Command Center')} — {t('appTagline', 'Emergency Response Intelligence Platform')}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ivory-100 dark:bg-forest-900 hover:bg-ivory-200 dark:hover:bg-forest-850 border border-ivory-300 dark:border-forest-800 rounded text-xs font-medium text-forest-900 dark:text-sage-300 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('refreshTelemetry', 'Refresh Telemetry')}</span>
          </button>

          {onOpenCopilot && (
            <button
              onClick={() => onOpenCopilot()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-forest-800 hover:bg-forest-700 text-ivory-50 rounded text-xs font-medium transition-colors shadow-sm"
            >
              <Bot className="w-4 h-4 text-ivory-200" />
              <span>{t('launchCopilot', 'Launch AI Copilot')}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Operational Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-ivory-50 dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 p-5 rounded-2xl shadow-sm">
          <div className="text-[11px] font-mono font-bold text-forest-800 dark:text-sage-400 uppercase tracking-wider flex items-center justify-between">
            <span>{t('kpiActiveIncidents', 'Active Incidents')}</span>
            <Radio className="w-4 h-4 text-forest-700 dark:text-sage-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-forest-950 dark:text-ivory-50 mt-1 font-mono">
            {loading ? '-' : activeCount}
          </div>
          <div className="text-[10px] text-sage-700 dark:text-sage-400 mt-1">{t('kpiLiveTracking', 'Live tracking active perimeters')}</div>
        </div>

        <div className="bg-ivory-50 dark:bg-forest-900 border border-red-300 dark:border-red-900/60 p-5 rounded-2xl shadow-sm">
          <div className="text-[11px] font-mono font-bold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center justify-between">
            <span>{t('kpiCriticalThreat', 'Critical Threat')}</span>
            <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-500 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-red-700 dark:text-red-400 mt-1 font-mono">
            {loading ? '-' : criticalCount}
          </div>
          <div className="text-[10px] text-sage-700 dark:text-sage-400 mt-1">{t('kpiHighRisk', 'Severity score > 8.0/10')}</div>
        </div>

        <div className="bg-ivory-50 dark:bg-forest-900 border border-amber-300 dark:border-amber-700/60 p-5 rounded-2xl shadow-sm">
          <div className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>{t('kpiPendingVerif', 'Pending Verification')}</span>
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-800 dark:text-amber-300 mt-1 font-mono">
            {loading ? '-' : pendingVerifCount}
          </div>
          <div className="text-[10px] text-sage-700 dark:text-sage-400 mt-1">{t('kpiOperatorReview', 'Requires operator review')}</div>
        </div>

        <div className="bg-ivory-50 dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 p-5 rounded-2xl shadow-sm">
          <div className="text-[11px] font-mono font-bold text-forest-800 dark:text-sage-400 uppercase tracking-wider flex items-center justify-between">
            <span>{t('kpiFleetAvailable', 'Fleet Available')}</span>
            <Truck className="w-4 h-4 text-forest-700 dark:text-sage-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-forest-950 dark:text-ivory-50 mt-1 font-mono">
            {loading ? '-' : availableResourcesCount} / {resources.length}
          </div>
          <div className="text-[10px] text-sage-700 dark:text-sage-400 mt-1">{t('kpiStagedUnits', 'Staged rescue apparatus')}</div>
        </div>
      </div>

      {/* Geospatial Map Overview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-forest-950 dark:text-ivory-50 uppercase tracking-wider font-mono">
            {t('navLiveMap', 'Live GIS Situation Map')}
          </div>
          <Link to="/map" className="text-xs text-forest-700 dark:text-sage-400 hover:underline font-semibold flex items-center gap-1">
            <span>{t('viewFullscreenMap', 'Fullscreen Map & GIS Layers')}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl border border-ivory-300 dark:border-forest-800 overflow-hidden shadow-sm">
          <EmergencyMap
            incidents={incidents}
            resources={resources}
            responders={responders}
            height="340px"
            onIncidentClick={(inc) => navigate(`/incidents/${inc.id}`)}
          />
        </div>
      </div>

      {/* Operations View Mode Tab Switcher */}
      <div className="flex items-center gap-3 border-b border-ivory-300 dark:border-forest-800 pb-3">
        <button
          onClick={() => setActiveTab('INCIDENTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold font-mono uppercase tracking-wider transition-all ${
            activeTab === 'INCIDENTS'
              ? 'bg-forest-800 text-ivory-50 shadow-sm'
              : 'bg-ivory-50 dark:bg-forest-900 text-forest-900 dark:text-sage-300 hover:text-forest-950 dark:hover:text-white border border-ivory-300 dark:border-forest-800'
          }`}
        >
          <List className="w-4 h-4" />
          <span>{t('tabIncidentQueue', 'Active Incident Queue')} ({filteredIncidents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SITUATION_INTELLIGENCE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold font-mono uppercase tracking-wider transition-all ${
            activeTab === 'SITUATION_INTELLIGENCE'
              ? 'bg-forest-800 text-ivory-50 shadow-sm'
              : 'bg-ivory-50 dark:bg-forest-900 text-forest-900 dark:text-sage-300 hover:text-forest-950 dark:hover:text-white border border-ivory-300 dark:border-forest-800'
          }`}
        >
          <Globe2 className="w-4 h-4" />
          <span>{t('tabSituationIntelligence', 'Situation Intelligence & External Feeds (USGS / GDACS / Weather)')}</span>
        </button>
      </div>

      {/* Tab 1: Live Incidents Table */}
      {activeTab === 'INCIDENTS' && (
        <div className="bg-ivory-50 dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5 sm:p-6">
          <div className="p-4 border-b border-ivory-300 dark:border-forest-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-sage-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder={t('searchPlaceholder', 'Search by incident #, title, or address...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded pl-9 pr-3 py-1.5 text-xs text-forest-950 dark:text-white placeholder-sage-500 focus:outline-none focus:border-forest-600 font-sans"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded px-2.5 py-1.5 text-xs text-forest-900 dark:text-sage-300 focus:outline-none"
              >
                <option value="">{t('filterAllSeverities', 'All Severities')}</option>
                <option value="CRITICAL">{t('severityCritical', 'Critical')}</option>
                <option value="HIGH">{t('severityHigh', 'High')}</option>
                <option value="MEDIUM">{t('severityMedium', 'Medium')}</option>
                <option value="LOW">{t('severityLow', 'Low')}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded px-2.5 py-1.5 text-xs text-forest-900 dark:text-sage-300 focus:outline-none"
              >
                <option value="">{t('filterAllStatuses', 'All Statuses')}</option>
                <option value="PENDING_VERIFICATION">{t('statusPending', 'Pending Verification')}</option>
                <option value="VERIFIED">{t('statusVerified', 'Verified')}</option>
                <option value="DISPATCHED">{t('statusDispatched', 'Dispatched')}</option>
                <option value="RESPONDER_EN_ROUTE">{t('statusEnRoute', 'En Route')}</option>
                <option value="ON_SCENE">{t('statusOnScene', 'On Scene')}</option>
                <option value="RESOLVED">{t('statusResolved', 'Resolved')}</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded px-2.5 py-1.5 text-xs text-forest-900 dark:text-sage-300 focus:outline-none"
              >
                <option value="">{t('filterAllHazards', 'All Hazard Types')}</option>
                <option value="Flood">Flood</option>
                <option value="Fire">Fire</option>
                <option value="Building Collapse">Building Collapse</option>
                <option value="Road Accident">Road Accident</option>
                <option value="Medical Emergency">Medical Emergency</option>
                <option value="Road Blockage">Road Blockage</option>
              </select>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory-200/60 dark:bg-forest-950 border-b border-ivory-300 dark:border-forest-800 text-forest-900 dark:text-sage-400 font-mono uppercase tracking-wider">
                <tr>
                  <th className="p-3">{t('tableRef', 'Ref #')}</th>
                  <th className="p-3">{t('tableTitleLoc', 'Emergency Title & Location')}</th>
                  <th className="p-3">{t('tableHazard', 'Hazard Type')}</th>
                  <th className="p-3">{t('tableSeverity', 'Severity')}</th>
                  <th className="p-3">{t('tableStatus', 'Status')}</th>
                  <th className="p-3">{t('tableVerification', 'Verification')}</th>
                  <th className="p-3 text-right">{t('tableActions', 'Operational Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-300 dark:divide-forest-800 font-sans">
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sage-600 dark:text-sage-400">
                      {loading ? t('loadingIncidents', 'Querying incident repository...') : t('noIncidentsFound', 'No incidents match active query parameters.')}
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-ivory-200/50 dark:hover:bg-forest-850/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-forest-900 dark:text-sage-300 whitespace-nowrap">
                        {inc.incident_number}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-forest-950 dark:text-white">{inc.title}</div>
                        <div className="text-[11px] text-sage-700 dark:text-sage-400 truncate max-w-xs">{inc.address}</div>
                      </td>
                      <td className="p-3 font-medium text-forest-900 dark:text-sage-300">
                        {inc.incident_type}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <SeverityBadge severity={inc.severity_class} score={inc.severity_score} />
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <StatusBadge status={inc.status} />
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {inc.verification_status === 'VERIFIED' ? (
                          <span className="text-forest-700 dark:text-sage-300 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {t('statusVerified', 'Verified')}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-amber-800 dark:text-yellow-400 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {t('statusUnverified', 'Unverified')}
                            </span>
                            <button
                              onClick={() => handleQuickVerify(inc.id)}
                              className="px-2 py-0.5 bg-ivory-200 dark:bg-forest-850 hover:bg-ivory-300 dark:hover:bg-forest-800 border border-forest-300 dark:border-forest-700 text-forest-900 dark:text-sage-200 rounded text-[11px] font-bold transition-colors"
                            >
                              {t('actionVerify', 'Verify')}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* Quick Assign Unit Button */}
                          <button
                            onClick={() => setDispatchModalIncident(inc)}
                            className="px-2.5 py-1 bg-ivory-200 dark:bg-forest-850 hover:bg-forest-800 hover:text-ivory-50 dark:hover:bg-forest-800 text-forest-900 dark:text-sage-200 border border-ivory-300 dark:border-forest-700 rounded font-medium text-[11px] transition-colors flex items-center gap-1"
                          >
                            <Truck className="w-3 h-3" />
                            <span>{t('actionAssignUnit', 'Assign Unit')}</span>
                          </button>

                          {onOpenCopilot && (
                            <button
                              onClick={() => onOpenCopilot(inc.id, inc.incident_number)}
                              className="p-1 hover:bg-ivory-200 dark:hover:bg-forest-850 text-forest-800 dark:text-sage-300 rounded border border-ivory-300 dark:border-forest-800"
                              title="Query AI Copilot on this incident"
                            >
                              <Bot className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <Link
                            to={`/incidents/${inc.id}`}
                            className="px-2.5 py-1 bg-forest-800 hover:bg-forest-700 text-ivory-50 rounded font-medium transition-colors"
                          >
                            {t('actionDossier', 'Dossier & Dispatch')}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Situation Intelligence & External Signals Panel */}
      {activeTab === 'SITUATION_INTELLIGENCE' && (
        <SituationIntelligencePanel
          onIncidentCreated={() => loadData()}
          onOpenCopilot={onOpenCopilot}
        />
      )}

      {/* Quick Dispatch Modal */}
      {dispatchModalIncident && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-ivory-50 dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 rounded max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ivory-300 dark:border-forest-800 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-forest-700 dark:text-sage-400" />
                <h3 className="font-bold text-forest-950 dark:text-white text-base font-serif">
                  {t('assignUnitsTo', 'Assign Emergency Units to')} #{dispatchModalIncident.incident_number}
                </h3>
              </div>
              <button
                onClick={() => setDispatchModalIncident(null)}
                className="text-sage-600 dark:text-sage-400 hover:text-forest-900 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="space-y-4 text-xs">
              <div className="p-3 bg-ivory-100 dark:bg-forest-950 rounded border border-ivory-300 dark:border-forest-800 space-y-1">
                <div className="font-bold text-forest-950 dark:text-white text-sm">{dispatchModalIncident.title}</div>
                <div className="text-sage-700 dark:text-sage-400">{dispatchModalIncident.address}</div>
                <div className="flex gap-2 pt-1">
                  <SeverityBadge severity={dispatchModalIncident.severity_class} score={dispatchModalIncident.severity_score} />
                  <StatusBadge status={dispatchModalIncident.status} />
                </div>
              </div>

              {/* Select Responder */}
              <div>
                <label className="block text-forest-900 dark:text-sage-300 font-bold uppercase tracking-wider mb-1">
                  {t('assignResponderUnit', 'Assign Tactical Responder Unit')}
                </label>
                <select
                  value={selectedResponderId}
                  onChange={(e) => setSelectedResponderId(e.target.value)}
                  className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded p-2.5 text-forest-950 dark:text-white"
                >
                  <option value="">{t('selectResponder', 'Select Responder...')}</option>
                  {responders.map((resp) => (
                    <option key={resp.id} value={resp.id}>
                      {resp.responder_name} ({resp.specialization}) — Status: {resp.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Fleet Resource */}
              <div>
                <label className="block text-forest-900 dark:text-sage-300 font-bold uppercase tracking-wider mb-1">
                  {t('deployFleetResource', 'Deploy Fleet Resource / Vehicle')}
                </label>
                <select
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded p-2.5 text-forest-950 dark:text-white"
                >
                  <option value="">{t('selectResource', 'Select Resource...')}</option>
                  {resources.filter((r) => r.status === 'AVAILABLE').map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.resource_name} ({res.resource_type}) — Station: {res.station_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-forest-900 dark:text-sage-300 font-bold uppercase tracking-wider mb-1">
                  {t('deploymentDirectives', 'Deployment Directives & Notes')}
                </label>
                <input
                  type="text"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g. Priority 1 response. Approach via northern corridor."
                  className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded p-2.5 text-forest-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDispatchModalIncident(null)}
                  className="px-4 py-2 bg-ivory-200 dark:bg-forest-850 hover:bg-ivory-300 dark:hover:bg-forest-800 text-forest-900 dark:text-sage-300 rounded font-semibold"
                >
                  {t('actionCancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={dispatching || (!selectedResourceId && !selectedResponderId)}
                  className="px-5 py-2 bg-forest-800 hover:bg-forest-700 text-ivory-50 font-bold rounded transition-colors flex items-center gap-1.5 shadow disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                  <span>{dispatching ? t('deploying', 'Deploying...') : t('actionAuthorizeDispatch', 'Authorize & Dispatch Unit')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
