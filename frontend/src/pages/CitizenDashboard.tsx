import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, AlertOctagon, FileText, MapPin, Radio, 
  Clock, CheckCircle, AlertTriangle, ArrowRight, PhoneCall 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';

export const CitizenDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [myReports, setMyReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await api.reports.myReports();
        setMyReports(data);
      } catch {
        setMyReports([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 font-sans">
      
      {/* Citizen Welcome Banner */}
      <div className="bg-ivory-100/90 dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div>
          <span className="text-xs font-mono font-bold text-forest-700 dark:text-sage-400 uppercase tracking-widest">
            {t('navCitizenPortal', 'Civilian Emergency Portal')}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-forest-950 dark:text-white mt-1">
            {t('appTitle', 'ResQIntel')} — {t('appTagline', 'Emergency Response Intelligence')}
          </h1>
          <p className="text-xs sm:text-sm text-sage-800 dark:text-sage-400 mt-2 max-w-xl font-sans">
            {t('appMission', 'From scattered emergency signals to coordinated action.')}
          </p>
        </div>

        {/* SOS Button */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link
            to="/emergency"
            className="px-5 py-3 bg-amber-700 hover:bg-amber-600 active:scale-95 text-white font-bold text-sm rounded shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <AlertOctagon className="w-5 h-5" />
            <span>{t('navDisasterMode', 'DISASTER / FLOOD MODE')}</span>
          </Link>
          <Link
            to="/sos"
            className="px-5 py-3 bg-forest-800 hover:bg-forest-700 active:scale-95 text-ivory-50 font-bold text-sm rounded shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <PhoneCall className="w-5 h-5 text-ivory-200" />
            <span>{t('actionQuickSOS', 'QUICK SOS')}</span>
          </Link>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/report"
          className="bg-ivory-100/80 dark:bg-forest-900/80 border border-ivory-300 dark:border-forest-800 hover:border-forest-400 dark:hover:border-forest-700 p-6 rounded shadow-sm transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded bg-ivory-200 dark:bg-forest-850 border border-ivory-300 dark:border-forest-700 text-forest-800 dark:text-sage-300 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-forest-950 dark:text-white ">{t('fileReportTitle', 'File Multimodal Report')}</h3>
            <p className="text-xs text-sage-800 dark:text-sage-400 mt-1 font-sans">
              {t('fileReportDesc', 'Submit description, live GPS location, voice audio recording, and photographic evidence for multi-agent AI verification.')}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-forest-800 dark:text-sage-300 group-hover:translate-x-1 transition-transform">
            <span>{t('openReportForm', 'Open Reporting Form')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/emergency"
          className="bg-ivory-100/80 dark:bg-forest-900/80 border border-ivory-300 dark:border-forest-800 hover:border-forest-400 dark:hover:border-forest-700 p-6 rounded shadow-sm transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded bg-amber-100 dark:bg-forest-850 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-forest-950 dark:text-white ">{t('offlineDisasterTitle', 'Offline Flood & Disaster Mode')}</h3>
            <p className="text-xs text-sage-800 dark:text-sage-400 mt-1 font-sans">
              {t('offlineDisasterDesc', 'Designed for low battery, zero connectivity, and wet screen distress situations with tap-based panic reporting.')}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
            <span>{t('launchDisasterMode', 'Launch Disaster Safety Mode')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Citizen's Past Submitted Reports */}
      <div className="bg-ivory-100/80 dark:bg-forest-900/80 border border-ivory-300 dark:border-forest-800 rounded p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-ivory-300 dark:border-forest-800 pb-3">
          <h2 className="text-xs font-bold text-forest-950 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <FileText className="w-4 h-4 text-forest-700 dark:text-sage-400" />
            {t('mySubmittedReports', 'My Submitted Emergency Reports')}
          </h2>
          <span className="text-xs font-mono text-sage-700 dark:text-sage-400">{myReports.length} {t('recordsCited', 'Record(s)')}</span>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-sage-600 dark:text-sage-400">{t('queryingReports', 'Querying report status...')}</div>
        ) : myReports.length === 0 ? (
          <div className="text-center py-8 text-xs text-sage-600 dark:text-sage-400">
            {t('noReportsYet', 'You have not submitted any emergency distress reports yet.')}
          </div>
        ) : (
          <div className="space-y-3">
            {myReports.map((rpt: any) => (
              <div
                key={rpt.id}
                className="p-4 bg-ivory-50 dark:bg-forest-950 rounded border border-ivory-300 dark:border-forest-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-forest-800 dark:text-sage-300 text-xs">
                      #{rpt.id.substring(0, 8)}
                    </span>
                    <span className="font-semibold text-forest-950 dark:text-white text-xs">{rpt.incident_type}</span>
                    <span className="text-[10px] text-sage-600 dark:text-sage-400 font-mono">
                      {new Date(rpt.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-sage-800 dark:text-sage-400 mt-1 max-w-xl truncate font-sans">
                    {rpt.raw_text}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-ivory-200 dark:bg-forest-850 text-forest-900 dark:text-sage-300 border border-ivory-300 dark:border-forest-700">
                    {rpt.report_type}
                  </span>
                  {rpt.incident_id && (
                    <button
                      onClick={() => navigate(`/incidents/${rpt.incident_id}`)}
                      className="px-2.5 py-1 bg-ivory-200 dark:bg-forest-850 hover:bg-forest-800 hover:text-ivory-50 dark:hover:bg-forest-800 text-forest-900 dark:text-white rounded text-xs font-semibold"
                    >
                      {t('actionTrackStatus', 'Track Status')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
