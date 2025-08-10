import * as THREE from "three";

class PortfolioScene {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private group!: THREE.Group;
  private tubeMaterial!: THREE.MeshStandardMaterial;

  constructor() {
    this.init();
    this.animate();
  }

  private createEllipseLoop(
    center: THREE.Vector3,
    radiusX: number,
    radiusY: number,
    zOffset = 0,
    segments = 64
  ): THREE.CatmullRomCurve3 {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const x = center.x + Math.cos(t) * radiusX;
      const y = center.y + Math.sin(t) * radiusY;
      const z = center.z + zOffset;
      pts.push(new THREE.Vector3(x, y, z));
    }
    // Close the loop by repeating the first point
    pts.push(pts[0].clone());
    return new THREE.CatmullRomCurve3(pts, true);
  }

  private createFaceOutlineLoop(segments = 160): THREE.CatmullRomCurve3 {
    // Egg-shaped face contour in XY plane at z ~ 0
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const ct = Math.cos(t);
      const st = Math.sin(t);
      // Base ellipse
      let x = ct;
      let y = st;

      // Vertical and horizontal scaling
      let scaleX = 0.85;
      let scaleY = 1.15;

      // Jaw taper: narrower at the bottom
      if (y < 0) {
        const jawT = (1 + y) / 1; // y in [-1,0] -> [0,1]
        scaleX *= 0.65 + 0.35 * jawT; // from 0.65 at chin to ~1 near mid
      }

      // Cheekbone hint: widen slightly around upper-mid
      if (y > 0.1 && y < 0.6) {
        scaleX *= 1.05;
      }

      // Forehead slightly flatter
      if (y > 0.7) {
        x *= 0.98;
      }

      x *= scaleX;
      y *= scaleY;

      // Slight forward bulge (subtle depth)
      const z = 0.02 + 0.04 * Math.max(0, y);

      pts.push(new THREE.Vector3(x, y, z));
    }
    pts.push(pts[0].clone());
    return new THREE.CatmullRomCurve3(pts, true);
  }

  private createNoseCurve(): THREE.CatmullRomCurve3 {
    // Simple nose bridge to tip and slight return
    const pts = [
      new THREE.Vector3(0.0, 0.45, 0.02),
      new THREE.Vector3(0.0, 0.28, 0.06),
      new THREE.Vector3(0.0, 0.12, 0.12),
      new THREE.Vector3(0.0, 0.02, 0.18), // tip
      new THREE.Vector3(0.0, -0.03, 0.10),
    ];
    return new THREE.CatmullRomCurve3(pts, false);
  }

  private createTubeFromCurve(curve: THREE.Curve<THREE.Vector3>, radius: number, tubularSegments = 128): THREE.Mesh {
    const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, 12, false);
    return new THREE.Mesh(geometry, this.tubeMaterial);
  }

  private init(): void {
    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 4.2);

    // Renderer
    const canvas = document.getElementById("threejs-canvas") as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0b0b10, 1); // off-black background

    // Lights
    const ambient = new THREE.AmbientLight(0x355c7d, 0.9);
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(3, 5, 2);
    const rim = new THREE.DirectionalLight(0x4ea1ff, 0.6);
    rim.position.set(-4, 2, -2);
    this.scene.add(ambient, key, rim);

    // Blue tube material
    this.tubeMaterial = new THREE.MeshStandardMaterial({
      color: 0x4ea1ff,
      metalness: 0.15,
      roughness: 0.55,
      side: THREE.DoubleSide,
    });

    // Group of feature tubes
    this.group = new THREE.Group();

    // Tube radius ~ 2mm in our unit scale
    const R = 0.02;

    // Face outline
    const faceOutline = this.createFaceOutlineLoop();
    this.group.add(this.createTubeFromCurve(faceOutline, R, 300));

    // Eyes
    const leftEye = this.createEllipseLoop(new THREE.Vector3(-0.45, 0.23, 0.09), 0.22, 0.12, 0, 72);
    const rightEye = this.createEllipseLoop(new THREE.Vector3(0.45, 0.23, 0.09), 0.22, 0.12, 0, 72);
    this.group.add(this.createTubeFromCurve(leftEye, R));
    this.group.add(this.createTubeFromCurve(rightEye, R));

    // Nose
    const nose = this.createNoseCurve();
    this.group.add(this.createTubeFromCurve(nose, R));

    // Nostril hints (small ellipses)
    const leftNostril = this.createEllipseLoop(new THREE.Vector3(-0.10, -0.03, 0.10), 0.06, 0.03, 0, 48);
    const rightNostril = this.createEllipseLoop(new THREE.Vector3(0.10, -0.03, 0.10), 0.06, 0.03, 0, 48);
    this.group.add(this.createTubeFromCurve(leftNostril, R * 0.85));
    this.group.add(this.createTubeFromCurve(rightNostril, R * 0.85));

    // Mouth (flattened ellipse)
    const mouth = this.createEllipseLoop(new THREE.Vector3(0.0, -0.35, 0.06), 0.40, 0.12, 0, 96);
    this.group.add(this.createTubeFromCurve(mouth, R));

    // Slight depth: bring eyes/mouth forward compared to outline already handled via z offsets

    // Center group at origin to keep model centered in view
    this.group.position.set(0, 0, 0);
    this.scene.add(this.group);

    // Handle window resize
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    // No rotation; keep perfectly centered and static
    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Initialize the scene when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new PortfolioScene();
  console.log("Static tube-based face outline initialized.");
});
