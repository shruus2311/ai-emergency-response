import React from 'react';
import { SeverityClass } from '../../types';

interface Props {
  severity: SeverityClass | string;
  score?: number;
  showScore?: boolean;
}

export const SeverityBadge: React.FC<Props> = ({ severity, score, showScore = true }) => {
  const sev = (severity || 'MEDIUM').toUpperCase() as SeverityClass;

  const styles = {
    CRITICAL: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/80 dark:text-red-300 dark:border-red-500/60 shadow-sm',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/80 dark:text-orange-300 dark:border-orange-500/60 shadow-sm',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-500/60',
    LOW: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-500/60',
  }[sev] || 'bg-ivory-200 text-forest-800 border-ivory-400 dark:bg-forest-900 dark:text-sage-300 dark:border-forest-700';

  const dotColor = {
    CRITICAL: 'bg-red-600 dark:bg-red-500 animate-pulse',
    HIGH: 'bg-orange-600 dark:bg-orange-500',
    MEDIUM: 'bg-amber-500 dark:bg-amber-400',
    LOW: 'bg-blue-600 dark:bg-blue-400',
  }[sev] || 'bg-forest-400 dark:bg-sage-400';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wider border ${styles}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span>{sev}</span>
      {showScore && score !== undefined && (
        <span className="opacity-80 font-mono text-[10px]">({score.toFixed(1)})</span>
      )}
    </span>
  );
};
