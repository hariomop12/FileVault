import api from './auth';

export interface StorageNode {
  id: number;
  name: string;
  endpoint: string | null;
  type: string;
  status: 'ACTIVE' | 'DEGRADED' | 'DOWN';
  capacity_bytes: number;
  used_bytes: number;
  replication_weight: number;
  last_heartbeat_at: string | null;
  created_at: string;
}

export interface NodeHealth {
  ACTIVE?: number;
  DEGRADED?: number;
  DOWN?: number;
  [key: string]: number | undefined;
}

export interface RingInfo {
  ringSize: number;
  activeNodes: number;
  nodes: string[];
}

export interface PlacementResult {
  file_key: string;
  primary: string;
  replicas: string[];
  replication_factor: number;
  error?: string;
}

export interface ReplicationReport {
  replication_factor: number;
  total_files: number;
  under_replicated_files: number;
}

export interface ReconcileFileReport {
  file_id: number;
  s3_key: string;
  desired: number;
  current: number;
  recreated: string[];
  healthy_nodes: string[];
  recovered_from_lost: number;
  repaired: boolean;
}

export interface ReconcileResult {
  files_scanned: number;
  correction_count: number;
  under_replicated: number;
  reports: ReconcileFileReport[];
}

export const adminService = {
  async listNodes(): Promise<StorageNode[]> {
    const { data } = await api.get('/api/v1/admin/nodes');
    return data.nodes || [];
  },

  async registerNode(payload: {
    name: string;
    endpoint?: string;
    type: 'LOCAL' | 'R2';
    capacity_bytes?: number;
    replication_weight?: number;
  }) {
    const { data } = await api.post('/api/v1/admin/nodes', payload);
    return data;
  },

  async setNodeStatus(id: number, status: string) {
    const { data } = await api.put(`/api/v1/admin/nodes/${id}/status`, { status });
    return data;
  },

  async heartbeat(id: number) {
    const { data } = await api.post(`/api/v1/admin/nodes/${id}/heartbeat`);
    return data;
  },

  async ringInfo(): Promise<RingInfo> {
    const { data } = await api.get('/api/v1/admin/nodes/ring');
    return data;
  },

  async placement(key: string, replicas = 3): Promise<PlacementResult> {
    const { data } = await api.get('/api/v1/admin/nodes/ring/placement', {
      params: { key, replicas },
    });
    return data;
  },

  async replicationReport(): Promise<ReplicationReport> {
    const { data } = await api.get('/api/v1/admin/replication');
    return data;
  },

  async reconcile(replicationFactor?: number): Promise<ReconcileResult> {
    const { data } = await api.post(
      '/api/v1/admin/replication/reconcile',
      replicationFactor ? { replication_factor: replicationFactor } : {}
    );
    return data.data || data;
  },
};