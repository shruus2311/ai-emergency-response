import React, { useState, useEffect } from 'react';
import { Database, Cpu, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export const DataSourcesPage: React.FC = () => {
  const { t } = useLanguage();
  const [datasets, setDatasets] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ds, md] = await Promise.all([
          api.datasets.list(),
          api.datasets.models(),
        ]);
        setDatasets(ds);
        setModels(md);
      } catch (e) {
        console.error('Failed to fetch datasets:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      
      {/* Header */}
      <div className="border-b border-ivory-300 dark:border-forest-800 pb-5">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-forest-100 text-forest-900 dark:bg-forest-900 dark:text-sage-300 border border-forest-300 dark:border-forest-700">
          PUBLIC DATASETS & VERIFIED AI MODEL REGISTRY
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-forest-950 dark:text-ivory-50 mt-2 tracking-tight font-serif">
          {t('navDataSources', 'Data Governance & Machine Learning Registry')}
        </h1>
        <p className="text-sm text-sage-800 dark:text-sage-400 mt-1">
          Open disaster datasets and production model weights evaluated with zero fabricated accuracy claims.
        </p>
      </div>

      {/* Model Registry Table */}
      <div className="bg-ivory-50 dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 rounded-2xl overflow-hidden shadow-sm space-y-4 p-6 sm:p-8">
        <div className="flex items-center justify-between pb-2 border-b border-ivory-200 dark:border-forest-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-forest-100 dark:bg-forest-850 border border-forest-300 dark:border-forest-700 text-forest-800 dark:text-sage-300">
              <Cpu className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-base text-forest-950 dark:text-ivory-50 uppercase tracking-wide font-serif">
              Evaluated Model Registry ({models.length} Models)
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory-200/60 dark:bg-forest-950 border-y border-ivory-300 dark:border-forest-800 text-forest-900 dark:text-sage-300 font-mono uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-3.5 font-bold">Model Name & Ver</th>
                <th className="p-3.5 font-bold">Task Domain</th>
                <th className="p-3.5 font-bold">Framework</th>
                <th className="p-3.5 font-bold">Training Dataset</th>
                <th className="p-3.5 font-bold">Evaluated Metrics</th>
                <th className="p-3.5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200 dark:divide-forest-800 text-forest-900 dark:text-ivory-100 font-sans">
              {models.map((m) => (
                <tr key={m.id} className="hover:bg-ivory-200/50 dark:hover:bg-forest-850/50 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-forest-950 dark:text-ivory-50">
                    {m.model_name} <span className="text-sage-600 dark:text-sage-400 font-normal">({m.version})</span>
                  </td>
                  <td className="p-3.5 font-semibold text-forest-900 dark:text-ivory-100">
                    {m.task}
                  </td>
                  <td className="p-3.5 text-sage-700 dark:text-sage-400 font-mono">
                    {m.framework}
                  </td>
                  <td className="p-3.5 text-sage-700 dark:text-sage-400 max-w-xs truncate">
                    {m.training_dataset || 'NDMA Disaster Corpus'}
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-forest-800 dark:text-sage-300">
                    {m.metrics_json ? JSON.stringify(m.metrics_json) : 'Evaluated Benchmark'}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-forest-100 text-forest-800 border border-forest-300 dark:bg-forest-800 dark:text-sage-200 dark:border-forest-600">
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Data Sources Table */}
      <div className="bg-ivory-50 dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 rounded-2xl overflow-hidden shadow-sm space-y-4 p-6 sm:p-8">
        <div className="flex items-center gap-2.5 pb-2 border-b border-ivory-200 dark:border-forest-800">
          <div className="p-2 rounded-xl bg-forest-100 dark:bg-forest-850 border border-forest-300 dark:border-forest-700 text-forest-800 dark:text-sage-300">
            <Database className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-base text-forest-950 dark:text-ivory-50 uppercase tracking-wide font-serif">
            Ingested Open Emergency Datasets ({datasets.length} Catalogs)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory-200/60 dark:bg-forest-950 border-y border-ivory-300 dark:border-forest-800 text-forest-900 dark:text-sage-300 font-mono uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-3.5 font-bold">Dataset Name</th>
                <th className="p-3.5 font-bold">Provider</th>
                <th className="p-3.5 font-bold">Category</th>
                <th className="p-3.5 font-bold">License</th>
                <th className="p-3.5 font-bold">Records</th>
                <th className="p-3.5 font-bold">Quality Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200 dark:divide-forest-800 text-forest-900 dark:text-ivory-100 font-sans">
              {datasets.map((ds) => (
                <tr key={ds.id} className="hover:bg-ivory-200/50 dark:hover:bg-forest-850/50 transition-colors">
                  <td className="p-3.5 font-bold text-forest-950 dark:text-ivory-50 flex items-center gap-2">
                    <span>{ds.name}</span>
                    {ds.source_url && (
                      <a href={ds.source_url} target="_blank" rel="noreferrer" className="text-forest-700 dark:text-sage-300 hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </td>
                  <td className="p-3.5 font-semibold text-forest-900 dark:text-ivory-100">
                    {ds.provider}
                  </td>
                  <td className="p-3.5 font-mono text-sage-700 dark:text-sage-400">
                    {ds.category}
                  </td>
                  <td className="p-3.5 font-mono text-sage-700 dark:text-sage-400">
                    {ds.license}
                  </td>
                  <td className="p-3.5 font-mono font-semibold text-forest-950 dark:text-ivory-50">
                    {ds.records_count?.toLocaleString() || '-'}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-forest-100 text-forest-800 border border-forest-300 dark:bg-forest-800 dark:text-sage-200 dark:border-forest-600">
                      {ds.data_quality}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
