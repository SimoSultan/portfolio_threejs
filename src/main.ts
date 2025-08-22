import * as THREE from "three";

import { ChatUI } from "./chatbot";
import { AnimationManager } from "./threejs/animation-manager";
import { CameraManager } from "./threejs/camera-manager";
import { COLORS } from "./threejs/constants";
import { CircleGeometry } from "./threejs/geometry";
import { Lighting } from "./threejs/lighting";
import { calculateBoundingSphere } from "./threejs/utils";

class PortfolioScene {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private tubesGroup!: THREE.Group;
  private cameraManager!: CameraManager;
  private animationManager!: AnimationManager;
  private animationId!: number;
  private chatUI!: ChatUI;

  constructor() {
    this.init();
    this.animate();
    this.setupEventListeners();
  }

  private init(): void {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.BACKGROUND);

    // Camera setup - aspect ratio will be set properly after renderer initialization
    this.camera = new THREE.PerspectiveCamera(
      75,
      1, // Temporary aspect ratio, will be updated in updateRendererSize()
      0.1,
      1000
    );
    // Set initial camera position - will be adjusted for mobile in updateRendererSize()
    this.camera.position.set(0, 0, 10);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById("threejs-canvas") as HTMLCanvasElement,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
      stencil: false,
      depth: true,
    });
    // Set initial renderer size based on actual canvas dimensions
    this.updateRendererSize();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Lighting
    Lighting.setupLighting(this.scene);

    // Initialize camera manager first
    this.cameraManager = new CameraManager(this.camera, this.renderer);

    // Initialize animation manager
    this.animationManager = new AnimationManager(this.scene);

    // Build circle geometry
    this.buildCircle();

    // Camera positioning is now handled manually in updateRendererSize() for mobile responsiveness

    // Start initial page load animation on page load
    this.animationManager.triggerInitialPageLoadAnimation(this.tubesGroup);

    // Initialize chatbot
    this.chatUI = new ChatUI();

    // Position the chat UI within the app container
    const appContainer = document.getElementById("app");
    if (appContainer && this.chatUI) {
      // Move the chat UI to be positioned relative to the app container
      const chatContainer = this.chatUI.getContainer();
      if (chatContainer) {
        appContainer.appendChild(chatContainer);
      }
    }
  }

  private getCanvasDimensions(): { width: number; height: number } {
    const canvas = document.getElementById(
      "threejs-canvas"
    ) as HTMLCanvasElement;
    const canvasRect = canvas.getBoundingClientRect();
    return { width: canvasRect.width, height: canvasRect.height };
  }

  private updateRendererSize(): void {
    const { width, height } = this.getCanvasDimensions();
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;

    // Adjust camera position for mobile devices
    // Move camera down and adjust Z to maintain proper perspective
    if (width < 640) {
      // Mobile breakpoint (sm:)
      this.camera.position.y = -1.5; // Move camera down significantly
      this.camera.position.z = 4; // Much closer than the calculated 80.6
    } else {
      this.camera.position.y = 0; // Desktop: keep centered
      this.camera.position.z = 2.3; // Desktop: original Z position
    }

    this.camera.updateProjectionMatrix();
  }

  private buildCircle(): void {
    this.tubesGroup = CircleGeometry.buildCircle();
    // Center the circle at the origin
    this.tubesGroup.position.set(0, 0, 0);
    this.scene.add(this.tubesGroup);

    // Calculate bounding sphere for camera fitting - only for the tubes, not the floor
    const bounds = calculateBoundingSphere([this.tubesGroup]);
    console.log("Circle bounds:", bounds); // Debug logging

    // Adjust bounds to focus only on the circle area, not the floor
    const adjustedBounds = {
      center: new THREE.Vector3(0, 0, 0), // Keep camera focused on circle center
      radius: 1.15, // Increased by 15% to move camera slightly further away
    };

    this.cameraManager.setObjectBounds(
      adjustedBounds.center,
      adjustedBounds.radius
    );
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
      this.updateRendererSize();
    });

    // Listen for animation trigger events from chat UI
    window.addEventListener("triggerAnimation", (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("🎬 Animation triggered:", customEvent.detail);
      this.triggerAnimation(customEvent.detail.type);
    });

    // Listen for animation stop events from chatbot
    window.addEventListener("stopAnimation", () => {
      console.log("⏹️ Stopping animation...");
      if (this.animationManager && this.tubesGroup) {
        this.animationManager.stopAnimation();
        this.animationManager.resetTubesToOriginal(this.tubesGroup);

        // Resume infinite animation if it should be resumed
        setTimeout(() => {
          this.animationManager.resumeInfiniteAnimation(this.tubesGroup);
        }, 50);
      }
    });

    // Legacy event listener for backward compatibility
    window.addEventListener("testAnimation", () => {
      console.log("🎬 Legacy animation test triggered");
      this.triggerAnimation("spin");
    });
  }

  private triggerAnimation(animationType: string): void {
    if (!this.tubesGroup || !this.animationManager) {
      console.warn(
        "⚠️ Cannot trigger animation - tubes group or animation manager not ready"
      );
      return;
    }

    switch (animationType) {
      case "spin":
        this.animationManager.setShouldResumeInfiniteAnimation(true);
        this.animationManager.triggerSpinAnimation(this.tubesGroup);
        break;
      case "wave":
        this.animationManager.setShouldResumeInfiniteAnimation(true);
        this.animationManager.triggerMexicanWaveAnimation(
          this.tubesGroup,
          2000,
          false
        ); // Single cycle for manual trigger
        break;
      case "speedUpInfinite":
        this.animationManager.speedUpInfiniteAnimation(3.0); // 3x speed
        break;
      case "resumeInfiniteSpeed":
        this.animationManager.resumeInfiniteAnimationSpeed();
        break;
      case "resumeInfinite":
        this.animationManager.forceRestartInfiniteAnimation(this.tubesGroup);
        break;
      case "initialPageLoad":
        this.animationManager.triggerInitialPageLoadAnimation(this.tubesGroup);
        break;
      case "bounce":
        this.animationManager.setShouldResumeInfiniteAnimation(true);
        this.animationManager.triggerBounceAnimation(this.tubesGroup);
        break;
      case "backflip":
        this.animationManager.setShouldResumeInfiniteAnimation(true);
        this.animationManager.triggerBackflipAnimation(this.tubesGroup);
        break;
      case "multiSpin":
        this.animationManager.setShouldResumeInfiniteAnimation(true);
        this.animationManager.triggerMultiAxisSpinAnimation(this.tubesGroup);
        break;
      case "individualBackflip":
        this.animationManager.setShouldResumeInfiniteAnimation(true);
        this.animationManager.triggerIndividualTubeBackflipAnimation(
          this.tubesGroup
        );
        break;
      case "continuousWave":
        this.animationManager.triggerIndividualTubeBackflipAnimation(
          this.tubesGroup,
          3000,
          true
        );
        break;
      default:
        console.warn(`⚠️ Unknown animation type: ${animationType}`);
        break;
    }
  }

  // Legacy triggerCircleAnimation method removed - use triggerAnimation instead

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Dispose of Three.js resources
    this.scene.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    // Dispose of animation manager
    if (this.animationManager) {
      this.animationManager.dispose();
    }

    // Dispose of chatbot
    if (this.chatUI) {
      this.chatUI.destroy();
    }

    this.renderer.dispose();
  }
}

// Initialize the portfolio scene when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new PortfolioScene();
});
