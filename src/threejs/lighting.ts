import * as THREE from "three";

export class Lighting {
  static setupLighting(scene: THREE.Scene): void {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // Directional light for shadows and depth
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Point light for additional depth
    const pointLight = new THREE.PointLight(0x4a9eff, 0.5, 100);
    pointLight.position.set(-5, 5, 5);
    scene.add(pointLight);
  }
}
