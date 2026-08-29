const ConsistentHashRing = require("../../utils/consistentHash");

const generateKeys = (n) =>
  Array.from({ length: n }, (_, i) => `file-${i}-${Math.random().toString(36).slice(2)}`);

describe("ConsistentHashRing", () => {
  describe("basic ring operations", () => {
    it("should place a key on one of the nodes", () => {
      const ring = new ConsistentHashRing(["A", "B", "C"], 100);
      const node = ring.getNode("hello.txt");
      expect(["A", "B", "C"]).toContain(node);
    });

    it("returns null when the ring is empty", () => {
      const ring = new ConsistentHashRing([], 100);
      expect(ring.getNode("any")).toBeNull();
    });

    it("returns all given nodes via getNodes without duplicates", () => {
      const ring = new ConsistentHashRing(["A", "B", "C"], 100);
      const nodes = ring.getNodes("replicate-me.txt", 3);
      expect(nodes).toHaveLength(3);
      expect(new Set(nodes).size).toBe(3);
      expect(nodes.every((n) => ["A", "B", "C"].includes(n))).toBe(true);
    });
  });

  describe("determinism", () => {
    it("maps the same key to the same node consistently", () => {
      const ring = new ConsistentHashRing(["A", "B", "C", "D"], 150);
      const key = "stable-file.bin";
      const first = ring.getNode(key);
      for (let i = 0; i < 10; i++) {
        expect(ring.getNode(key)).toBe(first);
      }
    });
  });

  describe("graceful key migration (the core property)", () => {
    it("remaps only ~1/N of keys when a node is added", () => {
      const keys = generateKeys(5000);
      const before = new ConsistentHashRing(["A", "B", "C", "D"], 150);
      const after = new ConsistentHashRing(["A", "B", "C", "D", "E"], 150);

      const { remapRatio } = ConsistentHashRing.computeRemapRatio(
        (k) => before.getNode(k),
        (k) => after.getNode(k),
        keys
      );

      // Adding 1 of 5 nodes should remap ~20%. Allow generous slack.
      expect(remapRatio).toBeLessThan(0.35);
    });

    it("remaps only ~1/N of keys when a node is removed", () => {
      const keys = generateKeys(5000);
      const before = new ConsistentHashRing(["A", "B", "C", "D"], 150);
      const after = new ConsistentHashRing(["A", "B", "C"], 150);

      const { remapRatio } = ConsistentHashRing.computeRemapRatio(
        (k) => before.getNode(k),
        (k) => after.getNode(k),
        keys
      );

      // Removing 1 of 4 nodes should remap ~25%. Allow generous slack.
      expect(remapRatio).toBeLessThan(0.5);
    });

    it("remaps only a fraction of keys on node add+remove combined", () => {
      const keys = generateKeys(3000);
      const before = new ConsistentHashRing(["A", "B", "C"], 120);
      const after = new ConsistentHashRing(["A", "B", "C", "D"], 120);

      const { remapRatio } = ConsistentHashRing.computeRemapRatio(
        (k) => before.getNode(k),
        (k) => after.getNode(k),
        keys
      );

      expect(remapRatio).toBeLessThan(0.5);
    });
  });

  describe("replication placement", () => {
    it("places replicas on distinct nodes", () => {
      const ring = new ConsistentHashRing(["n1", "n2", "n3", "n4", "n5"], 150);
      const replicas = ring.getNodes("data-chunk-1", 3);
      expect(new Set(replicas).size).toBe(3);
    });

    it("getNodes returns at most the number of physical nodes", () => {
      const ring = new ConsistentHashRing(["n1", "n2"], 100);
      expect(ring.getNodes("k", 5)).toHaveLength(2);
    });
  });
});
