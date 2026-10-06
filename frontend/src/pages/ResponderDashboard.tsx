import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Radio, MapPin, Navigation, CheckCircle, Clock, 
  Send, AlertTriangle, Shield, Truck, PhoneCall,
  AlertOctagon, Check, X, ShieldAlert, ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmergencyMap } from '../components/map/EmergencyMap';

export const ResponderDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [dutyStatus, setDutyStatus] = useState<'ON_DUTY' | 'EN_ROUTE' | 'ON_SCENE' | 'OFF_DUTY'>('ON_DUTY');
  const [assignment, setAssignment] = useState<any>(null);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fieldNote, setFieldNote] = useState('');
  const [reporting, setReporting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);

  // Position state
  const [currentLat, setCurrentLat] = useState<number>(13.0845);
  const [currentLng, setCurrentLng] = useState<number>(80.2720);

  const fetchDutyData = async () => {
    try {
      const data = await api.responders.myAssignment();
      if (data.assigned) {
        setAssignment(data.incident);
        setRouteInfo(data.route);
        if (data.responder?.status) setDutyStatus(data.responder.status);
      } else {
        setAssignment(null);
        setRouteInfo(null);
      }
    } catch {
      setAssignment(null);
      setRouteInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDutyData();

    // Capture initial device GPS if permitted
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLat(pos.coords.latitude);
          setCurrentLng(pos.coords.longitude);
        },
        () => {}
      );
    }

    // Subscribe to WebSocket for real-time dispatch signals & status changes
    const unsubscribe = wsService.subscribe((event) => {
      if (
        event.event === 'NEW_ASSIGNMENT' ||
        event.event === 'RESOURCE_DISPATCHED' ||
        event.event === 'INCIDENT_STATUS_UPDATED' ||
        event.event === 'ASSIGNMENT_STATUS_CHANGED'
      ) {
        if (event.event === 'NEW_ASSIGNMENT') {
          setAlertBanner(`🚨 ${t('newAssignmentAlert', 'NEW EMERGENCY ASSIGNMENT')}: #${event.incident_number} - ${event.incident_type}`);
        }
        fetchDutyData();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateDutyStatus = async (status: 'ON_DUTY' | 'EN_ROUTE' | 'ON_SCENE' | 'OFF_DUTY') => {
    setDutyStatus(status);
    try {
      await api.responders.heartbeat({
        status,
        latitude: currentLat,
        longitude: currentLng,
      });
      if (assignment) {
        if (status === 'ON_SCENE') {
          await api.responders.respondAssignment('ON_SCENE', 'Responder arrived on scene');
        } else if (status === 'EN_ROUTE') {
          await api.responders.respondAssignment('EN_ROUTE', 'Responder en route');
        }
        await fetchDutyData();
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
    }
  };

  // Dedicated responder assignment operational actions
  const handleAssignmentAction = async (action: 'ACCEPT' | 'REJECT' | 'EN_ROUTE' | 'ON_SCENE' | 'RESOLVE') => {
    setActionInProgress(true);
    try {
      await api.responders.respondAssignment(action);
      setAlertBanner(null);
      await fetchDutyData();
    } catch (err: any) {
      alert(err.message || `Failed to execute ${action}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSendFieldNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldNote.trim() || !assignment) return;
    setReporting(true);
    try {
      await api.reports.submit({
        incident_type: assignment.incident_type,
        description: `Responder Field SITREP: ${fieldNote}`,
        latitude: assignment.latitude,
        longitude: assignment.longitude,
        address: assignment.address,
        submitter_name: user?.full_name || 'Field Responder',
      });
      setFieldNote('');
      alert(t('fieldReportTransmitted', 'Field situation report transmitted to central command'));
      await fetchDutyData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit field report');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 font-sans">
      
      {/* Real-time Alert Banner */}
      {alertBanner && (
        <div className="bg-amber-50 dark:bg-forest-900 border border-amber-300 dark:border-amber-700/80 rounded p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 text-amber-900 dark:text-amber-200 font-bold text-sm">
            <AlertOctagon className="w-6 h-6 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span>{alertBanner}</span>
          </div>
          <button
            onClick={() => setAlertBanner(null)}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded transition-colors"
          >
            {t('actionAcknowledge', 'Acknowledge')}
          </button>
        </div>
      )}

      {/* Top Profile & Duty Toggle */}
      <div className="bg-ivory-100/90 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-forest-700 dark:text-sage-400 uppercase tracking-widest">
            {t('tacticalTerminal', 'Tactical Responder Field Terminal')}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-forest-950 dark:text-white mt-0.5">
            {user?.full_name || 'Field Operative'}
          </h1>
          <p className="text-xs text-sage-700 dark:text-sage-400 mt-0.5">
            {t('unitBadge', 'Unit Badge')}: <span className="font-mono font-semibold text-forest-900 dark:text-sage-200">SWR-042 (Rapid Emergency Tactical Responder)</span>
          </p>
        </div>

        {/* Duty Status Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(['ON_DUTY', 'EN_ROUTE', 'ON_SCENE', 'OFF_DUTY'] as const).map((st) => (
            <button
              key={st}
              onClick={() => handleUpdateDutyStatus(st)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                dutyStatus === st
                  ? 'bg-forest-800 dark:bg-forest-700 text-ivory-50 shadow-sm'
                  : 'bg-ivory-200 dark:bg-forest-850 text-forest-900 dark:text-sage-400 hover:text-forest-950 dark:hover:text-white border border-ivory-300 dark:border-forest-700'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Active Assignment Section */}
      <div className="bg-ivory-100/90 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-forest-950 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2 border-b border-ivory-300 dark:border-forest-800 pb-3">
          <Truck className="w-4 h-4 text-forest-700 dark:text-sage-400" />
          {t('activeDispatchedMission', 'Active Dispatched Mission')}
        </h2>

        {assignment ? (
          <div className="space-y-4 text-xs">
            {/* Header & Badges */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-mono font-bold text-forest-800 dark:text-sage-300">#{assignment.incident_number}</span>
                <h3 className="text-base font-bold text-forest-950 dark:text-white mt-0.5">{assignment.title}</h3>
                <div className="text-sage-700 dark:text-sage-400 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-sage-500" />
                  <span>{assignment.address}</span>
                  <span className="font-mono text-sage-600">[{assignment.latitude?.toFixed(4)}, {assignment.longitude?.toFixed(4)}]</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SeverityBadge severity={assignment.severity_class} score={assignment.severity_score} />
                <StatusBadge status={assignment.status} />
              </div>
            </div>

            {/* Tactical Mission Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-ivory-50 dark:bg-forest-950 rounded border border-ivory-300 dark:border-forest-800 space-y-1">
                <span className="font-bold text-sage-700 dark:text-sage-400 block font-mono text-[10px]">INCIDENT SITUATION:</span>
                <p className="text-forest-900 dark:text-sage-300 leading-relaxed font-sans">{assignment.description}</p>
              </div>

              <div className="p-3 bg-ivory-50 dark:bg-forest-950 rounded border border-ivory-300 dark:border-forest-800 space-y-1 font-mono text-[11px]">
                <span className="font-bold text-sage-700 dark:text-sage-400 block font-mono text-[10px]">TACTICAL PARAMETERS:</span>
                <div className="text-forest-900 dark:text-sage-300">Hazard Type: <strong className="text-forest-950 dark:text-white">{assignment.incident_type}</strong></div>
                <div className="text-forest-900 dark:text-sage-300">People Affected: <strong className="text-forest-950 dark:text-white">{assignment.affected_people_estimate || 'Unknown'}</strong></div>
                <div className="text-forest-900 dark:text-sage-300">Injuries Reported: <strong className="text-red-700 dark:text-red-400">{assignment.injuries_count || 0}</strong></div>
                {assignment.hazards_description && (
                  <div className="text-amber-800 dark:text-amber-300">Secondary Hazards: {assignment.hazards_description}</div>
                )}
                {routeInfo?.distance_km && (
                  <div className="text-forest-700 dark:text-sage-300 font-bold pt-1">
                    Route: {routeInfo.distance_km} km (~{routeInfo.eta_minutes} min ETA)
                  </div>
                )}
              </div>
            </div>

            {/* Operational Tactical Actions */}
            <div className="p-4 bg-ivory-50 dark:bg-forest-950 rounded border border-ivory-300 dark:border-forest-800 space-y-3">
              <span className="text-[11px] font-bold text-forest-900 dark:text-sage-300 uppercase tracking-wider font-mono block">
                Operational Command Actions:
              </span>
              <div className="flex flex-wrap gap-2">
                {assignment.status === 'DISPATCHED' && (
                  <>
                    <button
                      onClick={() => handleAssignmentAction('ACCEPT')}
                      disabled={actionInProgress}
                      className="px-4 py-2 bg-forest-800 hover:bg-forest-700 text-ivory-50 font-bold rounded transition-colors flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-4 h-4" />
                      <span>{t('acceptMission', 'Accept Mission')}</span>
                    </button>
                    <button
                      onClick={() => handleAssignmentAction('REJECT')}
                      disabled={actionInProgress}
                      className="px-3 py-2 bg-ivory-200 dark:bg-forest-850 hover:bg-red-100 dark:hover:bg-red-950 text-red-700 dark:text-red-400 font-semibold rounded border border-ivory-300 dark:border-forest-700 transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      <span>{t('declineMission', 'Decline / Unavailable')}</span>
                    </button>
                  </>
                )}

                {assignment.status === 'RESPONDER_EN_ROUTE' && (
                  <button
                    onClick={() => handleAssignmentAction('ON_SCENE')}
                    disabled={actionInProgress}
                    className="px-4 py-2 bg-forest-800 hover:bg-forest-700 text-ivory-50 font-bold rounded transition-colors flex items-center gap-1.5 shadow"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>{t('arrivedOnScene', 'Arrived On Scene')}</span>
                  </button>
                )}

                {assignment.status === 'ON_SCENE' && (
                  <button
                    onClick={() => handleAssignmentAction('RESOLVE')}
                    disabled={actionInProgress}
                    className="px-4 py-2 bg-forest-800 hover:bg-forest-700 text-ivory-50 font-bold rounded transition-colors flex items-center gap-1.5 shadow"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{t('resolveStandDown', 'Resolve Incident & Stand Down')}</span>
                  </button>
                )}

                <Link
                  to={`/incidents/${assignment.id}`}
                  className="px-4 py-2 bg-ivory-200 dark:bg-forest-850 hover:bg-ivory-300 dark:hover:bg-forest-750 text-forest-900 dark:text-sage-200 rounded font-semibold border border-ivory-300 dark:border-forest-700 transition-colors flex items-center gap-1.5"
                >
                  <span>{t('fullDossier', 'Full Intelligence Dossier')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Map Preview with Route */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-sage-600 dark:text-sage-400">Tactical Navigation Map:</span>
              <div className="rounded overflow-hidden border border-ivory-300 dark:border-forest-800">
                <EmergencyMap
                  center={[assignment.latitude, assignment.longitude]}
                  zoom={14}
                  incidents={[assignment]}
                  routePolyline={routeInfo?.geometry?.coordinates ? routeInfo.geometry.coordinates.map((c: number[]) => [c[1], c[0]]) : undefined}
                  height="220px"
                />
              </div>
            </div>

            {/* Field Situation Report Form */}
            <form onSubmit={handleSendFieldNote} className="pt-4 border-t border-ivory-300 dark:border-forest-800 space-y-2">
              <label className="block text-xs font-bold text-forest-900 dark:text-sage-300 uppercase tracking-wider">
                {t('transmitFieldReport', 'Transmit On-Scene Field Report / SITREP Update')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={fieldNote}
                  onChange={(e) => setFieldNote(e.target.value)}
                  placeholder="e.g. Arrived at scene. Perimeter contained. Extricating 2 trapped passengers..."
                  className="flex-1 bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded px-3 py-2 text-xs text-forest-950 dark:text-white placeholder-sage-500 focus:outline-none focus:border-forest-600"
                />
                <button
                  type="submit"
                  disabled={reporting || !fieldNote.trim()}
                  className="px-4 py-2 bg-forest-800 hover:bg-forest-700 text-ivory-50 font-bold rounded transition-colors flex items-center gap-1.5 disabled:opacity-40 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t('actionTransmit', 'Transmit')}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-sage-600 dark:text-sage-400 space-y-2">
            <Radio className="w-8 h-8 mx-auto text-sage-500 animate-pulse" />
            <p className="font-semibold text-forest-900 dark:text-sage-300">{t('noActiveMission', 'No active emergency mission currently assigned to this unit.')}</p>
            <p className="text-sage-600 dark:text-sage-500">{t('maintainStandby', 'Maintain standby readiness. Dispatch orders from Command will appear here automatically.')}</p>
          </div>
        )}
      </div>

    </div>
  );
};
