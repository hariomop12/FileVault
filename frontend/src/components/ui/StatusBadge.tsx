import React from 'react';

const styles: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  DEGRADED: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  DOWN: 'bg-red-500/10 text-red-500 border-red-500/20',
  PENDING: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  STALE: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cls = styles[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'ACTIVE' ? 'bg-emerald-500' : status === 'DOWN' ? 'bg-red-500' : status === 'DEGRADED' ? 'bg-amber-500' : 'bg-gray-500 animate-pulse'}`} />
      {status}
    </span>
  );
};

export default StatusBadge;