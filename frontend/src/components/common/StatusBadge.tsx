import React from 'react';
import { IncidentStatus } from '../../types';

interface Props {
  status: IncidentStatus | string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const st = (status || 'REPORTED').toUpperCase();

  const labels: Record<string, { text: string; style: string }> = {
    REPORTED: { text: 'Reported', style: 'bg-ivory-200 text-forest-800 border-ivory-400 dark:bg-forest-900 dark:text-sage-300 dark:border-forest-700' },
    AI_ANALYZING: { text: 'AI Analyzing', style: 'bg-sage-100 text-forest-800 border-sage-400 dark:bg-forest-800 dark:text-sage-200 dark:border-forest-600 animate-pulse' },
    PENDING_VERIFICATION: { text: 'Pending Human Verification', style: 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700 font-bold' },
    VERIFIED: { text: 'Verified', style: 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-600' },
    PRIORITIZED: { text: 'Prioritized', style: 'bg-purple-100 text-purple-900 border-purple-400 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-600' },
    DISPATCHED: { text: 'Dispatched', style: 'bg-blue-100 text-blue-900 border-blue-400 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-600' },
    RESPONDER_EN_ROUTE: { text: 'Responder En Route', style: 'bg-cyan-100 text-cyan-900 border-cyan-400 dark:bg-cyan-950 dark:text-cyan-200 dark:border-cyan-600' },
    ON_SCENE: { text: 'On Scene', style: 'bg-teal-100 text-teal-900 border-teal-400 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-500' },
    RESOLVED: { text: 'Resolved', style: 'bg-stone-200 text-stone-700 border-stone-400 dark:bg-forest-950 dark:text-sage-400 dark:border-forest-800 line-through' },
    CLOSED: { text: 'Closed', style: 'bg-stone-200 text-stone-600 border-stone-300 dark:bg-forest-950 dark:text-sage-500 dark:border-forest-800' },
  };

  const item = labels[st] || { text: st, style: 'bg-ivory-200 text-forest-800 border-ivory-400 dark:bg-forest-900 dark:text-sage-300 dark:border-forest-700' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border uppercase tracking-wider ${item.style}`}>
      {item.text}
    </span>
  );
};
