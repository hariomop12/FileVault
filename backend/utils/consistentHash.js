const crypto = require("crypto");

const RING_SIZE = Math.pow(2, 32);

class ConsistentHashRing {
  constructor(nodes = [], virtualNodes = 150) {
    this.virtualNodes = virtualNodes;
    this.ring = [];
    this.nodeMap = new Map();
    nodes.forEach((node) => this.addNode(node));
  }

  _hash(key) {
    return parseInt(
      crypto.createHash("sha256").update(String(key)).digest("hex").substring(0, 8),
      16
    );
  }

  addNode(node) {
    if (this.nodeMap.has(node)) return;
    const positions = [];
    for (let i = 0; i < this.virtualNodes; i++) {
      positions.push({ position: this._hash(`${node}#vn${i}`), node });
    }
    positions.sort((a, b) => a.position - b.position);
    this.ring.push(...positions);
    this.ring.sort((a, b) => a.position - b.position);
    this.nodeMap.set(node, positions.map((p) => p.position));
  }

  removeNode(node) {
    if (!this.nodeMap.has(node)) return;
    const removeSet = new Set(this.nodeMap.get(node));
    this.ring = this.ring.filter((entry) => !removeSet.has(entry.position));
    this.nodeMap.delete(node);
  }

  getNode(key) {
    if (this.ring.length === 0) return null;
    const hash = this._hash(key);
    for (let i = 0; i < this.ring.length; i++) {
      if (this.ring[i].position >= hash) {
        return this.ring[i].node;
      }
    }
    return this.ring[0].node;
  }

  getNodes(key, count = 1) {
    if (this.ring.length === 0) return [];
    const hash = this._hash(key);
    const n = Math.min(count, this.nodeMap.size);
    const result = [];
    const seen = new Set();
    const start = this._firstIndex(hash);
    for (let i = 0; i < this.ring.length && result.length < n; i++) {
      const entry = this.ring[(start + i) % this.ring.length];
      if (!seen.has(entry.node)) {
        seen.add(entry.node);
        result.push(entry.node);
      }
    }
    return result;
  }

  _firstIndex(hash) {
    for (let i = 0; i < this.ring.length; i++) {
      if (this.ring[i].position >= hash) return i;
    }
    return 0;
  }

  nodeCount() {
    return this.nodeMap.size;
  }

  ringSize() {
    return this.ring.length;
  }

  static computeRemapRatio(beforeFn, afterFn, keys) {
    let remapped = 0;
    keys.forEach((key) => {
      if (beforeFn(key) !== afterFn(key)) remapped++;
    });
    return {
      totalKeys: keys.length,
      remappedKeys: remapped,
      remapRatio: keys.length ? remapped / keys.length : 0,
    };
  }
}

module.exports = ConsistentHashRing;
