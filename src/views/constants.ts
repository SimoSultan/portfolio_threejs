import * as THREE from "three";

// Utilities for constructing mirrored points and edges
function mirrorX(v: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(-v.x, v.y, v.z);
}

function chainEdges(
  points: THREE.Vector3[]
): Array<[THREE.Vector3, THREE.Vector3]> {
  const edges: Array<[THREE.Vector3, THREE.Vector3]> = [];
  for (let i = 0; i < points.length - 1; i++) {
    edges.push([points[i], points[i + 1]]);
  }
  return edges;
}

function loopEdges(
  points: THREE.Vector3[]
): Array<[THREE.Vector3, THREE.Vector3]> {
  const edges = chainEdges(points);
  if (points.length > 2) {
    edges.push([points[points.length - 1], points[0]]);
  }
  return edges;
}

function connectByIndex(
  a: THREE.Vector3[],
  b: THREE.Vector3[]
): Array<[THREE.Vector3, THREE.Vector3]> {
  const edges: Array<[THREE.Vector3, THREE.Vector3]> = [];
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    edges.push([a[i], b[i]]);
  }
  return edges;
}

// Face Geometry Constants (kept compatible with previous exports)
export const FACE_GEOMETRY = {
  TUBE_RADIUS: 0.01,
} as const;

// Canonical proportion helper (roughly human head front view)
const Z_EYE = 0.06;
const Z_FACE = 0.0;
const Z_NOSE_TIP = 0.2;
const Z_LIPS = 0.1;

// Center line from glabella through chin (avoid long forehead stick)
const CENTER_LINE: THREE.Vector3[] = [
  new THREE.Vector3(0, 0.46, Z_FACE), // glabella
  new THREE.Vector3(0, 0.3, 0.1), // upper nose bridge
  new THREE.Vector3(0, 0.12, 0.14), // lower nose bridge
  new THREE.Vector3(0, 0.0, Z_NOSE_TIP), // nose tip
  new THREE.Vector3(0, -0.1, 0.12), // philtrum
  new THREE.Vector3(0, -0.16, Z_LIPS), // upper lip center
  new THREE.Vector3(0, -0.22, Z_LIPS), // lower lip center
  new THREE.Vector3(0, -0.45, 0.02), // chin center
];

// Head outline loop approximating forehead-temple-cheek-jaw-chin
const HEAD_LOOP: THREE.Vector3[] = [
  new THREE.Vector3(0.0, 0.62, Z_FACE), // top center
  new THREE.Vector3(0.28, 0.58, Z_FACE),
  new THREE.Vector3(0.5, 0.42, Z_FACE), // temple
  new THREE.Vector3(0.6, 0.2, -0.02), // cheekbone
  new THREE.Vector3(0.58, 0.0, -0.02), // mid cheek
  new THREE.Vector3(0.5, -0.22, 0.0), // jaw upper
  new THREE.Vector3(0.32, -0.4, 0.0), // jaw near chin
  new THREE.Vector3(0.0, -0.46, 0.02), // chin center
  new THREE.Vector3(-0.32, -0.4, 0.0),
  new THREE.Vector3(-0.5, -0.22, 0.0),
  new THREE.Vector3(-0.58, 0.0, -0.02),
  new THREE.Vector3(-0.6, 0.2, -0.02),
  new THREE.Vector3(-0.5, 0.42, Z_FACE),
  new THREE.Vector3(-0.28, 0.58, Z_FACE),
];

// Eye loops (8 points each)
const RIGHT_EYE_LOOP: THREE.Vector3[] = [
  new THREE.Vector3(0.34, 0.15, Z_EYE), // outer corner
  new THREE.Vector3(0.28, 0.21, Z_EYE),
  new THREE.Vector3(0.19, 0.24, Z_EYE), // upper middle
  new THREE.Vector3(0.1, 0.21, Z_EYE),
  new THREE.Vector3(0.06, 0.15, Z_EYE), // inner corner
  new THREE.Vector3(0.1, 0.09, Z_EYE),
  new THREE.Vector3(0.19, 0.06, Z_EYE), // lower middle
  new THREE.Vector3(0.28, 0.09, Z_EYE),
];
const LEFT_EYE_LOOP: THREE.Vector3[] = RIGHT_EYE_LOOP.map(mirrorX);

// Mouth loop (10 points)
const MOUTH_LOOP: THREE.Vector3[] = [
  new THREE.Vector3(0.22, -0.18, Z_LIPS), // right corner
  new THREE.Vector3(0.16, -0.15, Z_LIPS),
  new THREE.Vector3(0.1, -0.14, Z_LIPS),
  new THREE.Vector3(0.05, -0.15, Z_LIPS),
  new THREE.Vector3(0.0, -0.16, Z_LIPS), // cupid's bow
  new THREE.Vector3(-0.05, -0.15, Z_LIPS),
  new THREE.Vector3(-0.1, -0.14, Z_LIPS),
  new THREE.Vector3(-0.16, -0.15, Z_LIPS),
  new THREE.Vector3(-0.22, -0.18, Z_LIPS), // left corner
  new THREE.Vector3(0.0, -0.22, Z_LIPS), // lower center (close using radial flow)
];

