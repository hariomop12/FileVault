jest.mock('../../utils/logger');
jest.mock('../../services/storageNode.service', () => ({
  getNodeHeartbeatState: jest.fn(),
  updateNodeStatus: jest.fn(),
}));
jest.mock('../../services/replication.service', () => ({
  reconcileAll: jest.fn(),
}));

const {
  evaluateNodeHealth,
  scanAndMarkDown,
  runReplicator,
  SUSPICION_TIMEOUT_MS,
  FAILSAFE_TIMEOUT_MS,
} = require('../../utils/backgroundJobs');
const StorageNodeService = require('../../services/storageNode.service');
const ReplicationService = require('../../services/replication.service');

describe('backgroundJobs (heartbeat / failure detection)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateNodeHealth', () => {
    it('keeps a fresh ACTIVE node ACTIVE', () => {
      const now = Date.now();
      const { desiredStatus } = evaluateNodeHealth('ACTIVE', new Date(now - 5 * 1000), now);
      expect(desiredStatus).toBe('ACTIVE');
    });

    it('marks a node DEGRADED after the suspicion window', () => {
      const now = Date.now();
      const { desiredStatus } = evaluateNodeHealth(
        'ACTIVE',
        new Date(now - (SUSPICION_TIMEOUT_MS + 1000)),
        now
      );
      expect(desiredStatus).toBe('DEGRADED');
    });

    it('marks a silent node DOWN after the failsafe window', () => {
      const now = Date.now();
      const { desiredStatus } = evaluateNodeHealth(
        'ACTIVE',
        new Date(now - (FAILSAFE_TIMEOUT_MS + 1000)),
        now
      );
      expect(desiredStatus).toBe('DOWN');
    });

    it('escalates a DEGRADED node to DOWN when silent too long', () => {
      const now = Date.now();
      const { desiredStatus } = evaluateNodeHealth(
        'DEGRADED',
        new Date(now - (FAILSAFE_TIMEOUT_MS + 1000)),
        now
      );
      expect(desiredStatus).toBe('DOWN');
    });

    it('never revives a DOWN node from silence alone', () => {
      const now = Date.now();
      const { desiredStatus } = evaluateNodeHealth('DOWN', new Date(now - 5 * 1000), now);
      expect(desiredStatus).toBe('DOWN');
    });

    it('treats a missing heartbeat as infinitely old', () => {
      const { desiredStatus } = evaluateNodeHealth('ACTIVE', null, Date.now());
      expect(desiredStatus).toBe('DOWN');
    });
  });

  describe('scanAndMarkDown', () => {
    it('demotes stale nodes and leaves healthy ones alone', async () => {
      const now = Date.now();
      const age = (ms) => new Date(now - ms).toISOString();
      StorageNodeService.getNodeHeartbeatState.mockResolvedValue([
        { id: 1, name: 'A', status: 'ACTIVE', last_heartbeat_at: age(5 * 1000) },
        { id: 2, name: 'B', status: 'ACTIVE', last_heartbeat_at: age(SUSPICION_TIMEOUT_MS + 5000) },
        { id: 3, name: 'C', status: 'ACTIVE', last_heartbeat_at: age(FAILSAFE_TIMEOUT_MS + 5000) },
        { id: 4, name: 'D', status: 'DOWN', last_heartbeat_at: age(FAILSAFE_TIMEOUT_MS + 5000) },
      ]);
      StorageNodeService.updateNodeStatus.mockResolvedValue({ node: { id: 2, status: 'DEGRADED' } });

      await scanAndMarkDown();

      expect(StorageNodeService.updateNodeStatus).toHaveBeenCalledWith(2, 'DEGRADED');
      expect(StorageNodeService.updateNodeStatus).toHaveBeenCalledWith(3, 'DOWN');
      expect(StorageNodeService.updateNodeStatus).toHaveBeenCalledTimes(2);
    });

    it('updates nothing when all nodes are healthy', async () => {
      const now = Date.now();
      StorageNodeService.getNodeHeartbeatState.mockResolvedValue([
        { id: 5, name: 'E', status: 'ACTIVE', last_heartbeat_at: new Date(now - 3 * 1000).toISOString() },
      ]);

      await scanAndMarkDown();

      expect(StorageNodeService.updateNodeStatus).not.toHaveBeenCalled();
    });
  });

  describe('runReplicator', () => {
    it('invokes the replication pass and logs corrections', async () => {
      ReplicationService.reconcileAll.mockResolvedValue({
        files_scanned: 5,
        correction_count: 2,
        under_replicated: 1,
      });

      await runReplicator();

      expect(ReplicationService.reconcileAll).toHaveBeenCalledTimes(1);
    });

    it('logs a failure without throwing when the pass errors', async () => {
      ReplicationService.reconcileAll.mockRejectedValue(new Error('boom'));

      await expect(runReplicator()).resolves.toBeUndefined();
    });
  });
});
