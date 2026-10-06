import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Radio, AlertOctagon, ShieldAlert, Truck, Users, 
  MapPin, Clock, ArrowRight, ShieldCheck, RefreshCw, 
  ChevronRight, Sparkles, CloudRain, AlertTriangle, Globe2
} from 'lucide-react';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { Incident, Responder, Resource } from '../types';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface ActivityItem {
  id: string;
  time: string;
  text: string;
  type: 'NEW' | 'ASSIGN' | 'VERIFY' | 'ON_SCENE' | 'RESOLVE' | 'SOS';
}

export const LandingPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [incData, resData, respData] = await Promise.all([
        api.incidents.list(),
        api.resources.list(),
        api.responders.list(),
      ]);
      setIncidents(incData);
      setResources(resData);
      setResponders(respData);

      // Build real activity feed from backend data
      const recentList: ActivityItem[] = [];
      incData.slice(0, 6).forEach((inc) => {
        const timeAgo = formatTimeAgo(inc.created_at);
        if (inc.status === 'REPORTED' || inc.status === 'PENDING_VERIFICATION') {
          recentList.push({
            id: `act-${inc.id}-rep`,
            time: timeAgo,
            text: `${inc.incident_type} • ${inc.address || 'District Sector'}`,
            type: 'NEW',
          });
        } else if (inc.status === 'VERIFIED') {
          recentList.push({
            id: `act-${inc.id}-ver`,
            time: timeAgo,
            text: `#${inc.incident_number} (${inc.incident_type}) • ${t('statusVerified', 'Verified')}`,
            type: 'VERIFY',
          });
        } else if (inc.status === 'DISPATCHED' || inc.status === 'RESPONDER_EN_ROUTE') {
          recentList.push({
            id: `act-${inc.id}-disp`,
            time: timeAgo,
            text: `#${inc.incident_number} • ${t('statusDispatched', 'Dispatched')}`,
            type: 'ASSIGN',
          });
        } else if (inc.status === 'ON_SCENE') {
          recentList.push({
            id: `act-${inc.id}-scene`,
            time: timeAgo,
            text: `#${inc.incident_number} • ${t('statusOnScene', 'On Scene')}`,
            type: 'ON_SCENE',
          });
        } else if (inc.status === 'RESOLVED') {
          recentList.push({
            id: `act-${inc.id}-res`,
            time: timeAgo,
            text: `#${inc.incident_number} • ${t('statusResolved', 'Resolved')}`,
            type: 'RESOLVE',
          });
        }
      });
      setActivities(recentList);
    } catch (err) {
      console.error('Failed to fetch dashboard telemetry:', err);
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
        event.event === 'SOS_ALERT'
      ) {
        loadData();
      }
    });

    return () => unsubscribe();
  }, []);

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.max(1, Math.floor(diffMs / 60000));
      if (diffMins < 60) return `${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hr`;
      return `${Math.floor(diffHours / 24)} d`;
    } catch {
      return 'Just now';
    }
  };

  // Operational metrics calculated from actual backend data
  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
  const criticalCount = activeIncidents.filter((i) => i.severity_class === 'CRITICAL' || (i.severity_score && i.severity_score >= 8.0)).length;
  const respondersAvailable = responders.filter((r) => r.status === 'ON_DUTY').length;
  const peopleAffectedTotal = activeIncidents.reduce((acc, curr) => acc + (curr.affected_people_estimate || 1), 0);

  // Top Priority Incidents (sorted by severity score descending)
  const priorityIncidents = [...activeIncidents]
    .sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0))
    .slice(0, 4);

  // Concise AI Priority Insight derived from highest risk incident
  const topIncident = priorityIncidents[0];
  const aiInsightMessage = topIncident
    ? `${topIncident.incident_type} in ${(topIncident.address || 'District HQ').split(',')[0]} (Risk: ${(topIncident.severity_score || 8.5).toFixed(1)}/10). Road access verification recommended.`
    : 'All sectors reporting baseline operational parameters.';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      
      {/* 1. Dashboard Header: Institutional Editorial Structure */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ivory-300 dark:border-forest-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-forest-600 dark:bg-forest-400 animate-pulse" />
            <span className="text-[11px] font-mono font-bold text-forest-800 dark:text-sage-300 uppercase tracking-widest">
              RESQINTEL AI • {t('govtHeader', 'National Emergency Operations & Public Safety Command')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-forest-950 dark:text-ivory-50 mt-1 tracking-tight">
            {t('appTagline', 'Emergency Response Intelligence Platform')}
          </h1>
          <p className="text-xs sm:text-sm italic text-forest-700 dark:text-sage-400 mt-0.5">
            “{t('appMission', 'From scattered emergency signals to coordinated action.')}”
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-ivory-50 dark:bg-forest-900 hover:bg-ivory-200 dark:hover:bg-forest-800 border border-ivory-300 dark:border-forest-700 rounded text-xs font-semibold text-forest-900 dark:text-sage-200 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-forest-700 dark:text-sage-300 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('btnRefresh', 'Refresh Telemetry')}</span>
          </button>

          <Link
            to="/report"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-forest-900 hover:bg-forest-800 dark:bg-forest-800 dark:hover:bg-forest-700 text-ivory-50 rounded text-xs font-semibold shadow-sm transition-all border border-forest-700"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-ivory-200" />
            <span>{t('btnSubmitReport', 'Report Emergency')}</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Summary: 4 Government-Report Statistic Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Active Incidents */}
        <div className="bg-ivory-50 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-mono font-bold text-forest-700 dark:text-sage-400 uppercase tracking-wider flex items-center justify-between">
            <span>{t('dashActiveIncidents', 'ACTIVE INCIDENTS')}</span>
            <Radio className="w-4 h-4 text-forest-700 dark:text-sage-300" />
          </div>
          <div className="text-3xl font-bold text-forest-950 dark:text-ivory-50 mt-2 font-mono">
            {loading ? '-' : activeIncidents.length}
          </div>
          <div className="text-[11px] text-sage-700 dark:text-sage-400 mt-1">
            {t('kpiActiveIncidents', 'Live operational incidents')}
          </div>
        </div>

        {/* Critical Threats */}
        <div className="bg-ivory-50 dark:bg-forest-900/90 border border-red-300 dark:border-red-900/70 p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-mono font-bold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center justify-between">
            <span>{t('dashCriticalThreats', 'CRITICAL')}</span>
            <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400 animate-pulse" />
          </div>
          <div className="text-3xl font-bold text-red-700 dark:text-red-400 mt-2 font-mono">
            {loading ? '-' : criticalCount}
          </div>
          <div className="text-[11px] text-red-700 dark:text-red-400 mt-1">
            {t('kpiCriticalThreats', 'Immediate attention required')}
          </div>
        </div>

        {/* Responders Available */}
        <div className="bg-ivory-50 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-mono font-bold text-forest-700 dark:text-sage-400 uppercase tracking-wider flex items-center justify-between">
            <span>{t('dashRespondersAvailable', 'RESPONDERS AVAILABLE')}</span>
            <Truck className="w-4 h-4 text-forest-700 dark:text-sage-300" />
          </div>
          <div className="text-3xl font-bold text-forest-800 dark:text-sage-200 mt-2 font-mono">
            {loading ? '-' : respondersAvailable} <span className="text-sm font-normal text-sage-600 dark:text-sage-400">/ {responders.length || 8}</span>
          </div>
          <div className="text-[11px] text-sage-700 dark:text-sage-400 mt-1">
            {t('kpiAvailableFleet', 'Ready for deployment')}
          </div>
        </div>

        {/* People Affected */}
        <div className="bg-ivory-50 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-mono font-bold text-forest-700 dark:text-sage-400 uppercase tracking-wider flex items-center justify-between">
            <span>{t('dashPeopleAffected', 'PEOPLE AFFECTED')}</span>
            <Users className="w-4 h-4 text-forest-700 dark:text-sage-300" />
          </div>
          <div className="text-3xl font-bold text-forest-950 dark:text-ivory-50 mt-2 font-mono">
            {loading ? '-' : peopleAffectedTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-sage-700 dark:text-sage-400 mt-1">
            {t('kpiPeopleAffected', 'Current estimated impact')}
          </div>
        </div>

      </div>

      {/* 3. Main Area: Live Situation Map */}
      <div className="bg-ivory-50 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-forest-100 dark:bg-forest-800 text-forest-800 dark:text-sage-300 border border-forest-300 dark:border-forest-700">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-forest-950 dark:text-ivory-50 uppercase tracking-wide">
                {t('dashLiveSituationMap', 'LIVE SITUATION MAP')}
              </h2>
              <p className="text-[11px] text-sage-700 dark:text-sage-400">
                Active incidents • Responders • Resources • Staged Perimeters
              </p>
            </div>
          </div>
          <Link
            to="/map"
            className="text-xs font-semibold text-forest-800 dark:text-sage-300 hover:underline flex items-center gap-1 font-mono uppercase"
          >
            <span>FULLSCREEN GIS →</span>
          </Link>
        </div>

        <div className="rounded-lg border border-ivory-300 dark:border-forest-800 overflow-hidden shadow-inner" style={{ minHeight: '380px' }}>
          <EmergencyMap
            incidents={incidents}
            resources={resources}
            responders={responders}
            height="400px"
            onIncidentClick={(inc) => navigate(`/incidents/${inc.id}`)}
          />
        </div>
      </div>

      {/* 4. Priority Incidents & Recent Operational Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Priority Incidents (Spans 2 Columns) */}
        <div className="lg:col-span-2 bg-ivory-50 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-ivory-200 dark:border-forest-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h2 className="font-bold text-sm text-forest-950 dark:text-ivory-50 uppercase tracking-wider">
                {t('dashPriorityIncidents', 'PRIORITY INCIDENTS')}
              </h2>
            </div>
            <Link
              to="/dispatcher"
              className="text-xs font-semibold text-forest-800 dark:text-sage-300 hover:underline flex items-center gap-1 font-mono"
            >
              <span>{t('tabIncidentQueue', 'Command Center Queue')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {priorityIncidents.length === 0 ? (
            <div className="py-8 text-center text-xs text-sage-600 dark:text-sage-400">
              {t('dashNoPriorityIncidents', 'No urgent or critical incidents requiring immediate intervention.')}
            </div>
          ) : (
            <div className="space-y-3">
              {priorityIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-ivory-300 dark:border-forest-800 bg-ivory-50 dark:bg-forest-950/60 hover:bg-ivory-100 dark:hover:bg-forest-950 transition-all gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[11px] uppercase px-2.5 py-0.5 rounded bg-forest-100 dark:bg-forest-800 text-forest-900 dark:text-sage-300 border border-forest-300 dark:border-forest-700">
                        {inc.incident_type}
                      </span>
                      <SeverityBadge severity={inc.severity_class} />
                      <StatusBadge status={inc.status} />
                    </div>
                    <div className="font-bold text-sm text-forest-950 dark:text-ivory-50 ">
                      {inc.title}
                    </div>
                    <div className="text-xs text-sage-700 dark:text-sage-400 flex items-center gap-1 font-sans">
                      <MapPin className="w-3.5 h-3.5 text-sage-500" />
                      <span>{inc.address}</span>
                      <span className="mx-1">•</span>
                      <Clock className="w-3.5 h-3.5 text-sage-500" />
                      <span>{formatTimeAgo(inc.created_at)}</span>
                    </div>
                  </div>

                  <Link
                    to={`/incidents/${inc.id}`}
                    className="self-start sm:self-center px-4 py-2 bg-forest-900 hover:bg-forest-800 dark:bg-forest-800 dark:hover:bg-forest-700 text-ivory-50 rounded text-xs font-semibold transition-colors shadow-sm flex items-center gap-1 whitespace-nowrap border border-forest-700"
                  >
                    <span>{t('dashViewIncident', 'View Incident')}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Operational Activity Feed (Spans 1 Column) */}
        <div className="bg-ivory-50 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded-xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-ivory-200 dark:border-forest-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-forest-700 dark:text-sage-300" />
                <h2 className="font-bold text-sm text-forest-950 dark:text-ivory-50 uppercase tracking-wider">
                  {t('dashRecentActivity', 'RECENT ACTIVITY')}
                </h2>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            <div className="mt-3 space-y-3">
              {activities.length === 0 ? (
                <div className="py-6 text-center text-xs text-sage-600 dark:text-sage-400">
                  {t('dashNoRecentActivity', 'Awaiting new emergency signals or field status updates.')}
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-forest-600 dark:bg-forest-400 mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-forest-950 dark:text-sage-200 font-medium leading-snug">{act.text}</p>
                      <span className="text-[10px] text-sage-600 dark:text-sage-400 font-mono">{act.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-ivory-200 dark:border-forest-800">
            <Link
              to="/notifications"
              className="text-xs font-semibold text-forest-800 dark:text-sage-300 hover:underline flex items-center justify-center gap-1 font-mono uppercase"
            >
              <span>{t('navNotifications', 'Audit Notifications')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* 5. Concise AI Operational Priority Insight & Situation Alert Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* AI Priority Insight */}
        <div className="bg-ivory-50 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-ivory-200 dark:border-forest-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-forest-700 dark:text-sage-300" />
              <span className="text-xs font-mono font-bold text-forest-950 dark:text-ivory-50 uppercase tracking-wider">
                {t('dashAiPriorityInsight', 'AI PRIORITY INSIGHT')}
              </span>
            </div>
          </div>
          
          <p className="text-xs text-forest-900 dark:text-sage-200 my-3 font-medium leading-relaxed font-sans">
            {aiInsightMessage}
          </p>

          <div>
            <Link
              to={topIncident ? `/incidents/${topIncident.id}` : '/dispatcher'}
              className="inline-flex items-center gap-1 px-4 py-1.5 bg-forest-900 hover:bg-forest-800 dark:bg-forest-800 dark:hover:bg-forest-700 text-ivory-50 rounded text-xs font-semibold transition-all shadow-sm border border-forest-700"
            >
              <span>{t('dashViewAnalysis', 'View Analysis')}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Situation Intelligence Alert */}
        <div className="bg-ivory-50 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-ivory-200 dark:border-forest-800">
            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-forest-700 dark:text-sage-300" />
              <span className="text-xs font-mono font-bold text-forest-950 dark:text-ivory-50 uppercase tracking-wider">
                {t('dashSituationAlert', 'SITUATION ALERT')}
              </span>
            </div>
          </div>

          <p className="text-xs text-forest-900 dark:text-sage-200 my-3 font-medium leading-relaxed font-sans">
            {t('dashPrecipitationAlert', 'Precipitation and regional hazard feeds active. Road accessibility surveillance in effect.')}
          </p>

          <div>
            <Link
              to="/analyst"
              className="inline-flex items-center gap-1 px-4 py-1.5 bg-ivory-200 hover:bg-ivory-300 dark:bg-forest-800 dark:hover:bg-forest-700 text-forest-950 dark:text-ivory-50 rounded text-xs font-semibold transition-all shadow-sm border border-ivory-300 dark:border-forest-700"
            >
              <span>{t('dashViewSituationIntel', 'View Situation Intelligence')}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
};