// Nose tip loop (nostril ring), 8 points
const NOSE_TIP_LOOP: THREE.Vector3[] = [
  new THREE.Vector3(0.1, 0.02, 0.17),
  new THREE.Vector3(0.05, 0.06, 0.18),
  new THREE.Vector3(0.0, 0.08, 0.19),
  new THREE.Vector3(-0.05, 0.06, 0.18),
  new THREE.Vector3(-0.1, 0.02, 0.17),
  new THREE.Vector3(-0.05, -0.02, 0.18),
  new THREE.Vector3(0.0, -0.04, 0.19),
  new THREE.Vector3(0.05, -0.02, 0.18),
];

// Brow line above the eyes
const BROW_LINE_RIGHT: THREE.Vector3[] = [
  new THREE.Vector3(0.45, 0.36, 0.0), // outer brow lower than temple
  new THREE.Vector3(0.32, 0.3, 0.02),
  new THREE.Vector3(0.18, 0.31, 0.06), // above eye center
  new THREE.Vector3(0.06, 0.28, 0.04),
  new THREE.Vector3(0.0, 0.26, 0.1), // center glabella
];
const BROW_LINE_LEFT: THREE.Vector3[] = BROW_LINE_RIGHT.map(mirrorX).reverse();

// Cheek flow line from outer eye to mouth corner then toward jaw
const FLOW_RIGHT_1: THREE.Vector3[] = [
  RIGHT_EYE_LOOP[0],
  new THREE.Vector3(0.4, 0.08, 0.02),
  new THREE.Vector3(0.32, -0.06, 0.02),
  new THREE.Vector3(0.26, -0.14, Z_LIPS),
  MOUTH_LOOP[0],
  new THREE.Vector3(0.28, -0.3, 0.02),
  new THREE.Vector3(0.32, -0.4, 0.0),
];
const FLOW_LEFT_1: THREE.Vector3[] = FLOW_RIGHT_1.map(mirrorX);

// Under-eye to nose bridge to cupid's bow flow
const FLOW_RIGHT_2: THREE.Vector3[] = [
  RIGHT_EYE_LOOP[6],
  new THREE.Vector3(0.16, 0.02, 0.08),
  new THREE.Vector3(0.1, -0.02, 0.1),
  new THREE.Vector3(0.06, -0.02, 0.12),
  CENTER_LINE[3], // nose tip
  CENTER_LINE[4], // philtrum
  MOUTH_LOOP[4], // cupid's bow center
];
const FLOW_LEFT_2: THREE.Vector3[] = FLOW_RIGHT_2.map(mirrorX).reverse();

// Assemble all edges in a tidy, readable topology
const EDGES: Array<[THREE.Vector3, THREE.Vector3]> = [];

// Major feature loops
EDGES.push(...loopEdges(HEAD_LOOP));
EDGES.push(...loopEdges(RIGHT_EYE_LOOP));
EDGES.push(...loopEdges(LEFT_EYE_LOOP));
EDGES.push(...loopEdges(MOUTH_LOOP));
EDGES.push(...loopEdges(NOSE_TIP_LOOP));

// Center line
EDGES.push(...chainEdges(CENTER_LINE));

// Brows connected across center
EDGES.push(...chainEdges(BROW_LINE_LEFT.concat(BROW_LINE_RIGHT)));

// Flows from eye to mouth/jaw
EDGES.push(...chainEdges(FLOW_RIGHT_1));
EDGES.push(...chainEdges(FLOW_LEFT_1));
EDGES.push(...chainEdges(FLOW_RIGHT_2));
EDGES.push(...chainEdges(FLOW_LEFT_2));

// Tie brows to eye loops
EDGES.push(
  ...connectByIndex(BROW_LINE_RIGHT.slice(1, 4), RIGHT_EYE_LOOP.slice(1, 4))
);
EDGES.push(
  ...connectByIndex(BROW_LINE_LEFT.slice(1, 4), LEFT_EYE_LOOP.slice(1, 4))
);

// Connect inner eye corners to nose bridge
EDGES.push([RIGHT_EYE_LOOP[4], CENTER_LINE[1]]);
EDGES.push([LEFT_EYE_LOOP[3], CENTER_LINE[1]]);

// Connect mouth corners to jaw
EDGES.push([MOUTH_LOOP[0], HEAD_LOOP[6]]);
EDGES.push([MOUTH_LOOP[8], HEAD_LOOP[8]]);

// Export the final edges list used by the renderer
export const FACE_EDGES: Array<[THREE.Vector3, THREE.Vector3]> = EDGES;

// Colors and Materials (unchanged)
export const COLORS = {
  BACKGROUND: 0x0a0a0a,
  FACE_WIREFRAME: 0x4a9eff,
  FACE_EMISSIVE: 0x1e3a8a,
} as const;

export const MATERIAL_PROPERTIES = {
  METALNESS: 0.8,
  ROUGHNESS: 0.2,
  EMISSIVE_INTENSITY: 0.3,
} as const;
