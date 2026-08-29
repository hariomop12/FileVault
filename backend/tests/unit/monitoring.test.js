jest.mock('../../utils/logger');
jest.mock('../../config/db', () => require('../../__mocks__/db'));
jest.mock('../../services/storageNode.service', () => ({
  getNodeHealth: jest.fn(),
  buildRing: jest.fn(),
}));
jest.mock('../../services/replication.service', () => ({
  getReplicationReport: jest.fn(),
}));

const { EventEmitter } = require('events');
const { client, httpMetricsMiddleware, updateSystemGauges } = require('../../utils/monitoring');
const StorageNodeService = require('../../services/storageNode.service');
const ReplicationService = require('../../services/replication.service');
const { __setMockRows, __clearMock } = require('../../config/db');

describe('monitoring (Prometheus)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearMock();
  });

  it('registers the process default metrics collector', () => {
    expect(client.collectDefaultMetrics).toBeDefined();
  });

  it('skips counting /metrics and /health scrapes', async () => {
    const next = jest.fn();
    httpMetricsMiddleware({ method: 'GET', path: '/metrics', route: undefined }, { on: jest.fn() }, next);
    httpMetricsMiddleware({ method: 'GET', path: '/health/test', route: undefined }, { on: jest.fn() }, next);
    expect(next).toHaveBeenCalledTimes(2);

    const text = await client.register.metrics();
    expect(text).not.toContain('http_requests_total{');
  });

  it('counts HTTP traffic when a response finishes', async () => {
    const fakeRes = new EventEmitter();
    fakeRes.statusCode = 200;

    httpMetricsMiddleware(
      { method: 'GET', path: '/api/v1/files', route: { path: '/files' } },
      fakeRes,
      () => {}
    );
    fakeRes.emit('finish');

    const text = await client.register.metrics();
    expect(text).toContain('http_requests_total{method="GET",route="/files",status="200"} 1');
  });

  it('refreshes system gauges from live services at scrape time', async () => {
    StorageNodeService.getNodeHealth.mockResolvedValue({
      total: 3,
      byStatus: { ACTIVE: 2, DEGRADED: 1 },
    });
    StorageNodeService.buildRing.mockResolvedValue({ ring: { ringSize: () => 450 }, nodes: ['A', 'B', 'C'] });
    ReplicationService.getReplicationReport.mockResolvedValue({
      replication_factor: 3,
      total_files: 10,
      under_replicated_files: 2,
    });
    __setMockRows([{ count: '4' }]);

    await updateSystemGauges();

    const text = await client.register.metrics();
    expect(text).toContain('storage_nodes_by_status{status="ACTIVE"} 2');
    expect(text).toContain('storage_nodes_by_status{status="DEGRADED"} 1');
    expect(text).toContain('storage_nodes_by_status{status="DOWN"} 0');
    expect(text).toContain('# TYPE hash_ring_nodes gauge');
    expect(text).toContain('hash_ring_nodes 3');
    expect(text).toContain('files_under_replicated 2');
    expect(text).toContain('multipart_active_uploads 4');
  });
});