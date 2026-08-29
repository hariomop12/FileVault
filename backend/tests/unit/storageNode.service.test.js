jest.mock('../../utils/logger');
jest.mock('../../config/db', () => require('../../__mocks__/db'));

const StorageNodeService = require('../../services/storageNode.service');
const { __setMockRows, __setMockResponses, __clearMock, query } = require('../../config/db');

describe('StorageNodeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearMock();
  });

  describe('getAllNodes', () => {
    it('returns all nodes', async () => {
      __setMockRows([
        { id: 1, name: 'n1', type: 'LOCAL', status: 'ACTIVE' },
        { id: 2, name: 'n2', type: 'R2', status: 'DOWN' },
      ]);
      const { nodes } = await StorageNodeService.getAllNodes();
      expect(nodes).toHaveLength(2);
    });
  });

  describe('getActiveNodes', () => {
    it('filters to ACTIVE nodes via query', async () => {
      __setMockRows([{ id: 1, name: 'n1' }]);
      const nodes = await StorageNodeService.getActiveNodes();
      expect(nodes).toHaveLength(1);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'ACTIVE'")
      );
    });
  });

  describe('registerNode', () => {
    it('rejects when name is missing', async () => {
      const r = await StorageNodeService.registerNode({});
      expect(r.error).toBeDefined();
    });

    it('rejects invalid type', async () => {
      const r = await StorageNodeService.registerNode({ name: 'x', type: 'GCS' });
      expect(r.error).toBeDefined();
    });

    it('registers a valid node', async () => {
      __setMockRows([
        { id: 5, name: 'n5', endpoint: 'e', type: 'R2', status: 'ACTIVE' },
      ]);
      const r = await StorageNodeService.registerNode({ name: 'n5', endpoint: 'e', type: 'R2' });
      expect(r.node.name).toBe('n5');
    });
  });

  describe('updateNodeStatus', () => {
    it('rejects invalid status', async () => {
      const r = await StorageNodeService.updateNodeStatus(1, 'BANANA');
      expect(r.error).toBeDefined();
    });

    it('updates status and returns node', async () => {
      __setMockRows([{ id: 1, status: 'DOWN' }]);
      const r = await StorageNodeService.updateNodeStatus(1, 'DOWN');
      expect(r.node.status).toBe('DOWN');
    });

    it('returns error when node not found', async () => {
      __setMockRows([]);
      const r = await StorageNodeService.updateNodeStatus(999, 'DOWN');
      expect(r.error).toBeDefined();
    });
  });

  describe('placeFile', () => {
    it('returns an error when there are no active nodes', async () => {
      __setMockRows([]);
      const r = await StorageNodeService.placeFile('file.txt');
      expect(r.error).toBeDefined();
    });

    it('places file on distinct nodes using the ring', async () => {
      __setMockRows([
        { id: 1, name: 'A', type: 'LOCAL', status: 'ACTIVE' },
        { id: 2, name: 'B', type: 'R2', status: 'ACTIVE' },
        { id: 3, name: 'C', type: 'R2', status: 'ACTIVE' },
      ]);
      const r = await StorageNodeService.placeFile('myfile.txt', 3);
      expect(r.primary).toBeDefined();
      expect(r.replicas).toHaveLength(3);
      expect(new Set(r.replicas).size).toBe(3);
      expect(['A', 'B', 'C']).toContain(r.primary);
    });
  });

  describe('getNodeHealth', () => {
    it('aggregates node counts by status', async () => {
      __setMockRows([
        { status: 'ACTIVE', count: 3 },
        { status: 'DOWN', count: 1 },
      ]);
      const h = await StorageNodeService.getNodeHealth();
      expect(h.total).toBe(4);
      expect(h.byStatus.ACTIVE).toBe(3);
      expect(h.byStatus.DOWN).toBe(1);
    });
  });

  describe('recordHeartbeat', () => {
    it('updates last_heartbeat and returns node', async () => {
      __setMockRows([{ id: 1, name: 'n1' }]);
      const r = await StorageNodeService.recordHeartbeat(1);
      expect(r.node.id).toBe(1);
    });

    it('returns null when node missing', async () => {
      __setMockRows([]);
      const r = await StorageNodeService.recordHeartbeat(999);
      expect(r).toBeNull();
    });
  });
});
