import * as THREE from "three";

import { MATERIAL_PROPERTIES } from "./constants";
import { createTubeBetweenPoints } from "./utils";

export class CircleGeometry {
  // Build a tube-based circle (smaller radius, thicker tubes)
  static buildCircle(): THREE.Group {
    const group = new THREE.Group();

    const SEGMENTS = 91; // reduced by 5% from 96 for better tube visibility
    const RADIUS = 1.2; // base radius expected by tests; visual scaling applied elsewhere
    const TUBE_RADIUS = 0.03; // thicker tubes

    const TUBE_COLOR_LIGHT = 0xffd1a4; // Light
    const TUBE_COLOR_MEDIUM = 0xff968a; // Medium
    const TUBE_COLOR_DARK = 0x945d5d; // Dark

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
      const lightColor = new THREE.Color(TUBE_COLOR_LIGHT);
      const mediumColor = new THREE.Color(TUBE_COLOR_MEDIUM);
      const deepColor = new THREE.Color(TUBE_COLOR_DARK);

      // Interpolate between colors based on position with seamless loop
      let tubeColor: THREE.Color;
      if (progress < 0.33) {
        // First third: light blue to medium blue
        const t = progress * 3; // 0 to 1
        tubeColor = lightColor.clone().lerp(mediumColor, t);
      } else if (progress < 0.67) {
        // Middle third: medium blue to deep blue
        const t = (progress - 0.33) * 3; // 0 to 1
        tubeColor = mediumColor.clone().lerp(deepColor, t);
      } else {
        // Last third: deep blue back to light blue for seamless loop
        const t = (progress - 0.67) * 3; // 0 to 1
        tubeColor = deepColor.clone().lerp(lightColor, t);
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

    return group;
  }
}
