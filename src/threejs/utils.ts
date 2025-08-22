import * as THREE from "three";

// Utilities for constructing mirrored points and edges
export function mirrorX(v: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(-v.x, v.y, v.z);
}

export function chainEdges(
  points: THREE.Vector3[]
): Array<[THREE.Vector3, THREE.Vector3]> {
  const edges: Array<[THREE.Vector3, THREE.Vector3]> = [];
  for (let i = 0; i < points.length - 1; i++) {
    edges.push([points[i], points[i + 1]]);
  }
  return edges;
}

export function loopEdges(
  points: THREE.Vector3[]
): Array<[THREE.Vector3, THREE.Vector3]> {
  const edges = chainEdges(points);
  if (points.length > 2) {
    edges.push([points[points.length - 1], points[0]]);
  }
  return edges;
}

export function connectByIndex(
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

// Legacy face edge building function (unused - we now use a simple circle)
// This function was used to build complex face geometry from constants
// Now replaced by simple circle generation in geometry.ts

// Calculate bounding sphere for camera fitting
export function calculateBoundingSphere(objects: THREE.Object3D[]): {
  center: THREE.Vector3;
  radius: number;
} {
  const box = new THREE.Box3();

  objects.forEach(obj => {
    obj.traverse(child => {
      if (child instanceof THREE.Mesh) {
        box.expandByObject(child);
      }
    });
  });

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) / 2;

  return { center, radius };
}

// Create tube between two points
export function createTubeBetweenPoints(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number = 0.01,
  material: THREE.Material
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const INCREASE_TUBE_LENGTH_FACTOR = 1.875; // Increased by 50% more (1.25 * 1.5)
  const adjustedLength = length * INCREASE_TUBE_LENGTH_FACTOR;

  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    adjustedLength,
    12
  );
  const mesh = new THREE.Mesh(geometry, material);

  // Position the tube at the midpoint
  mesh.position.copy(start).add(direction.multiplyScalar(0.5));

  // Calculate the angle to rotate the tube to align with the direction
  // This ensures all tubes have consistent orientation
  const angle = Math.atan2(direction.y, direction.x);
  mesh.rotation.z = angle;

  // Ensure the tube is oriented correctly (cylinder default is along Y-axis)
  mesh.rotation.x = Math.PI / 2;

  return mesh;
}
