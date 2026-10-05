import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ShieldAlert, CheckCircle, AlertTriangle, AlertOctagon, MapPin, 
  Clock, Truck, Users, Activity, Bot, RefreshCw, Send, Plus, 
  FileText, ShieldCheck, CornerDownRight, Navigation, CloudRain, Camera,
  Volume2, Play, Image as ImageIcon, ExternalLink, Eye, Mic, Video
} from 'lucide-react';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmergencyMap } from '../components/map/EmergencyMap';

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Verification action modal state
  const [verifying, setVerifying] = useState(false);
  const [verifNotes, setVerifNotes] = useState('');

  // Dispatch action state
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [dispatching, setDispatching] = useState(false);

  // Status transition state
  const [newStatus, setNewStatus] = useState('');

  // AI Re-evaluation
  const [reevaluating, setReevaluating] = useState(false);

  const [responders, setResponders] = useState<any[]>([]);
  const [selectedResponderId, setSelectedResponderId] = useState('');

  const fetchIncidentData = async () => {
    if (!id) return;
    try {
      const data = await api.incidents.get(id);
      setIncident(data);
      const [resList, respList] = await Promise.all([
        api.resources.list(),
        api.responders.list()
      ]);
      setResources(resList);
      setResponders(respList);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch incident details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentData();

    // Real-time synchronization
    const unsubscribe = wsService.subscribe((event) => {
      if (
        event.incident_id === id ||
        event.event === 'INCIDENT_STATUS_UPDATED' ||
        event.event === 'RESOURCE_DISPATCHED' ||
        event.event === 'ASSIGNMENT_STATUS_CHANGED' ||
        event.event === 'INCIDENT_VERIFIED' ||
        event.event === 'AI_ANALYSIS_UPDATED'
      ) {
        fetchIncidentData();
      }
    });

    return () => unsubscribe();
  }, [id]);

  // Handle Human Verification
  const handleVerify = async (status: 'VERIFIED' | 'REJECTED') => {
    if (!id) return;
    setVerifying(true);
    try {
      await api.incidents.verify(id, {
        verification_status: status,
        verification_notes: verifNotes || `Official human operator confirmation by ${user?.full_name}`,
      });
      await fetchIncidentData();
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  // Handle Resource / Responder Dispatch Authorization
  const handleDispatchResource = async (resourceId?: string, responderId?: string) => {
    if (!id) return;
    const resId = resourceId || selectedResourceId;
    const respId = responderId || selectedResponderId;
    if (!resId && !respId) {
      alert('Please select an emergency asset or responder unit to deploy.');
      return;
    }

    setDispatching(true);
    try {
      await api.resources.assign({
        incident_id: id,
        resource_id: resId || undefined,
        responder_id: respId || undefined,
        notes: `Deployment approved by Dispatcher ${user?.full_name}`,
      });
      setSelectedResourceId('');
      setSelectedResponderId('');
      await fetchIncidentData();
    } catch (err: any) {
      alert(err.message || 'Dispatch deployment failed');
    } finally {
      setDispatching(false);
    }
  };

  // Handle Status Update
  const handleStatusChange = async (targetStatus: string) => {
    if (!id) return;
    try {
      await api.incidents.updateStatus(id, targetStatus, `Advanced by ${user?.full_name}`);
      await fetchIncidentData();
    } catch (err: any) {
      alert(err.message || 'Status transition failed');
    }
  };

  // Trigger continuous re-evaluation
  const handleReevaluate = async () => {
    if (!id) return;
    setReevaluating(true);
    try {
      await api.ai.reevaluate(id);
      await fetchIncidentData();
    } catch (err: any) {
      alert(err.message || 'Re-evaluation failed');
    } finally {
      setReevaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-sage-600 dark:text-sage-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-forest-700 mb-3" />
        <p className="text-sm">{t('loadingDossier', 'Synthesizing incident intelligence dossier...')}</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-red-700 dark:text-red-400">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">{error || t('incidentNotFound', 'Incident record not found.')}</p>
        <Link to="/dispatcher" className="mt-4 inline-block px-4 py-2 bg-forest-800 text-ivory-50 rounded text-xs">
          {t('returnCommandCenter', 'Return to Command Center')}
        </Link>
      </div>
    );
  }

  const aiAnalysis = incident.ai_analysis;
  const conflicts = aiAnalysis?.conflicts?.conflicts || [];
  const missingItems = aiAnalysis?.missing_information?.missing_items || [];
  const factors = aiAnalysis?.contributing_factors || [];
  const assignedUnits = incident.assignments || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      
      {/* Incident Header & Verification Bar */}
      <div className="bg-ivory-100/90 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ivory-300 dark:border-forest-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-forest-800 dark:text-sage-300">
                #{incident.incident_number}
              </span>
              <SeverityBadge severity={incident.severity_class} score={incident.severity_score} />
              <StatusBadge status={incident.status} />
              {incident.is_demo && (
                <span className="text-[10px] bg-ivory-200 dark:bg-forest-850 text-sage-700 dark:text-sage-400 px-1.5 py-0.5 rounded font-mono">
                  DEMO SCENARIO
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-forest-950 dark:text-white font-serif">
              {incident.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-sage-700 dark:text-sage-400 mt-1">
              <MapPin className="w-3.5 h-3.5 text-sage-500" />
              <span>{incident.address || `Coordinates [${incident.latitude}, ${incident.longitude}]`}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleReevaluate}
              disabled={reevaluating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ivory-200 dark:bg-forest-850 hover:bg-ivory-300 dark:hover:bg-forest-800 text-forest-900 dark:text-sage-200 rounded text-xs font-medium border border-ivory-300 dark:border-forest-700 disabled:opacity-50 transition-colors"
              title="Continuous Multi-Agent Re-evaluation"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reevaluating ? 'animate-spin text-forest-700' : ''}`} />
              <span>{t('reevaluateAI', 'Re-Evaluate AI')}</span>
            </button>

            <Link
              to={`/sitrep?incident_id=${incident.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-forest-800 hover:bg-forest-700 text-ivory-50 rounded text-xs font-medium transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-ivory-200" />
              <span>{t('generateSitrep', 'Generate SITREP')}</span>
            </Link>
          </div>
        </div>

        {/* HUMAN VERIFICATION CONTROL */}
        {incident.verification_status === 'UNVERIFIED' && (
          <div className="bg-amber-50 dark:bg-forest-850 border border-amber-300 dark:border-amber-700/80 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold text-xs text-amber-900 dark:text-amber-200 uppercase tracking-wider block">
                  {t('humanVerifRequired', 'HUMAN VERIFICATION REQUIRED (Decision-Support Policy)')}
                </span>
                <span className="text-xs text-amber-800 dark:text-amber-300/90">
                  {t('verifAdvisory', 'AI analysis suggests ' + incident.severity_class + ' ' + incident.incident_type + '. An authorized dispatcher must verify on-scene evidence before fleet dispatch.')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleVerify('VERIFIED')}
                disabled={verifying}
                className="px-4 py-2 bg-forest-800 hover:bg-forest-700 text-ivory-50 font-bold text-xs rounded shadow transition-colors flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{t('actionVerify', 'Verify Incident')}</span>
              </button>
              <button
                onClick={() => handleVerify('REJECTED')}
                disabled={verifying}
                className="px-3 py-2 bg-ivory-200 dark:bg-forest-800 hover:bg-ivory-300 dark:hover:bg-forest-750 text-red-700 dark:text-red-400 text-xs rounded border border-ivory-300 dark:border-forest-700 font-medium transition-colors"
              >
                {t('actionReject', 'Reject & Close')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONFLICT DETECTION WARNING BANNER */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 dark:bg-forest-900 border border-red-300 dark:border-red-800 rounded p-4 shadow-sm flex items-start gap-4">
          <AlertOctagon className="w-6 h-6 text-red-700 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-bold text-sm text-red-900 dark:text-red-200 uppercase tracking-wider flex items-center gap-2">
              <span>⚠️ {t('conflictDetected', 'CONFLICT DETECTED IN FIELD REPORTS')}</span>
              <span className="text-[10px] bg-red-700 px-1.5 py-0.5 rounded text-white font-mono">
                {conflicts.length} Contradiction{conflicts.length > 1 ? 's' : ''}
              </span>
            </div>
            {conflicts.map((c: any, idx: number) => (
              <div key={idx} className="text-red-800 dark:text-red-200/90 leading-relaxed">
                • {c.detected_contradiction} — <strong className="text-red-950 dark:text-white">Required Action:</strong> {c.human_action_required}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 2-Column Intelligence Dossier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Explainability, Evidence, Missing Info, Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* "Why this incident is prioritized" Explainability Panel */}
          <div className="bg-ivory-100/80 dark:bg-forest-900/80 border border-ivory-300 dark:border-forest-800 rounded p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-ivory-300 dark:border-forest-800 pb-2">
              <span className="text-xs font-bold text-forest-950 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-forest-700 dark:text-sage-300" />
                {t('explainabilityHeader', 'Why this incident is prioritized (AI Explainability)')}
              </span>
              <span className="text-[10px] font-mono text-forest-800 dark:text-sage-300 bg-ivory-200 dark:bg-forest-850 px-2 py-0.5 rounded border border-ivory-300 dark:border-forest-700">
                Score: {incident.severity_score}/10
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {factors.length > 0 ? (
                factors.map((f: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-ivory-50 dark:bg-forest-950 rounded border border-ivory-300 dark:border-forest-800 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-forest-950 dark:text-slate-200 flex items-center gap-1.5">
                        <span>{f.factor}</span>
                        {f.raw_value && <span className="text-[10px] font-mono text-sage-600 dark:text-sage-400">[{f.raw_value}]</span>}
                      </div>
                      <div className="text-sage-700 dark:text-sage-400 text-[11px] mt-0.5">{f.rationale}</div>
                    </div>
                    <div className="font-mono font-bold text-forest-800 dark:text-sage-300 text-xs whitespace-nowrap">
                      +{f.score_contribution} pts
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sage-600 dark:text-sage-400 py-2">Baseline multi-criteria evaluation in effect.</div>
              )}
            </div>

            <div className="text-[10px] text-sage-600 dark:text-sage-500 pt-1 border-t border-ivory-300 dark:border-forest-800">
              Explainable Multi-Factor Severity Engine v2.1 • Calculated deterministically from multi-signal weights • Consequential dispatch requires human operator verification.
            </div>
          </div>

          {/* MISSING INFORMATION CHECKLIST */}
          <div className="bg-ivory-100/80 dark:bg-forest-900/80 border border-ivory-300 dark:border-forest-800 rounded p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-ivory-300 dark:border-forest-800 pb-2">
              <span className="text-xs font-bold text-forest-950 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                {t('missingInfoChecklist', 'Operational Completeness & Missing Information Checklist')}
              </span>
              <span className="text-[10px] font-mono text-sage-700 dark:text-sage-400">
                {missingItems.length === 0 ? '100% COMPLETE' : `${missingItems.length} ITEM(S) PENDING`}
              </span>
            </div>

            {missingItems.length > 0 ? (
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-amber-50 dark:bg-forest-950 border border-amber-200 dark:border-amber-800 rounded text-amber-900 dark:text-amber-200">
                  <span className="font-bold block mb-1">Verify with Field Scout or Responders:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {missingItems.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-xs text-forest-800 dark:text-sage-300 flex items-center gap-2 p-2 bg-forest-50 dark:bg-forest-950 rounded border border-forest-200 dark:border-forest-800">
                <CheckCircle className="w-4 h-4 text-forest-700 dark:text-sage-300" />
                <span>All essential operational parameters (GPS, casualties, hazards, access) have been recorded.</span>
              </div>
            )}
          </div>

          {/* MULTIMODAL EVIDENCE FUSION */}
          <div className="bg-ivory-100/80 dark:bg-forest-900/80 border border-ivory-300 dark:border-forest-800 rounded p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-ivory-300 dark:border-forest-800 pb-2">
              <span className="text-xs font-bold text-forest-950 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-forest-700 dark:text-sage-300" />
                {t('multimodalDossier', 'Multimodal Corroborating Evidence Dossier')} ({incident.reports?.length || 0} Reports)
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {incident.reports?.map((rpt: any) => {
                const reportAudios = incident.media?.filter((m: any) => (m.report_id === rpt.id || !m.report_id) && (m.media_type === 'AUDIO' || m.file_name?.match(/\.(webm|wav|mp3|ogg|m4a)$/i))) || [];
                const reportImages = incident.media?.filter((m: any) => (m.report_id === rpt.id) && (m.media_type === 'IMAGE' || m.file_name?.match(/\.(jpg|jpeg|png|webp|gif)$/i))) || [];

                return (
                  <div key={rpt.id} className="p-3 bg-ivory-50 dark:bg-forest-950 rounded border border-ivory-300 dark:border-forest-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-forest-950 dark:text-slate-200">
                        {rpt.report_type} ({rpt.submitter_name || 'Anonymous'})
                      </span>
                      <span className="text-[10px] text-sage-600 dark:text-sage-400 font-mono">
                        {new Date(rpt.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-forest-900 dark:text-slate-300 leading-relaxed font-sans">{rpt.raw_text}</p>
                    
                    {rpt.transcript && (
                      <div className="p-2.5 bg-sage-50 dark:bg-forest-900 border border-sage-200 dark:border-forest-700 rounded text-[11px] text-forest-900 dark:text-sage-200 space-y-1">
                        <div className="font-bold text-[10px] text-forest-800 dark:text-sage-300 font-mono flex items-center gap-1">
                          <Mic className="w-3.5 h-3.5" />
                          <span>SPEECH TRANSCRIPTION</span>
                        </div>
                        <div className="italic">"{rpt.transcript}"</div>
                      </div>
                    )}

                    {/* Inline Voice Note Player if Audio available */}
                    {reportAudios.map((aud: any) => (
                      <div key={aud.id} className="p-2 bg-ivory-100 dark:bg-forest-900 rounded border border-ivory-300 dark:border-forest-800 space-y-1">
                        <div className="text-[10px] font-mono text-forest-800 dark:text-sage-300 font-bold flex items-center gap-1">
                          <Volume2 className="w-3 h-3" />
                          <span>Voice Distress Recording ({aud.file_name})</span>
                        </div>
                        <audio controls className="w-full h-8" src={aud.file_url} />
                      </div>
                    ))}

                    {/* Inline Image Thumbnail if attached to this report */}
                    {reportImages.length > 0 && (
                      <div className="flex gap-2 pt-1 flex-wrap">
                        {reportImages.map((img: any) => (
                          <div key={img.id} className="relative group rounded overflow-hidden border border-ivory-300 dark:border-forest-800 w-24 h-24 bg-ivory-200 dark:bg-black">
                            <img
                              src={img.file_url}
                              alt={img.file_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <a
                              href={img.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    {rpt.injuries_reported > 0 && (
                      <div className="text-[11px] text-red-700 dark:text-red-400 font-semibold font-mono pt-1">
                        ⚠️ {rpt.injuries_reported} injuries cited by submitter
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visual Media & Computer Vision Pipeline */}
          {incident.media && incident.media.length > 0 && (
            <div className="bg-ivory-100/80 dark:bg-forest-900/80 border border-ivory-300 dark:border-forest-800 rounded p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-ivory-300 dark:border-forest-800 pb-2">
                <span className="text-xs font-bold text-forest-950 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-forest-700 dark:text-sage-300" />
                  {t('visualMediaPipeline', 'Visual Media & Computer Vision Pipeline')} ({incident.media.length} Attachments)
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {incident.media.map((med: any) => {
                  const cv = med.cv_analysis_json || {};
                  const isReal = cv.status === 'REAL_INFERENCE';
                  const isUnavail = cv.status === 'MODEL_UNAVAILABLE' || cv.status === 'CONFIGURATION_REQUIRED';
                  const isImage = med.media_type === 'IMAGE' || med.file_name?.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                  const isAudio = med.media_type === 'AUDIO' || med.file_name?.match(/\.(webm|wav|mp3|ogg|m4a)$/i);
                  const isVideo = med.media_type === 'VIDEO' || med.file_name?.match(/\.(mp4|webm|mov)$/i);

                  return (
                    <div key={med.id} className="p-4 bg-ivory-50 dark:bg-forest-950 rounded border border-ivory-300 dark:border-forest-800 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {isImage && <ImageIcon className="w-4 h-4 text-forest-700 dark:text-sage-300" />}
                          {isAudio && <Volume2 className="w-4 h-4 text-forest-700 dark:text-sage-300" />}
                          {isVideo && <Video className="w-4 h-4 text-forest-700 dark:text-sage-300" />}
                          <span className="font-bold text-forest-950 dark:text-white font-mono">
                            {med.file_name}
                          </span>
                          <span className="text-[10px] text-sage-700 dark:text-sage-400 bg-ivory-200 dark:bg-forest-900 px-1.5 py-0.5 rounded font-mono">
                            {med.media_type}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={med.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 bg-ivory-100 dark:bg-forest-900 hover:bg-ivory-200 dark:hover:bg-forest-850 text-forest-900 dark:text-sage-300 rounded text-[11px] font-mono flex items-center gap-1 border border-ivory-300 dark:border-forest-700 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open Media</span>
                          </a>

                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                            isReal 
                              ? 'bg-forest-100 dark:bg-forest-950 text-forest-800 dark:text-sage-300 border-forest-300 dark:border-forest-700' 
                              : isUnavail 
                              ? 'bg-amber-100 dark:bg-forest-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700' 
                              : 'bg-ivory-200 dark:bg-forest-900 text-sage-800 dark:text-sage-400 border-ivory-300 dark:border-forest-800'
                          }`}>
                            {cv.status || (isAudio ? 'AUDIO_RECORDED' : 'UNPROCESSED')}
                          </span>
                        </div>
                      </div>

                      {/* ACTUAL PHOTO VIEWER */}
                      {isImage && (
                        <div className="relative rounded overflow-hidden bg-ivory-100 dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 flex items-center justify-center p-2 group">
                          <img
                            src={med.file_url}
                            alt={med.file_name}
                            className="max-h-96 w-auto object-contain rounded shadow-sm transition-transform group-hover:scale-[1.01]"
                          />
                        </div>
                      )}

                      {/* ACTUAL AUDIO PLAYER */}
                      {isAudio && (
                        <div className="p-3 bg-ivory-100 dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 rounded space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-forest-900 dark:text-sage-300 text-xs flex items-center gap-1.5 font-mono">
                              <Volume2 className="w-4 h-4 text-forest-700 dark:text-sage-400" />
                              Live Audio Recording Player
                            </span>
                            {cv.transcript && (
                              <span className="text-[10px] text-sage-700 dark:text-sage-400 font-mono">
                                Transcription Available
                              </span>
                            )}
                          </div>
                          <audio controls className="w-full h-10 rounded" src={med.file_url} />
                          {cv.transcript && (
                            <div className="text-[11px] text-forest-900 dark:text-slate-300 italic pt-1">
                              Transcript: "{cv.transcript}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* ACTUAL VIDEO PLAYER */}
                      {isVideo && (
                        <div className="relative rounded overflow-hidden bg-ivory-100 dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 flex items-center justify-center p-2">
                          <video controls className="max-h-96 w-full rounded" src={med.file_url} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Tactical Response Recommendations */}
          <div className="bg-ivory-100/80 dark:bg-forest-900/80 border border-ivory-300 dark:border-forest-800 rounded p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-ivory-300 dark:border-forest-800 pb-2">
              <span className="text-xs font-bold text-forest-950 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-forest-700 dark:text-sage-300" />
                {t('aiRecommendationsHeader', 'AI Tactical Response Recommendations (Human Verification Required)')}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {incident.recommendations?.map((rec: any) => (
                <div key={rec.id} className="p-3 bg-ivory-50 dark:bg-forest-950 rounded border border-ivory-300 dark:border-forest-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-forest-950 dark:text-white text-sm">{rec.title}</div>
                    <span className="text-[10px] bg-forest-100 dark:bg-forest-850 text-forest-800 dark:text-sage-300 px-2 py-0.5 rounded font-mono font-bold">
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-forest-900 dark:text-slate-300">{rec.action}</p>
                  <div className="text-[11px] text-sage-800 dark:text-sage-400 bg-ivory-100 dark:bg-forest-900 p-2 rounded border border-ivory-300 dark:border-forest-800">
                    <strong className="text-forest-900 dark:text-slate-300">Rationale:</strong> {rec.rationale}
                  </div>
                  
                  {/* Dispatch Authorization Button */}
                  {user?.role === 'DISPATCHER' || user?.role === 'ADMIN' ? (
                    rec.recommended_resource_ids && rec.recommended_resource_ids.length > 0 && (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => handleDispatchResource(rec.recommended_resource_ids[0])}
                          disabled={dispatching}
                          className="px-3 py-1.5 bg-forest-800 hover:bg-forest-700 text-ivory-50 rounded text-xs font-medium transition-colors flex items-center gap-1.5 shadow"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>{t('actionAuthorizeDispatch', 'Authorize & Dispatch Strike Unit')}</span>
                        </button>
                      </div>
                    )
                  ) : null}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (1 Col): Geospatial Map, Live Routing, Fleet Deployment, Timeline */}
        <div className="space-y-6">
          
          {/* Geospatial Map Preview */}
          <div className="bg-ivory-100/80 dark:bg-forest-900/80 border border-ivory-300 dark:border-forest-800 rounded p-4 shadow-sm space-y-2">
            <div className="text-xs font-bold text-forest-950 dark:text-white uppercase tracking-wider font-mono">
              {t('mapPerimeter', 'Perimeter & Ingress Map')}
            </div>
            <div className="rounded overflow-hidden border border-ivory-300 dark:border-forest-800">
              <EmergencyMap
                center={[incident.latitude, incident.longitude]}
                zoom={14}
                incidents={[incident]}
                resources={resources}
                height="260px"
              />
            </div>
          </div>

          {/* Active Assigned Resources */}
          <div className="bg-ivory-100/80 dark:bg-forest-900/80 border border-ivory-300 dark:border-forest-800 rounded p-4 shadow-sm space-y-3">
            <div className="text-xs font-bold text-forest-950 dark:text-white uppercase tracking-wider font-mono flex items-center justify-between">
              <span>{t('deployedEmergencyUnits', 'Deployed Emergency Units')}</span>
              <span className="font-mono text-forest-800 dark:text-sage-300">{assignedUnits.length} Deployed</span>
            </div>

            {assignedUnits.length === 0 ? (
              <div className="text-xs text-sage-600 dark:text-sage-400 py-3 text-center">
                {t('noUnitsDispatched', 'No units dispatched yet. Select an available asset below.')}
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {assignedUnits.map((a: any) => (
                  <div key={a.id} className="p-2.5 bg-ivory-50 dark:bg-forest-950 rounded border border-ivory-300 dark:border-forest-800 space-y-1">
                    <div className="flex items-center justify-between font-bold text-forest-950 dark:text-slate-200">
                      <span>Unit Assignment #{a.id.substring(0, 6)}</span>
                      <span className="text-[10px] text-forest-700 dark:text-sage-300 font-mono">{a.status}</span>
                    </div>
                    {a.route_distance_km && (
                      <div className="text-[11px] text-sage-700 dark:text-sage-400 flex items-center justify-between font-mono">
                        <span>Road Route: {a.route_distance_km} km</span>
                        <span>ETA: ~{a.route_eta_minutes} min</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Manual Resource / Responder Assignment Selector */}
            {(user?.role === 'DISPATCHER' || user?.role === 'ADMIN') && (
              <div className="pt-2 border-t border-ivory-300 dark:border-forest-800 space-y-2">
                <label className="text-[11px] font-semibold text-forest-900 dark:text-sage-300 block">
                  {t('deployStrikeUnit', 'Deploy Strike Unit / Responder:')}
                </label>
                
                <select
                  value={selectedResponderId}
                  onChange={(e) => setSelectedResponderId(e.target.value)}
                  className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded p-2 text-xs text-forest-950 dark:text-white focus:outline-none mb-1"
                >
                  <option value="">{t('selectResponder', 'Select Responder Operative...')}</option>
                  {responders.map((resp) => (
                    <option key={resp.id} value={resp.id}>
                      {resp.responder_name} ({resp.specialization}) [{resp.status}]
                    </option>
                  ))}
                </select>

                <select
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded p-2 text-xs text-forest-950 dark:text-white focus:outline-none"
                >
                  <option value="">{t('selectFleetVehicle', 'Select Fleet Vehicle/Asset...')}</option>
                  {resources.filter((r) => r.status === 'AVAILABLE').map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.resource_name} ({r.resource_type})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleDispatchResource()}
                  disabled={dispatching || (!selectedResourceId && !selectedResponderId)}
                  className="w-full py-2 bg-forest-800 hover:bg-forest-700 text-ivory-50 rounded text-xs font-medium transition-colors disabled:opacity-40 shadow"
                >
                  {dispatching ? t('authorizingDeployment', 'Authorizing Deployment...') : t('confirmDispatchOrder', 'Confirm Dispatch Order')}
                </button>
              </div>
            )}
          </div>

          {/* Chronological Incident Timeline */}
          <div className="bg-ivory-100/80 dark:bg-forest-900/80 border border-ivory-300 dark:border-forest-800 rounded p-4 shadow-sm space-y-3">
            <div className="text-xs font-bold text-forest-950 dark:text-white uppercase tracking-wider font-mono flex items-center justify-between">
              <span>{t('operationalTimeline', 'Operational Timeline')}</span>
              <Clock className="w-3.5 h-3.5 text-sage-500" />
            </div>

            <div className="space-y-3 text-xs max-h-80 overflow-y-auto pr-1">
              {incident.timeline?.map((evt: any) => (
                <div key={evt.id} className="relative pl-4 border-l-2 border-ivory-300 dark:border-forest-800 space-y-0.5">
                  <div className="w-2 h-2 rounded-full bg-forest-700 dark:bg-sage-400 absolute -left-[5px] top-1" />
                  <div className="font-bold text-forest-950 dark:text-slate-200">{evt.title}</div>
                  <p className="text-sage-800 dark:text-sage-400 text-[11px] leading-relaxed">{evt.description}</p>
                  <div className="text-[10px] text-sage-600 dark:text-sage-500 font-mono">
                    {new Date(evt.created_at).toLocaleTimeString()} by {evt.actor_name || 'System'}
                  </div>
                </div>
              ))}
            </div>

            {/* Lifecycle Quick Status Change */}
            {(user?.role === 'DISPATCHER' || user?.role === 'ADMIN' || user?.role === 'RESPONDER') && (
              <div className="pt-2 border-t border-ivory-300 dark:border-forest-800 flex items-center gap-2">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-800 rounded p-1.5 text-xs text-forest-900 dark:text-sage-300 flex-1"
                >
                  <option value="">{t('advanceState', 'Advance state...')}</option>
                  <option value="DISPATCHED">{t('statusDispatched', 'Dispatched')}</option>
                  <option value="RESPONDER_EN_ROUTE">{t('statusEnRoute', 'Responder En Route')}</option>
                  <option value="ON_SCENE">{t('statusOnScene', 'On Scene')}</option>
                  <option value="RESOLVED">{t('statusResolved', 'Resolved')}</option>
                  <option value="CLOSED">{t('statusClosed', 'Closed')}</option>
                </select>
                <button
                  onClick={() => newStatus && handleStatusChange(newStatus)}
                  disabled={!newStatus}
                  className="px-2.5 py-1.5 bg-forest-800 hover:bg-forest-700 text-ivory-50 rounded text-xs font-medium disabled:opacity-40"
                >
                  {t('actionApply', 'Apply')}
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
