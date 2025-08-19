import * as THREE from "three";
import { createTubeBetweenPoints } from "./utils";

export class FaceGeometry {
  // Build a tube-based circle (smaller radius, thicker tubes)
  static buildFace(): THREE.Group {
    const group = new THREE.Group();

    const SEGMENTS = 96; // smooth circle
    const RADIUS = 1.5; // smaller main circle
    const TUBE_RADIUS = 0.03; // thicker tubes

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
      const tube = createTubeBetweenPoints(a, b, TUBE_RADIUS);
      group.add(tube);
      tubeCount++;
    }

    console.log(`Created ${tubeCount} tubes to form a circle`);
    return group;
  }
}
