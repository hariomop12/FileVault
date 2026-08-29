jest.mock('../../utils/logger');
jest.mock('../../config/db', () => require('../../__mocks__/db'));
jest.mock('../../config/R2', () => require('../../__mocks__/R2-r2'));
jest.mock('../../services/storageNode.service', () => ({
  getAllNodes: jest.fn(),
  placeFile: jest.fn(),
}));

const ReplicationService = require('../../services/replication.service');
const StorageNodeService = require('../../services/storageNode.service');
const { __setMockResponses, __clearMock, query } = require('../../config/db');
const { s3Client } = require('../../config/R2');
const logger = require('../../utils/logger');

const NODE_A = { id: 1, name: 'A', type: 'R2', status: 'ACTIVE' };
const NODE_B = { id: 2, name: 'B', type: 'R2', status: 'ACTIVE' };
const NODE_C = { id: 3, name: 'C', type: 'R2', status: 'ACTIVE' };

describe('ReplicationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearMock();
  });

  describe('recordPlacementForFile', () => {
    it('records replicas on every placement node and copies blob for non-primary nodes', async () => {
      __setMockResponses([
        { rows: [NODE_A] }, { rows: [] }, // A: lookup + insert
        { rows: [NODE_B] }, { rows: [] }, // B: lookup + insert
        { rows: [NODE_C] }, { rows: [] }, // C: lookup + insert
      ]);

      const result = await ReplicationService.recordPlacementForFile(7, 'user-1/file.txt', {
        primary: 'A',
        replicas: ['A', 'B', 'C'],
        replication_factor: 3,
      });

      expect(result.replicas).toBe(3);
      expect(result.file_id).toBe(7);
      expect(s3Client.send).toHaveBeenCalledTimes(2); // copies for B + C only
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Replicated'));
    });

    it('skips nodes that no longer exist', async () => {
      __setMockResponses([
        { rows: [NODE_A] }, { rows: [] }, // A exists
        { rows: [] }, // B no longer registered
      ]);

      const result = await ReplicationService.recordPlacementForFile(7, 'user-1/file.txt', {
        primary: 'A',
        replicas: ['A', 'B'],
        replication_factor: 2,
      });

      expect(result.replicas).toBe(1);
    });
  });

  describe('reconcileFile', () => {
    it('re-replicates onto healthy nodes when a holder went DOWN (self-healing)', async () => {
      StorageNodeService.getAllNodes.mockResolvedValue({ nodes: [NODE_A, NODE_B, NODE_C] });
      StorageNodeService.placeFile.mockResolvedValue({
        primary: 'B',
        replicas: ['B', 'C'],
        replication_factor: 2,
      });

      __setMockResponses([
        { rows: [{ id: 11, node_id: 1, replica_status: 'ACTIVE', node_name: 'A', node_status: 'DOWN' }] },
        { rows: [] }, // mark old replica STALE
        { rows: [NODE_B] }, { rows: [] }, // pick B, copy + insert
        { rows: [NODE_C] }, { rows: [] }, // pick C, copy + insert
      ]);

      const report = await ReplicationService.reconcileFile(7, 'user-1/file.txt', 3);

      expect(report.repaired).toBe(true);
      expect(report.recreated).toEqual(['B', 'C']);
      expect(report.recovered_from_lost).toBe(1);
      expect(report.current).toBe(2);
      expect(report.desired).toBe(3);
      expect(query).toHaveBeenCalledWith(expect.stringContaining("status = 'STALE'"), [11]);
      expect(s3Client.send).toHaveBeenCalledTimes(2);
    });

    it('makes no changes when the file already meets the replication factor', async () => {
      StorageNodeService.getAllNodes.mockResolvedValue({ nodes: [NODE_A, NODE_B, NODE_C] });
      __setMockResponses([
        {
          rows: [
            { id: 1, node_id: 1, replica_status: 'ACTIVE', node_name: 'A', node_status: 'ACTIVE' },
            { id: 2, node_id: 2, replica_status: 'ACTIVE', node_name: 'B', node_status: 'ACTIVE' },
            { id: 3, node_id: 3, replica_status: 'ACTIVE', node_name: 'C', node_status: 'ACTIVE' },
          ],
        },
      ]);

      const report = await ReplicationService.reconcileFile(7, 'user-1/file.txt', 3);

      expect(report.repaired).toBe(false);
      expect(report.current).toBe(3);
      expect(report.desired).toBe(3);
      expect(StorageNodeService.placeFile).not.toHaveBeenCalled();
      expect(s3Client.send).not.toHaveBeenCalled();
    });

    it('tops up missing copies when the file is under-replicated but all nodes are healthy', async () => {
      StorageNodeService.getAllNodes.mockResolvedValue({ nodes: [NODE_A, NODE_B, NODE_C] });
      StorageNodeService.placeFile.mockResolvedValue({
        primary: 'A',
        replicas: ['A', 'B', 'C'],
        replication_factor: 3,
      });
      __setMockResponses([
        { rows: [{ id: 1, node_id: 1, replica_status: 'ACTIVE', node_name: 'A', node_status: 'ACTIVE' }] },
        { rows: [NODE_B] }, { rows: [] },
        { rows: [NODE_C] }, { rows: [] },
      ]);

      const report = await ReplicationService.reconcileFile(7, 'user-1/file.txt', 3);

      expect(report.repaired).toBe(true);
      expect(report.recreated).toEqual(['B', 'C']);
      expect(report.current).toBe(3);
    });

    it('caps the desired factor at the number of registered nodes', async () => {
      StorageNodeService.getAllNodes.mockResolvedValue({ nodes: [NODE_A, NODE_B] });
      __setMockResponses([
        {
          rows: [
            { id: 1, node_id: 1, replica_status: 'ACTIVE', node_name: 'A', node_status: 'ACTIVE' },
            { id: 2, node_id: 2, replica_status: 'ACTIVE', node_name: 'B', node_status: 'ACTIVE' },
          ],
        },
      ]);

      const report = await ReplicationService.reconcileFile(7, 'user-1/file.txt', 9);

      expect(report.desired).toBe(2);
      expect(report.current).toBe(2);
    });
  });

  describe('reconcileAll', () => {
    it('returns a report across all files and counts corrections', async () => {
      __setMockResponses([{ rows: [{ id: 1, s3_key: 'user-1/a.txt' }, { id: 2, s3_key: 'user-2/b.txt' }] }]);
      const reconcileSpy = jest.spyOn(ReplicationService, 'reconcileFile');
      reconcileSpy
        .mockResolvedValueOnce({ file_id: 1, s3_key: 'user-1/a.txt', desired: 3, current: 3, repaired: false })
        .mockResolvedValueOnce({ file_id: 2, s3_key: 'user-2/b.txt', desired: 3, current: 1, recreated: ['C'], repaired: true });

      const result = await ReplicationService.reconcileAll(3);

      expect(result.files_scanned).toBe(2);
      expect(result.correction_count).toBe(1);
      expect(result.under_replicated).toBe(1);
      expect(result.reports).toHaveLength(2);
      reconcileSpy.mockRestore();
    });
  });

  describe('getReplicationReport', () => {
    it('counts files below the replication factor as under-replicated', async () => {
      __setMockResponses([
        { rows: [{ file_id: 1, s3_key: 'user-1/a.txt', active_replicas: '3' }] },
        { rows: [{ id: 1 }, { id: 2 }] },
      ]);

      const report = await ReplicationService.getReplicationReport();

      expect(report.replication_factor).toBe(3);
      expect(report.total_files).toBe(2);
      expect(report.under_replicated_files).toBe(1);
    });
  });
});