import * as THREE from "three";

import { MATERIAL_PROPERTIES } from "./constants";
import { createTubeBetweenPoints } from "./utils";

export class CircleGeometry {
  // Build a tube-based circle (smaller radius, thicker tubes)
  static buildCircle(): THREE.Group {
    const group = new THREE.Group();

    const SEGMENTS = 91; // reduced by 5% from 96 for better tube visibility
    const RADIUS = 1.425; // decreased by 5% from 1.5 (1.5 * 0.95 = 1.425)
    const TUBE_RADIUS = 0.03; // thicker tubes

    // Create base material properties
    const baseMaterialProps = {
      emissiveIntensity: MATERIAL_PROPERTIES.EMISSIVE_INTENSITY,
      metalness: MATERIAL_PROPERTIES.METALNESS,
      roughness: MATERIAL_PROPERTIES.ROUGHNESS,
    };

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

      // Create a unique material for each tube with a blue gradient
      const progress = i / SEGMENTS; // 0 to 1 around the circle

      // Create a beautiful blue gradient that loops seamlessly
      const lightBlue = new THREE.Color(0x87ceeb); // Sky blue
      const mediumBlue = new THREE.Color(0x4a90e2); // Medium blue
      const deepBlue = new THREE.Color(0x1e3a8a); // Deep blue

      // Interpolate between colors based on position with seamless loop
      let tubeColor: THREE.Color;
      if (progress < 0.33) {
        // First third: light blue to medium blue
        const t = progress * 3; // 0 to 1
        tubeColor = lightBlue.clone().lerp(mediumBlue, t);
      } else if (progress < 0.67) {
        // Middle third: medium blue to deep blue
        const t = (progress - 0.33) * 3; // 0 to 1
        tubeColor = mediumBlue.clone().lerp(deepBlue, t);
      } else {
        // Last third: deep blue back to light blue for seamless loop
        const t = (progress - 0.67) * 3; // 0 to 1
        tubeColor = deepBlue.clone().lerp(lightBlue, t);
      }

      // Create material for this specific tube
      const tubeMaterial = new THREE.MeshStandardMaterial({
        color: tubeColor,
        emissive: tubeColor.clone().multiplyScalar(0.3), // Subtle glow
        ...baseMaterialProps,
      });

      const tube = createTubeBetweenPoints(a, b, TUBE_RADIUS, tubeMaterial);
      tube.castShadow = true; // Enable shadows for tubes
      group.add(tube);
      tubeCount++;
    }

    console.log(`Created ${tubeCount} tubes to form a circle`);
    return group;
  }
}
