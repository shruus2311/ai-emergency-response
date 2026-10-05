import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAllOfflineItems, triggerOfflineBatchSync } from '../services/offlineQueue';
import { useLanguage } from '../context/LanguageContext';

export const OfflineSyncPage: React.FC = () => {
  const { isOnline, syncOfflineQueue } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const loadQueue = async () => {
    try {
      const all = await getAllOfflineItems();
      setItems(all.reverse());
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleSyncNow = async () => {
    if (!isOnline) {
      alert('Cannot sync while offline. Reconnect to internet first.');
      return;
    }
    setSyncing(true);
    setMessage('');
    try {
      const res = await syncOfflineQueue();
      setMessage(`Synchronization completed: ${res.synced} operation(s) pushed, ${res.failed} failed.`);
      loadQueue();
    } catch (err: any) {
      setMessage(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 font-sans">
      
      {/* Header */}
      <div className="border-b border-ivory-300 dark:border-forest-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-forest-100 text-forest-800 dark:bg-forest-900 dark:text-sage-300 border border-forest-200 dark:border-forest-700">
            Offline-First Local Storage & Synchronization
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-forest-950 dark:text-ivory-50 mt-1 flex items-center gap-2">
            {!isOnline ? <WifiOff className="w-6 h-6 text-amber-600 dark:text-amber-400" /> : <Wifi className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
            Offline Operation Queue
          </h1>
          <p className="text-xs text-forest-700 dark:text-sage-400 mt-1">
            Browser IndexedDB queue caches all emergency distress calls and field updates when disconnected.
          </p>
        </div>

        <button
          onClick={handleSyncNow}
          disabled={syncing || !isOnline}
          className="flex items-center gap-2 px-4 py-2 bg-forest-800 hover:bg-forest-900 dark:bg-forest-700 dark:hover:bg-forest-600 text-ivory-50 rounded-lg text-xs font-bold disabled:opacity-40 shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Pushing Queue...' : 'Synchronize Server'}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-forest-100 dark:bg-forest-900 border border-forest-300 dark:border-forest-700 rounded-lg text-xs text-forest-900 dark:text-sage-200">
          {message}
        </div>
      )}

      {/* Queue items */}
      <div className="bg-white dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded-xl overflow-hidden shadow-sm p-5 space-y-4">
        <h2 className="font-serif font-bold text-sm text-forest-950 dark:text-ivory-50 uppercase tracking-wider">
          Cached IndexedDB Operations ({items.length})
        </h2>

        {items.length === 0 ? (
          <div className="py-12 text-center text-xs text-forest-600 dark:text-sage-400">
            Local queue is clear. All emergency operations are synchronized.
          </div>
        ) : (
          <div className="divide-y divide-ivory-200 dark:divide-forest-800">
            {items.map((item) => (
              <div key={item.operation_id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-forest-950 dark:text-ivory-50">{item.operation_type}</span>
                    <span className="text-[10px] text-forest-500 dark:text-sage-500">{item.operation_id}</span>
                  </div>
                  <div className="text-[11px] text-forest-700 dark:text-sage-300 mt-1">
                    {item.payload?.description || item.payload?.notes || JSON.stringify(item.payload)}
                  </div>
                  <div className="text-[10px] text-forest-500 dark:text-sage-500 mt-1 font-mono">
                    Queued: {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>

                <div>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    item.sync_status === 'SYNCED'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
                      : item.sync_status === 'FAILED'
                      ? 'bg-red-100 text-red-900 border border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700'
                      : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700 animate-pulse'
                  }`}>
                    {item.sync_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
