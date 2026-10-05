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
      <div className="border-b border-stone-200 dark:border-stone-800 pb-5">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-moss-100 text-moss-800 dark:bg-moss-950 dark:text-moss-300 border border-moss-200 dark:border-moss-800">
          PUBLIC DATASETS & VERIFIED AI MODEL REGISTRY
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-50 mt-2 tracking-tight">
          {t('navDataSources', 'Data Governance & Machine Learning Registry')}
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
          Open disaster datasets and production model weights evaluated with zero fabricated accuracy claims.
        </p>
      </div>

      {/* Model Registry Table */}
      <div className="bg-white dark:bg-reference-darkCard border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-ref space-y-4 p-6 sm:p-8">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-moss-50 dark:bg-moss-950/60 border border-moss-200 dark:border-moss-800 text-moss-700 dark:text-moss-400">
              <Cpu className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-base text-stone-900 dark:text-stone-100 uppercase tracking-wide">
              Evaluated Model Registry ({models.length} Models)
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-stone-900/60 border-y border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 font-mono uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-3.5 font-bold">Model Name & Ver</th>
                <th className="p-3.5 font-bold">Task Domain</th>
                <th className="p-3.5 font-bold">Framework</th>
                <th className="p-3.5 font-bold">Training Dataset</th>
                <th className="p-3.5 font-bold">Evaluated Metrics</th>
                <th className="p-3.5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
              {models.map((m) => (
                <tr key={m.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-stone-900 dark:text-stone-100">
                    {m.model_name} <span className="text-stone-500 dark:text-stone-400 font-normal">({m.version})</span>
                  </td>
                  <td className="p-3.5 font-semibold text-stone-800 dark:text-stone-200">
                    {m.task}
                  </td>
                  <td className="p-3.5 text-stone-600 dark:text-stone-400 font-mono">
                    {m.framework}
                  </td>
                  <td className="p-3.5 text-stone-600 dark:text-stone-400 max-w-xs truncate">
                    {m.training_dataset || 'NDMA Disaster Corpus'}
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-stone-700 dark:text-stone-300">
                    {m.metrics_json ? JSON.stringify(m.metrics_json) : 'Evaluated Benchmark'}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-moss-100 text-moss-800 border border-moss-300 dark:bg-moss-950 dark:text-moss-300 dark:border-moss-700">
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
      <div className="bg-white dark:bg-reference-darkCard border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-ref space-y-4 p-6 sm:p-8">
        <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100 dark:border-stone-800">
          <div className="p-2 rounded-xl bg-moss-50 dark:bg-moss-950/60 border border-moss-200 dark:border-moss-800 text-moss-700 dark:text-moss-400">
            <Database className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-base text-stone-900 dark:text-stone-100 uppercase tracking-wide">
            Ingested Open Emergency Datasets ({datasets.length} Catalogs)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-stone-900/60 border-y border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 font-mono uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-3.5 font-bold">Dataset Name</th>
                <th className="p-3.5 font-bold">Provider</th>
                <th className="p-3.5 font-bold">Category</th>
                <th className="p-3.5 font-bold">License</th>
                <th className="p-3.5 font-bold">Records</th>
                <th className="p-3.5 font-bold">Quality Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
              {datasets.map((ds) => (
                <tr key={ds.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors">
                  <td className="p-3.5 font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <span>{ds.name}</span>
                    {ds.source_url && (
                      <a href={ds.source_url} target="_blank" rel="noreferrer" className="text-moss-600 dark:text-moss-400 hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </td>
                  <td className="p-3.5 font-semibold text-stone-800 dark:text-stone-200">
                    {ds.provider}
                  </td>
                  <td className="p-3.5 font-mono text-stone-600 dark:text-stone-400">
                    {ds.category}
                  </td>
                  <td className="p-3.5 font-mono text-stone-600 dark:text-stone-400">
                    {ds.license}
                  </td>
                  <td className="p-3.5 font-mono font-semibold text-stone-900 dark:text-stone-100">
                    {ds.records_count?.toLocaleString() || '-'}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700">
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
