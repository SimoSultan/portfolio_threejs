import * as THREE from "three";
import { FaceGeometry } from "./face-geometry";
import { CameraManager } from "./camera-manager";
import { Lighting } from "./lighting";
import { COLORS, calculateBoundingSphere } from "./utils";

class PortfolioScene {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private tubesGroup!: THREE.Group;
  private cameraManager!: CameraManager;
  private animationId!: number;

  constructor() {
    this.init();
    this.animate();
    this.setupEventListeners();
  }

  private init(): void {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.BACKGROUND);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Set initial camera position
    this.camera.position.set(0, 0, 10);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById("threejs-canvas") as HTMLCanvasElement,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    Lighting.setupLighting(this.scene);

    // Initialize camera manager first
    this.cameraManager = new CameraManager(this.camera, this.renderer);

    // Build face geometry
    this.buildFace();

    // Fit camera to face
    this.cameraManager.fitCameraToObject();
  }

  private buildFace(): void {
    this.tubesGroup = FaceGeometry.buildFace();
    // Center the face at the origin
    this.tubesGroup.position.set(0, 0, 0);
    this.scene.add(this.tubesGroup);

    // Calculate bounding sphere for camera fitting
    const bounds = calculateBoundingSphere([this.tubesGroup]);
    console.log("Face bounds:", bounds); // Debug logging
    this.cameraManager.setObjectBounds(bounds.center, bounds.radius);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Update camera controls
    this.cameraManager.update();

    // Render scene
    this.renderer.render(this.scene, this.camera);
  }

  private setupEventListeners(): void {
    window.addEventListener("resize", () => {
      this.cameraManager.onWindowResize();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Dispose of Three.js resources
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    this.renderer.dispose();
  }
}

// Initialize the portfolio scene when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new PortfolioScene();
});
