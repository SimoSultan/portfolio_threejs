import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

class PortfolioScene {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private tubesGroup!: THREE.Group;
  private nodesGroup!: THREE.Group;
  private tubeMaterial!: THREE.MeshStandardMaterial;
  private nodeMaterial!: THREE.MeshStandardMaterial;
  private controls!: OrbitControls;
  private objectCenter: THREE.Vector3 = new THREE.Vector3();
  private objectRadius: number = 1;

  constructor() {
    this.init();
    this.animate();
  }

  // Utility to mirror points across X for symmetry
  // Legacy utility kept for potential future features
  private mirror(points: THREE.Vector3[]): THREE.Vector3[] {
    return points.map((p) => new THREE.Vector3(-p.x, p.y, p.z));
  }

  private createTubeBetweenPoints(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    radius: number
  ): THREE.Mesh {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const geom = new THREE.CylinderGeometry(radius, radius, len, 8, 1, true);
    const mesh = new THREE.Mesh(geom, this.tubeMaterial);

    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      up,
      dir.clone().normalize()
    );
    mesh.quaternion.copy(quat);
    mesh.position.copy(mid);
    return mesh;
  }

  // Legacy helper kept for potential reuse
  private connectIndices(
    vertices: THREE.Vector3[],
    edges: Array<[number, number]>,
    radius: number
  ): THREE.Group {
    const g = new THREE.Group();
    for (const [a, b] of edges)
      g.add(this.createTubeBetweenPoints(vertices[a], vertices[b], radius));
    return g;
  }

  // Legacy helper kept for potential reuse
  private addNodes(vertices: THREE.Vector3[], radius: number): THREE.Group {
    const g = new THREE.Group();
    for (const v of vertices) {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 12),
        this.nodeMaterial
      );
      s.position.copy(v);
      g.add(s);
    }
    return g;
  }

  private buildFace(): void {
    // Hand-authored low‑poly face with triangular mesh, hollow eyes and mouth
    const vertices: THREE.Vector3[] = [];
    const addV = (x: number, y: number, z: number): number => {
      vertices.push(new THREE.Vector3(x, y, z));
      return vertices.length - 1;
    };

    // Midline (top to neck)
    const v_top = addV(0.0, 1.05, -0.08);
    const v_forehead = addV(0.0, 0.82, -0.04);
    const v_brow = addV(0.0, 0.56, 0.0);
    const v_glabella = addV(0.0, 0.4, 0.04);
    const v_bridge = addV(0.0, 0.22, 0.08);
    const v_tip = addV(0.0, 0.02, 0.16);
    const v_philtrum = addV(0.0, -0.1, 0.04);
    const v_ulip = addV(0.0, -0.28, 0.02);
    const v_llip = addV(0.0, -0.36, 0.0);
    const v_chin = addV(0.0, -0.62, -0.04);
    const v_neck = addV(0.0, -0.92, -0.1);

    // Right-side outline and landmarks
    const idx: Record<string, number> = {};
    const R = (label: string, x: number, y: number, z: number) => {
      idx[label] = addV(x, y, z);
    };
    R("templeHi", 0.56, 0.75, -0.03);
    R("templeLo", 0.6, 0.58, -0.01);
    R("cheekTop", 0.64, 0.32, 0.02);
    R("cheekMid", 0.58, 0.08, 0.0);
    R("jawHinge", 0.56, -0.18, -0.02);
    R("jawLow", 0.5, -0.4, -0.03);
    R("jawCorner", 0.34, -0.62, -0.05);
    R("neckSide", 0.22, -0.9, -0.1);

    // Hex eye ring (hollow)
    const eyeC = new THREE.Vector3(0.43, 0.28, 0.06);
    const eyeRx = 0.16;
    const eyeRy = 0.09;
    const eyeLabels: string[] = [];
    for (let i = 0; i < 6; i++) {
      const t = (i / 6) * Math.PI * 2;
      const ex = eyeC.x + Math.cos(t) * eyeRx;
      const ey = eyeC.y + Math.sin(t) * eyeRy;
      const name = `eye${i}`;
      R(name, ex, ey, eyeC.z);
      eyeLabels.push(name);
    }

    // Mouth right-side ring (3 points); left will be mirrored
    const mouthC = new THREE.Vector3(0.0, -0.36, 0.02);
    const mouthRx = 0.3;
    const mouthRy = 0.08;
    const mouthAngles = [-0.35 * Math.PI, -0.12 * Math.PI, 0.12 * Math.PI];
    const mouthLabels: string[] = [];
    for (const a of mouthAngles) {
      const mx = mouthC.x + Math.cos(a) * mouthRx;
      const my = mouthC.y + Math.sin(a) * mouthRy;
      const nm = `mouthR${mouthLabels.length}`;
      R(nm, Math.abs(mx), my, mouthC.z);
      mouthLabels.push(nm);
    }

    // Mirror to left side
    const leftMap: Record<string, number> = {};
    const mirrorIndex = (i: number): number => {
      const p = vertices[i];
      return addV(-p.x, p.y, p.z);
    };
    Object.keys(idx).forEach((label) => {
      leftMap[label] = mirrorIndex(idx[label]);
    });

    // Edges
    const edges: Array<[number, number]> = [];
    const E = (a: number, b: number) => edges.push([a, b]);

    // Midline chain
    E(v_top, v_forehead);
    E(v_forehead, v_brow);
    E(v_brow, v_glabella);
    E(v_glabella, v_bridge);
    E(v_bridge, v_tip);
    E(v_tip, v_philtrum);
    E(v_philtrum, v_ulip);
    E(v_ulip, v_llip);
    E(v_llip, v_chin);
    E(v_chin, v_neck);

    // Outline stitching (both sides)
    const chain = [
      "templeHi",
      "templeLo",
      "cheekTop",
      "cheekMid",
      "jawHinge",
      "jawLow",
      "jawCorner",
      "neckSide",
    ];
    for (let i = 0; i < chain.length - 1; i++) {
      const a = chain[i];
      const b = chain[i + 1];
      E(idx[a], idx[b]);
      E(leftMap[a], leftMap[b]);
    }
    // Connect outline to midline anchors
    ["templeHi", "templeLo"].forEach((l) => {
      E(v_forehead, idx[l]);
      E(v_forehead, leftMap[l]);
    });
    E(v_brow, idx["templeLo"]);
    E(v_brow, leftMap["templeLo"]);
    E(v_glabella, idx["cheekTop"]);
    E(v_glabella, leftMap["cheekTop"]);
    E(v_philtrum, idx["cheekMid"]);
    E(v_philtrum, leftMap["cheekMid"]);
    E(v_chin, idx["jawCorner"]);
    E(v_chin, leftMap["jawCorner"]);

    // Eye ring and spokes
    for (let i = 0; i < eyeLabels.length; i++) {
      const rn = eyeLabels[i];
      const nn = eyeLabels[(i + 1) % eyeLabels.length];
      const a = idx[rn];
      const b = idx[nn];
      const al = leftMap[rn];
      const bl = leftMap[nn];
      E(a, b);
      E(al, bl);
      E(v_brow, a);
      E(v_brow, al);
      E(v_glabella, a);
      E(v_glabella, al);
      E(idx["templeLo"], a);
      E(leftMap["templeLo"], al);
    }

    // Nose side hints
    const noseSideR = addV(0.18, 0.18, 0.1);
    const noseSideL = addV(-0.18, 0.18, 0.1);
    E(v_bridge, noseSideR);
    E(v_bridge, noseSideL);
    E(noseSideR, idx["cheekTop"]);
    E(noseSideL, leftMap["cheekTop"]);
    E(v_tip, noseSideR);
    E(v_tip, noseSideL);

    // Mouth ring spokes (hollow center)
    for (let i = 0; i < mouthLabels.length - 1; i++) {
      const a = idx[mouthLabels[i]];
      const b = idx[mouthLabels[i + 1]];
      const al = leftMap[mouthLabels[i]];
      const bl = leftMap[mouthLabels[i + 1]];
      E(a, b);
      E(al, bl);
    }
    mouthLabels.forEach((ml) => {
      const iR = idx[ml];
      const iL = leftMap[ml];
      E(v_philtrum, iR);
      E(v_llip, iR);
      E(v_philtrum, iL);
      E(v_llip, iL);
    });

    // Triangle diagonals across face planes for a clear triangular motif
    const triPairs: Array<[string, string]> = [
      ["templeLo", "cheekTop"],
      ["cheekTop", "cheekMid"],
      ["cheekMid", "jawHinge"],
      ["jawHinge", "jawLow"],
      ["jawLow", "jawCorner"],
    ];
    triPairs.forEach(([a, b]) => {
      E(idx[a], idx[b]);
      E(leftMap[a], leftMap[b]);
    });

    // Build tubes only (no node spheres for performance)
    const tubes = new THREE.Group();
    const tubeRadius = 0.02;
    edges.forEach(([a, b]) =>
      tubes.add(
        this.createTubeBetweenPoints(vertices[a], vertices[b], tubeRadius)
      )
    );
    this.tubesGroup = tubes;
    this.nodesGroup = new THREE.Group();
    this.scene.add(this.tubesGroup);
    this.scene.add(this.nodesGroup);

    // Cache bounds for camera fitting
    const box = new THREE.Box3().setFromObject(this.tubesGroup);
    box.getCenter(this.objectCenter);
    // Nudge center upward slightly to visually center the face, not the neck
    const height = box.max.y - box.min.y;
    this.objectCenter.y += height * 0.06;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    this.objectRadius = sphere.radius;
  }

  private fitCameraToObject(preserveDirection = true): void {
    if (!this.tubesGroup) return;
    // Compute distance to frame bounding sphere vertically and horizontally
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const fitHeightDistance = this.objectRadius / Math.sin(fov / 2);
    const fitWidthDistance = fitHeightDistance / this.camera.aspect;
    // Add gentle padding to avoid aggressive scaling
    const targetDistance = Math.max(fitHeightDistance, fitWidthDistance) * 1.15;

    const target = this.objectCenter.clone();
    const currentDir = this.camera.position
      .clone()
      .sub(this.controls?.target ?? target)
      .normalize();
    const desiredDir = preserveDirection
      ? currentDir
      : new THREE.Vector3(0, 0, 1);
    const currentDistance = this.camera.position.distanceTo(
      this.controls?.target ?? target
    );
    const blended = preserveDirection
      ? THREE.MathUtils.lerp(currentDistance, targetDistance, 0.25)
      : targetDistance;
    this.camera.position.copy(target).add(desiredDir.multiplyScalar(blended));
    this.controls.target.copy(target);
    this.camera.near = Math.max(0.01, blended * 0.01);
    this.camera.far = blended * 10;
    this.camera.updateProjectionMatrix();
    this.controls.update();
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
    this.camera.position.set(0, 0.2, 5.0);

    // Renderer
    const canvas = document.getElementById(
      "threejs-canvas"
    ) as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0b0b10, 1); // off-black

    // Lighting to give depth cues
    const ambient = new THREE.AmbientLight(0x1b2a41, 0.6);
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(3, 5, 4);
    const fill = new THREE.DirectionalLight(0x4ea1ff, 0.6);
    fill.position.set(-4, 2, -3);
    this.scene.add(ambient, key, fill);

    // Materials
    this.tubeMaterial = new THREE.MeshStandardMaterial({
      color: 0x4ea1ff,
      metalness: 0.15,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    this.nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0x9fd1ff,
      emissive: 0x2b6fff,
      emissiveIntensity: 0.9,
      metalness: 0.0,
      roughness: 0.2,
    });

    // Build face geometry
    this.buildFace();

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 0.9;

    // Fit camera to the object and center it
    this.fitCameraToObject(false);

    // Resize
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    // Update controls; keep centered on target
    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Re-fit keeping current view direction
    this.fitCameraToObject(true);
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  new PortfolioScene();
  console.log("3D triangular tube face with nodes initialized.");
});
