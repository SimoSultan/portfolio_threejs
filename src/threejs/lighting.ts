import * as THREE from "three";

export class Lighting {
  static setupLighting(scene: THREE.Scene): void {
    // Primary ambient light - warm white for natural illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);

    // Secondary ambient light - cool blue for depth and atmosphere
    const secondaryAmbient = new THREE.AmbientLight(0x1a1a2a, 0.1);
    scene.add(secondaryAmbient);

    // Main directional light - positioned below and to the side for dramatic effect
    const directionalLight = new THREE.DirectionalLight(0xfffaf0, 0.8);
    directionalLight.position.set(3, -3, 4);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    directionalLight.shadow.bias = -0.0001;
    directionalLight.shadow.normalBias = 0.02;
    scene.add(directionalLight);

    // Fill light - positioned below and opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-3, -3, -4);
    scene.add(fillLight);

    // Accent light - positioned below the tubes for dramatic upward lighting
    const accentLight = new THREE.PointLight(0x4a9eff, 0.6, 40);
    accentLight.position.set(0, -2, 0);
    accentLight.castShadow = true;
    accentLight.shadow.mapSize.width = 1024;
    accentLight.shadow.mapSize.height = 1024;
    scene.add(accentLight);

    // Rim light - positioned below and behind for tube separation
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    rimLight.position.set(0, -4, -3);
    scene.add(rimLight);

    // Additional area lights positioned below and around tubes
    const leftAreaLight = new THREE.RectAreaLight(0x4a9eff, 0.4, 6, 6);
    leftAreaLight.position.set(-3, -2, 0);
    leftAreaLight.lookAt(0, 0, 0);
    scene.add(leftAreaLight);

    const rightAreaLight = new THREE.RectAreaLight(0x4a9eff, 0.4, 6, 6);
    rightAreaLight.position.set(3, -2, 0);
    rightAreaLight.lookAt(0, 0, 0);
    scene.add(rightAreaLight);

    // Subtle volumetric light effect - positioned below
    const volumetricLight = new THREE.PointLight(0x1a1a2a, 0.2, 80);
    volumetricLight.position.set(0, -1, 4);
    scene.add(volumetricLight);

    // Additional ambient occlusion simulation
    const aoLight = new THREE.AmbientLight(0x000000, -0.1);
    scene.add(aoLight);
  }
}
