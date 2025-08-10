import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export class CameraManager {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private objectCenter: THREE.Vector3 = new THREE.Vector3();
  private objectRadius: number = 1;

  constructor(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.setupControls();
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.autoRotate = false;
  }

  update(): void {
    this.controls.update();
  }

  setObjectBounds(center: THREE.Vector3, radius: number): void {
    this.objectCenter = center;
    this.objectRadius = radius;
  }

  fitCameraToObject(preserveDirection = true): void {
    // Adjust object center for vertical centering (e.g., face vs. full head)
    const adjustedCenter = this.objectCenter.clone();
    adjustedCenter.y += this.objectRadius * 0.06; // Shift up by 6% of radius

    // Compute distance to frame bounding sphere vertically and horizontally
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const fitHeightDistance = this.objectRadius / Math.sin(fov / 2);
    const fitWidthDistance = fitHeightDistance / this.camera.aspect;
    const targetDistance = Math.max(fitHeightDistance, fitWidthDistance) * 1.15; // 15% padding

    const targetPosition = adjustedCenter.clone();
    if (preserveDirection) {
      const currentDir = this.camera.position
        .clone()
        .sub(this.controls.target ?? adjustedCenter)
        .normalize();
      const desiredDir = preserveDirection
        ? currentDir
        : new THREE.Vector3(0, 0, 1);
      targetPosition.add(desiredDir.multiplyScalar(targetDistance));
    } else {
      targetPosition.add(new THREE.Vector3(0, 0, targetDistance));
    }

    // Set camera position directly for immediate centering
    this.camera.position.copy(targetPosition);
    this.controls.target.copy(adjustedCenter);

    this.camera.near = Math.max(0.01, targetDistance * 0.01);
    this.camera.far = targetDistance * 10;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.fitCameraToObject();
  }

  getControls(): OrbitControls {
    return this.controls;
  }
}
