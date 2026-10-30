const assert = require("assert");
const A = require("./annotations.js");
const { normalizeProject } = require("./api.js");

const mkAnn = (id, nodeId) => ({
  id, nodeId, tool: "pen",
  points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }],
  color: "#fff", width: 0.004, createdAt: "2026-01-01T00:00:00.000Z",
  followTarget: "none", description: "",
});
const mkNode = (id, start, dur, anns) => ({
  id, start, duration: dur, trackId: "T1",
  creative: { description: "", followTarget: "none", annotations: anns, updatedAt: "x" },
  ai: { designProposal: "", versions: [], adoptedVersionId: null, proposals: [] },
  reviewStatus: "draft", createdAt: "x", updatedAt: "x",
});

const raw = {
  name: "T", version: "0.1.0", sourceVideo: "v.mp4", nextNodeId: 3, tracks: ["T1"],
  nodes: [
    mkNode("FX-001", 0, 4, [mkAnn("a1", "FX-001")]),            // A: 0..4
    mkNode("FX-002", 2, 4, [mkAnn("b1", "FX-002"), mkAnn("b2", "FX-002")]), // B: 2..6
  ],
  ui: { selectedNodeId: "FX-001", lastTime: 0 },
};
// __CUT__
const p = normalizeProject(raw);
const ids = (t) => A.visibleAnnotationsAt(p, t).map((x) => x.id).sort().join(",");
assert.strictEqual(ids(1), "a1");
assert.strictEqual(ids(3), "a1,b1,b2");
assert.strictEqual(ids(5), "b1,b2");
assert.strictEqual(ids(7), "");
assert.strictEqual(A.editableNodeIdAt(p, 3), "FX-001");
assert.strictEqual(A.editableNodeIdAt(p, 5), null);
const round = normalizeProject(JSON.parse(JSON.stringify(p)));
for (const n of round.nodes) for (const a of n.creative.annotations) assert.strictEqual(a.nodeId, n.id);
p.nodes.find((n) => n.id === "FX-001").duration = 10;
assert.strictEqual(ids(7), "a1");
console.log("ALL REGRESSION CHECKS PASSED");
