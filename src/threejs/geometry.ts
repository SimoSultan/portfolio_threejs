import * as THREE from "three";

import { COLORS, MATERIAL_PROPERTIES } from "./constants";
import { createTubeBetweenPoints } from "./utils";

export class CircleGeometry {
  // Build a tube-based circle (smaller radius, thicker tubes)
  static buildCircle(): THREE.Group {
    const group = new THREE.Group();

    const SEGMENTS = 91; // reduced by 5% from 96 for better tube visibility
    const RADIUS = 1.425; // decreased by 5% from 1.5 (1.5 * 0.95 = 1.425)
    const TUBE_RADIUS = 0.03; // thicker tubes

    // Create material using constants
    const material = new THREE.MeshStandardMaterial({
      color: COLORS.CIRCLE_WIREFRAME,
      emissive: COLORS.CIRCLE_EMISSIVE,
      emissiveIntensity: MATERIAL_PROPERTIES.EMISSIVE_INTENSITY,
      metalness: MATERIAL_PROPERTIES.METALNESS,
      roughness: MATERIAL_PROPERTIES.ROUGHNESS,
    });

    const points: THREE.Vector3[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const theta = (i / SEGMENTS) * Math.PI * 2;
      points.push(
        new THREE.Vector3(Math.cos(theta) * RADIUS, Math.sin(theta) * RADIUS, 0)
      );
    }

    let tubeCount = 0;
    for (let i = 0; i < SEGMENTS; i++) {
      const a = points[i];
      const b = points[(i + 1) % SEGMENTS];
      const tube = createTubeBetweenPoints(a, b, TUBE_RADIUS, material);
      tube.castShadow = true; // Enable shadows for tubes
      group.add(tube);
      tubeCount++;
    }

    console.log(`Created ${tubeCount} tubes to form a circle`);
    return group;
  }
}
