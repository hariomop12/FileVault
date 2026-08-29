import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { adminService, ReplicationReport, ReconcileResult, StorageNode } from '../../services/admin';
import StatusBadge from '../../components/ui/StatusBadge';

const inputCls = (theme: string) =>
  `w-full px-3 py-2 text-sm rounded-xl border input-focus ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
  }`;

const AdminReplication: React.FC = () => {
  const { theme } = useTheme();
  const [report, setReport] = useState<ReplicationReport | null>(null);
  const [nodes, setNodes] = useState<StorageNode[]>([]);
  const [reconcileResult, setReconcileResult] = useState<ReconcileResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [factor, setFactor] = useState<number>(3);

  const refresh = useCallback(async () => {
    try {
      const [rep, nodeList] = await Promise.all([adminService.replicationReport(), adminService.listNodes()]);
      setReport(rep);
      setNodes(nodeList);
    } catch {
      // auth interceptor redirects on 401
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleReconcile = async () => {
    setReconciling(true);
    setReconcileResult(null);
    try {
      const result = await adminService.reconcile(factor);
      setReconcileResult(result);
      refresh();
    } finally {
      setReconciling(false);
    }
  };

  const healthyNodes = nodes.filter((n) => n.status === 'ACTIVE').length;
  const degradeRisk = report && report.total_files > 0 && report.under_replicated_files > 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Replication</h1>
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>ADMIN</span>
          </div>
          <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            R× replication on distinct nodes + self-healing re-replication
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className={`${inputCls(theme)} w-24`}
            type="number"
            min={1}
            value={factor}
            onChange={(e) => setFactor(Number(e.target.value))}
            title="Replication factor"
          />
          <button
            onClick={handleReconcile}
            disabled={reconciling || healthyNodes < 2}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
              reconciling
                ? 'bg-gray-600'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20'
            }`}
            title="Scan all files and re-replicate any deficits"
          >
            {reconciling && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
            {reconciling ? 'Reconciling...' : 'Reconcile'}
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className={`rounded-2xl p-5 card-hover ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Replication Factor</p>
          <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <span className="text-3xl font-extrabold">{report?.replication_factor ?? '—'}</span>
          </p>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>replicas must land on distinct nodes</p>
        </div>
        <div className={`rounded-2xl p-5 card-hover ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Files</p>
          <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <span className="text-3xl font-extrabold">{report?.total_files ?? '—'}</span>
          </p>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>files tracked in file_replicas</p>
        </div>
        <div className={`rounded-2xl p-5 card-hover ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Under-replicated</p>
          <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <span className={`text-3xl font-extrabold ${degradeRisk ? 'bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent' : 'text-emerald-500'}`}>
              {report?.under_replicated_files ?? '—'}
            </span>
          </p>
          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>files missing at least one replica</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Node health strip */}
        <div className={`rounded-2xl p-5 lg:col-span-2 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <h2 className={`text-base font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Node health</h2>
          <div className="flex flex-wrap gap-2">
            {nodes.length === 0 && <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No nodes registered</p>}
            {nodes.map((node) => (
              <div key={node.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${theme === 'dark' ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{node.name}</span>
                <StatusBadge status={node.status} />
              </div>
            ))}
          </div>
          <p className={`text-xs mt-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            Tip: mark a node DOWN on the Storage Nodes page, then Reconcile to watch it self-heal.
          </p>
        </div>

        {/* Last reconcile result */}
        <div className={`rounded-2xl p-5 lg:col-span-3 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <h2 className={`text-base font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Last reconcile</h2>
          {reconciling ? (
            <p className={`text-sm animate-pulse ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Scanning files and repairing replica deficits...</p>
          ) : reconcileResult ? (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className={`rounded-xl p-3 text-center ${theme === 'dark' ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
                <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{reconcileResult.files_scanned}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>scanned</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${theme === 'dark' ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
                <p className={`text-xl font-bold text-emerald-500`}>{reconcileResult.correction_count}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>repaired</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${theme === 'dark' ? 'bg-gray-800/60' : 'bg-gray-50'}`}>
                <p className={`text-xl font-bold text-amber-500`}>{reconcileResult.under_replicated}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>still deficit</p>
              </div>
            </div>
          ) : (
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              No reconcile has run yet in this session.
            </p>
          )}

          {reconcileResult && reconcileResult.reports.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={`text-left uppercase tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    <th className="py-2 pr-2 font-medium">File</th>
                    <th className="py-2 pr-2 font-medium">Desired</th>
                    <th className="py-2 pr-2 font-medium">Current</th>
                    <th className="py-2 font-medium">Re-created on</th>
                  </tr>
                </thead>
                <tbody>
                  {reconcileResult.reports.map((r) => (
                    <tr key={r.file_id} className={`border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
                      <td className={`py-2 pr-2 font-mono truncate max-w-[180px] ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{r.s3_key}</td>
                      <td className={`py-2 pr-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{r.desired}</td>
                      <td className={`py-2 pr-2 ${r.current < r.desired ? 'text-amber-500 font-medium' : theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{r.current}</td>
                      <td className={`py-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {r.recreated.length === 0 ? '—' : r.recreated.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <p className={`text-sm animate-pulse ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Loading report...</p>
      )}
    </div>
  );
};

export default AdminReplication;