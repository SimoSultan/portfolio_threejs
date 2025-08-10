import * as THREE from "three";
import {
  FACE_GEOMETRY,
  FACE_EDGES,
  COLORS,
  MATERIAL_PROPERTIES,
} from "./constants";

export class FaceGeometry {
  static buildFace(): THREE.Group {
    const tubesGroup = new THREE.Group();

    // Create tubes for each edge using the predefined constants
    let tubeCount = 0;
    for (const [pointA, pointB] of FACE_EDGES) {
      const tube = this.createTubeBetweenPoints(
        pointA,
        pointB,
        FACE_GEOMETRY.TUBE_RADIUS
      );
      tubesGroup.add(tube);
      tubeCount++;
    }

    console.log(`Created ${tubeCount} tubes from ${FACE_EDGES.length} edges`);

    return tubesGroup;
  }

  private static createTubeBetweenPoints(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    radius: number
  ): THREE.Mesh {
    const direction = new THREE.Vector3().subVectors(p2, p1);
    const length = direction.length();
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 8);
    const material = new THREE.MeshStandardMaterial({
      color: COLORS.FACE_WIREFRAME,
      emissive: COLORS.FACE_EMISSIVE,
      emissiveIntensity: MATERIAL_PROPERTIES.EMISSIVE_INTENSITY,
      metalness: MATERIAL_PROPERTIES.METALNESS,
      roughness: MATERIAL_PROPERTIES.ROUGHNESS,
    });

    const tube = new THREE.Mesh(geometry, material);
    tube.position.copy(p1).add(direction.multiplyScalar(0.5));
    tube.lookAt(p2);
    return tube;
  }
}
