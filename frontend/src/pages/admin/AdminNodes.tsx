import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { adminService, StorageNode } from '../../services/admin';
import StatusBadge from '../../components/ui/StatusBadge';

const KpiCard = ({ label, value, sub, color, theme }: any) => (
  <div className={`rounded-2xl p-5 card-hover ${
    theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'
  }`}>
    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
    <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <span className={`text-3xl font-extrabold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>{value}</span>
    </p>
    {sub && <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{sub}</p>}
  </div>
);

const inputCls = (theme: string) =>
  `w-full px-3 py-2 text-sm rounded-xl border input-focus ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
  }`;

const AdminNodes: React.FC = () => {
  const { theme } = useTheme();
  const [nodes, setNodes] = useState<StorageNode[]>([]);
  const [ringSize, setRingSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'LOCAL', endpoint: '', capacity_bytes: 10737418240, replication_weight: 1 });
  const [registerMsg, setRegisterMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [placementKey, setPlacementKey] = useState('');
  const [placement, setPlacement] = useState<{ primary: string; replicas: string[]; replication_factor: number; error?: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nodeList, ring] = await Promise.all([adminService.listNodes(), adminService.ringInfo()]);
      setNodes(nodeList);
      setRingSize(ring.ringSize || 0);
    } catch {
      // ignore — auth interceptor redirects on 401
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const act = async (id: number, fn: () => Promise<any>) => {
    setBusy(id);
    try {
      await fn();
    } finally {
      setBusy(null);
      refresh();
    }
  };

  const handleRegister = async () => {
    if (!form.name.trim()) return;
    setRegisterMsg(null);
    try {
      await adminService.registerNode({
        name: form.name.trim(),
        type: form.type as 'LOCAL' | 'R2',
        endpoint: form.endpoint.trim() || undefined,
        capacity_bytes: Number(form.capacity_bytes),
        replication_weight: Number(form.replication_weight),
      });
      setRegisterMsg({ ok: true, text: `Node "${form.name}" registered as ACTIVE` });
      setShowRegister(false);
      setForm((f) => ({ ...f, name: '', endpoint: '' }));
    } catch (e: any) {
      setRegisterMsg({ ok: false, text: e?.response?.data?.message || 'Failed to register node' });
    }
    refresh();
  };

  const handlePlacement = async () => {
    if (!placementKey.trim()) return;
    setPlacement(null);
    try {
      const result = await adminService.placement(placementKey.trim());
      setPlacement(result.error ? { primary: '', replicas: [], replication_factor: 0, error: result.error } : result);
    } catch (e: any) {
      setPlacement({ primary: '', replicas: [], replication_factor: 0, error: e?.response?.data?.message || 'Placement check failed' });
    }
  };

  const counts = nodes.reduce(
    (acc, n) => { acc[n.status] = (acc[n.status] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Storage Nodes</h1>
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>ADMIN</span>
          </div>
          <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            Distributed storage placement — consistent-hash ring + heartbeat failure detection
          </p>
        </div>
        <button
          onClick={() => setShowRegister(!showRegister)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white transition-all duration-200 hover:-translate-y-0.5 ${
            showRegister ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20'
          }`}
        >
          {showRegister ? 'Close' : <>Register Node</>}
        </button>
      </div>

      {registerMsg && (
        <div className={`mb-6 p-4 rounded-xl border text-sm font-medium ${
          registerMsg.ok
            ? theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : theme === 'dark' ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {registerMsg.text}
        </div>
      )}

      {showRegister && (
        <div className={`rounded-2xl p-6 mb-6 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <h2 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Register a storage node</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input className={inputCls(theme)} placeholder="Node name (e.g. node-1)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className={inputCls(theme)} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="LOCAL">LOCAL (filesystem)</option>
              <option value="R2">R2 (S3)</option>
            </select>
            <input className={inputCls(theme)} placeholder="Endpoint (optional)" value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} />
            <input className={inputCls(theme)} type="number" placeholder="Capacity bytes" value={form.capacity_bytes} onChange={(e) => setForm({ ...form, capacity_bytes: Number(e.target.value) })} />
            <input className={inputCls(theme)} type="number" placeholder="Weight" value={form.replication_weight} onChange={(e) => setForm({ ...form, replication_weight: Number(e.target.value) })} />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleRegister} className="px-5 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all">Register</button>
            <button onClick={() => setShowRegister(false)} className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>Cancel</button>
          </div>
        </div>
      )}

      {/* Ring explorer */}
      <div className={`rounded-2xl p-6 mb-6 ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Consistent-hash ring explorer</h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Compute where a file key lands (primary + replicas)</p>
          </div>
          <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
            ring size: {ringSize} points
          </span>
        </div>
        <div className="flex gap-3">
          <input
            className={inputCls(theme)}
            placeholder="File key (e.g. docs/report.pdf)"
            value={placementKey}
            onChange={(e) => setPlacementKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePlacement()}
          />
          <button onClick={handlePlacement} className="shrink-0 px-5 py-2 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all">Locate</button>
        </div>
        {placement && (
          <div className="mt-4">
            {placement.error ? (
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}>{placement.error}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  primary: {placement.primary}
                </span>
                {placement.replicas.map((r) => (
                  <span key={r} className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                    replica: {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <KpiCard theme={theme} label="Total Nodes" value={nodes.length} color="from-blue-500 to-indigo-500" />
        <KpiCard theme={theme} label="Active" value={counts.ACTIVE || 0} color="from-emerald-500 to-teal-500" />
        <KpiCard theme={theme} label="Degraded" value={counts.DEGRADED || 0} sub="suspicion window" color="from-amber-500 to-orange-500" />
        <KpiCard theme={theme} label="Down" value={counts.DOWN || 0} sub="failure confirmed" color="from-red-500 to-rose-500" />
        <KpiCard theme={theme} label="Ring Size" value={ringSize} sub="virtual points" color="from-purple-500 to-pink-500" />
      </div>

      {/* Node table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-16 rounded-2xl animate-pulse ${theme === 'dark' ? 'bg-gray-900' : 'bg-white border border-gray-200'}`} />
          ))}
        </div>
      ) : nodes.length === 0 ? (
        <div className={`rounded-2xl p-14 text-center ${theme === 'dark' ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No storage nodes yet</p>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Register at least 3 nodes to demo replication</p>
        </div>
      ) : (
        <div className={`rounded-2xl overflow-hidden border ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left text-xs uppercase tracking-wider ${theme === 'dark' ? 'bg-gray-800/60 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  <th className="px-4 py-3 font-medium">Node</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Capacity</th>
                  <th className="px-4 py-3 font-medium">Weight</th>
                  <th className="px-4 py-3 font-medium">Last heartbeat</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => (
                  <tr key={node.id} className={`border-t ${theme === 'dark' ? 'border-gray-800 hover:bg-gray-800/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{node.name}</p>
                      <p className={`text-xs truncate max-w-[160px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{node.endpoint || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{node.type}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={node.status} /></td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {node.capacity_bytes ? `${(node.capacity_bytes / 1073741824).toFixed(0)} GB` : '—'}
                    </td>
                    <td className={`px-4 py-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{node.replication_weight}</td>
                    <td className={`px-4 py-3 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {node.last_heartbeat_at ? new Date(node.last_heartbeat_at).toLocaleTimeString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          disabled={busy === node.id}
                          onClick={() => act(node.id, () => adminService.heartbeat(node.id))}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                          title="Simulate heartbeat — revives DOWN nodes"
                        >
                          {busy === node.id ? '...' : 'Heartbeat'}
                        </button>
                        <button
                          disabled={busy === node.id || node.status === 'DOWN'}
                          onClick={() => act(node.id, () => adminService.setNodeStatus(node.id, 'DOWN'))}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Mark node DOWN to demo self-healing"
                        >
                          Mark DOWN
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNodes;