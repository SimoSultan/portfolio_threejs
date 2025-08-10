import * as THREE from "three";

export const COLORS = {
  BACKGROUND: 0x0a0a0a, // Off-black background
  TUBE: 0x4a9eff, // Blue wireframe
  TUBE_EMISSIVE: 0x1e3a8a, // Darker blue for glow
} as const;

export const MATERIALS = {
  TUBE: new THREE.MeshStandardMaterial({
    color: COLORS.TUBE,
    emissive: COLORS.TUBE_EMISSIVE,
    emissiveIntensity: 0.3,
    metalness: 0.8,
    roughness: 0.2,
  }),
} as const;

export const GEOMETRY = {
  TUBE_RADIUS: 0.002, // 2mm thick wires
  TUBE_SEGMENTS: 8, // Number of segments for tube geometry
} as const;

export function calculateBoundingSphere(objects: THREE.Object3D[]): {
  center: THREE.Vector3;
  radius: number;
} {
  const box = new THREE.Box3();

  objects.forEach((obj) => {
    obj.traverse((child) => {
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

export function createTubeBetweenPoints(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  radius: number = GEOMETRY.TUBE_RADIUS,
  material: THREE.Material = MATERIALS.TUBE
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(p2, p1);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    length,
    GEOMETRY.TUBE_SEGMENTS
  );

  const tube = new THREE.Mesh(geometry, material);
  tube.position.copy(p1).add(direction.multiplyScalar(0.5));
  tube.lookAt(p2);
  return tube;
}
