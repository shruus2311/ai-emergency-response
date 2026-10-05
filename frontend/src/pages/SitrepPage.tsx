import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FileText, Download, Printer, RefreshCw, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export const SitrepPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const incidentIdParam = searchParams.get('incident_id');

  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(incidentIdParam || '');
  const [sitrep, setSitrep] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadIncidents = async () => {
      try {
        const data = await api.incidents.list();
        setIncidents(data);
        if (!selectedIncidentId && data.length > 0) {
          setSelectedIncidentId(data[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadIncidents();
  }, []);

  const handleGenerateSitrep = async (incId?: string) => {
    const idToUse = incId || selectedIncidentId;
    if (!idToUse) return;
    setLoading(true);
    try {
      const res = await api.ai.generateSitrep({
        incident_id: idToUse,
        title: 'OFFICIAL INCIDENT SITUATION REPORT',
      });
      setSitrep(res.sitrep);
    } catch (err: any) {
      alert(err.message || 'Failed to generate SITREP');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedIncidentId) {
      handleGenerateSitrep(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ivory-300 dark:border-forest-800 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-forest-100 text-forest-800 dark:bg-forest-900 dark:text-sage-300 border border-forest-200 dark:border-forest-700">
            Factual Operations Documentation
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-forest-950 dark:text-ivory-50 mt-1 flex items-center gap-2">
            <FileText className="w-6 h-6 text-forest-700 dark:text-sage-300" />
            Situation Report (SITREP) Generator
          </h1>
          <p className="text-xs text-forest-700 dark:text-sage-400 mt-1">
            Generated strictly from verified stored database records. Zero hallucinated events, casualties, or units.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            className="bg-ivory-100 dark:bg-forest-950 border border-ivory-300 dark:border-forest-700 rounded-lg p-2 text-xs text-forest-900 dark:text-sage-200 focus:outline-none focus:ring-1 focus:ring-forest-600 font-medium"
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                #{inc.incident_number} — {inc.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => handleGenerateSitrep()}
            disabled={loading}
            className="p-2 bg-ivory-200 dark:bg-forest-800 hover:bg-ivory-300 dark:hover:bg-forest-700 text-forest-900 dark:text-sage-200 rounded-lg text-xs transition-colors border border-ivory-300 dark:border-forest-700"
            title="Regenerate"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-forest-800 hover:bg-forest-900 dark:bg-forest-700 dark:hover:bg-forest-600 text-ivory-50 rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Printable SITREP Document Preview */}
      {sitrep ? (
        <div className="bg-ivory-50 dark:bg-forest-900/95 border border-ivory-300 dark:border-forest-800 rounded-2xl p-6 sm:p-10 shadow-sm text-forest-950 dark:text-ivory-50 space-y-6 print:bg-white print:text-black print:border-none">
          
          {/* Document Header */}
          <div className="border-b border-ivory-200 dark:border-forest-800 pb-4 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400 uppercase tracking-widest block">
                OFFICIAL SITUATION REPORT (SITREP)
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-forest-950 dark:text-ivory-50 mt-1">
                {sitrep.title}
              </h2>
              <div className="text-xs text-forest-600 dark:text-sage-400 font-mono mt-1">
                Document Ref: <strong className="text-forest-900 dark:text-white">{sitrep.sitrep_number}</strong>
              </div>
            </div>

            <div className="text-right text-xs font-mono text-forest-600 dark:text-sage-400">
              <div>Generated: {new Date(sitrep.generated_at).toLocaleString()} UTC</div>
              <div className="text-forest-700 dark:text-sage-300 font-semibold mt-1">STATUS: {sitrep.incident_status}</div>
            </div>
          </div>

          {/* Section: Operational Narrative */}
          <div className="space-y-2 text-xs">
            <h3 className="font-serif font-bold text-forest-950 dark:text-ivory-50 uppercase tracking-wider text-xs border-b border-ivory-200 dark:border-forest-800 pb-1">
              1. Executive Operational Summary
            </h3>
            <p className="text-forest-800 dark:text-sage-200 leading-relaxed font-sans text-xs">
              {sitrep.summary}
            </p>
          </div>

          {/* Section: Casualties & Impact */}
          <div className="space-y-2 text-xs">
            <h3 className="font-serif font-bold text-forest-950 dark:text-ivory-50 uppercase tracking-wider text-xs border-b border-ivory-200 dark:border-forest-800 pb-1">
              2. Casualties, Demographics & Impact Extent
            </h3>
            <div className="p-3 bg-ivory-50 dark:bg-forest-950 rounded-xl border border-ivory-200 dark:border-forest-800 text-xs font-mono text-red-700 dark:text-red-300">
              {sitrep.casualties_summary}
            </div>
          </div>

          {/* Section: Assigned Resources & Weather */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-ivory-50 dark:bg-forest-950 rounded-xl border border-ivory-200 dark:border-forest-800 space-y-1">
              <span className="font-serif font-bold text-forest-950 dark:text-ivory-50 block">3. Response Assets & Responders</span>
              <p className="text-forest-800 dark:text-sage-200">{sitrep.resources_summary}</p>
            </div>

            <div className="p-3 bg-ivory-50 dark:bg-forest-950 rounded-xl border border-ivory-200 dark:border-forest-800 space-y-1">
              <span className="font-serif font-bold text-forest-950 dark:text-ivory-50 block">4. Meteorological Context</span>
              <p className="text-forest-800 dark:text-sage-200">{sitrep.weather_summary}</p>
            </div>
          </div>

          {/* Section: Outstanding Issues & Conflicts */}
          <div className="space-y-2 text-xs">
            <h3 className="font-serif font-bold text-forest-950 dark:text-ivory-50 uppercase tracking-wider text-xs border-b border-ivory-200 dark:border-forest-800 pb-1">
              5. Outstanding Operational Contradictions & Conflicts
            </h3>
            <div className="p-3 bg-ivory-50 dark:bg-forest-950 rounded-xl border border-ivory-200 dark:border-forest-800 text-forest-800 dark:text-sage-200">
              {sitrep.outstanding_issues}
            </div>
          </div>

          {/* Section: Missing Information Required */}
          <div className="space-y-2 text-xs">
            <h3 className="font-serif font-bold text-forest-950 dark:text-ivory-50 uppercase tracking-wider text-xs border-b border-ivory-200 dark:border-forest-800 pb-1">
              6. Critical Field Information Pending Verification
            </h3>
            <div className="p-3 bg-ivory-50 dark:bg-forest-950 rounded-xl border border-ivory-200 dark:border-forest-800 text-forest-800 dark:text-sage-200">
              {sitrep.missing_info_summary}
            </div>
          </div>

          {/* Document Footer */}
          <div className="pt-6 border-t border-ivory-200 dark:border-forest-800 text-[11px] font-mono text-forest-600 dark:text-sage-400 flex items-center justify-between">
            <span>ResQIntel AI Crisis Decision-Support System</span>
            <span>Authoritative Ground Truth • Human In The Loop Required</span>
          </div>

        </div>
      ) : (
        <div className="py-16 text-center text-xs text-forest-600 dark:text-sage-400">
          Generating situation report...
        </div>
      )}

    </div>
  );
};
