import * as THREE from "three";

class PortfolioScene {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private tubesGroup!: THREE.Group;
  private nodesGroup!: THREE.Group;
  private tubeMaterial!: THREE.MeshStandardMaterial;
  private nodeMaterial!: THREE.MeshStandardMaterial;

  constructor() {
    this.init();
    this.animate();
  }

  // Utility to mirror points across X for symmetry
  private mirror(points: THREE.Vector3[]): THREE.Vector3[] {
    const mirrored: THREE.Vector3[] = [];
    for (const p of points) mirrored.push(new THREE.Vector3(-p.x, p.y, p.z));
    return mirrored;
  }

  private createTubeBetweenPoints(p1: THREE.Vector3, p2: THREE.Vector3, radius: number): THREE.Mesh {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const geom = new THREE.CylinderGeometry(radius, radius, len, 8, 1, true);
    const mesh = new THREE.Mesh(geom, this.tubeMaterial);

    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
    mesh.quaternion.copy(quat);
    mesh.position.copy(mid);
    return mesh;
  }

  private connectIndices(vertices: THREE.Vector3[], edges: Array<[number, number]>, radius: number): THREE.Group {
    const g = new THREE.Group();
    for (const [a, b] of edges) {
      g.add(this.createTubeBetweenPoints(vertices[a], vertices[b], radius));
    }
    return g;
  }

  private addNodes(vertices: THREE.Vector3[], radius: number): THREE.Group {
    const g = new THREE.Group();
    for (const v of vertices) {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), this.nodeMaterial);
      sphere.position.copy(v);
      g.add(sphere);
    }
    return g;
  }

  private buildFace(): void {
    // Canonical vertex set roughly in head-sized coordinates with depth (z)
    // Central vertical ridge
    const v: THREE.Vector3[] = [];
    const push = (x: number, y: number, z: number) => v.push(new THREE.Vector3(x, y, z));

    // Midline (top to neck)
    push(0.0, 1.05, -0.10); // 0 apex
    push(0.0, 0.85, -0.12); // 1 upper forehead
    push(0.0, 0.60, -0.06); // 2 mid forehead
    push(0.0, 0.40, 0.05);  // 3 glabella / nose root
    push(0.0, 0.25, 0.10);  // 4 upper bridge
    push(0.0, 0.12, 0.16);  // 5 mid bridge
    push(0.0, 0.04, 0.22);  // 6 nose tip
    push(0.0, -0.10, 0.08); // 7 philtrum
    push(0.0, -0.32, 0.02); // 8 upper lip center
    push(0.0, -0.48, -0.02); // 9 lower lip center
    push(0.0, -0.70, -0.06); // 10 chin
    push(0.0, -0.95, -0.10); // 11 neck base

    // Right-side control points (our coordinates are right > 0)
    const right: THREE.Vector3[] = [];
    const pr = (x: number, y: number, z: number) => right.push(new THREE.Vector3(x, y, z));

    // Forehead/temples
    pr(0.42, 0.88, -0.10); // 12
    pr(0.65, 0.68, -0.05); // 13 temple
    pr(0.58, 0.52, -0.03); // 14

    // Brows/eyes region depth
    pr(0.40, 0.38, -0.01); // 15 brow
    pr(0.52, 0.28, 0.05);  // 16 outer eye brow
    pr(0.34, 0.25, 0.09);  // 17 inner eye
    pr(0.46, 0.18, 0.07);  // 18 lower eye

    // Cheekbones and cheeks
    pr(0.64, 0.22, 0.02);  // 19 zygomatic high
    pr(0.66, 0.02, 0.02);  // 20 cheek mid
    pr(0.56, -0.20, -0.02); // 21 lower cheek

    // Mouth corners and jaw
    pr(0.42, -0.34, 0.00); // 22 mouth corner
    pr(0.54, -0.46, -0.03); // 23 jaw near mouth
    pr(0.50, -0.60, -0.05); // 24 jaw
    pr(0.32, -0.78, -0.06); // 25 jaw-chin transition

    // Ears projection (slight back)
    pr(0.78, 0.18, -0.06); // 26 ear upper
    pr(0.80, -0.06, -0.05); // 27 ear mid
    pr(0.74, -0.22, -0.04); // 28 ear lower

    const left = this.mirror(right); // mirrored counterparts 29..(29+right.length-1)

    const vertices: THREE.Vector3[] = [
      ...v,
      ...right,
      ...left,
    ];

    // Build symmetric index helpers
    const L = (idxRight: number) => v.length + right.length + idxRight; // mirrored index for right array
    const R = (idxRight: number) => v.length + idxRight; // right side index

    // Triangulated edge list approximating the reference style
    const edges: Array<[number, number]> = [];

    // Midline connections
    for (let i = 0; i < 11; i++) edges.push([i, i + 1]);

    // Forehead fan
    edges.push([0, R(0)]); edges.push([0, L(0)]);
    edges.push([1, R(0)]); edges.push([1, L(0)]);
    edges.push([2, R(1)]); edges.push([2, L(1)]);
    edges.push([2, R(2)]); edges.push([2, L(2)]);

    // Brow/eye triangles
    edges.push([3, R(15)]); edges.push([3, L(15)]);
    edges.push([3, R(17)]); edges.push([3, L(17)]);
    edges.push([4, R(17)]); edges.push([4, L(17)]);
    edges.push([4, R(18)]); edges.push([4, L(18)]);

    // Cheekbone network
    edges.push([5, R(19)]); edges.push([5, L(19)]);
    edges.push([5, R(20)]); edges.push([5, L(20)]);
    edges.push([7, R(21)]); edges.push([7, L(21)]);

    // Nose bridges to cheeks
    edges.push([6, R(18)]); edges.push([6, L(18)]);
    edges.push([6, R(22)]); edges.push([6, L(22)]);

    // Mouth region
    edges.push([8, R(22)]); edges.push([8, L(22)]);
    edges.push([8, 9]);
    edges.push([9, R(23)]); edges.push([9, L(23)]);

    // Jaw and chin
    edges.push([10, R(24)]); edges.push([10, L(24)]);
    edges.push([10, R(25)]); edges.push([10, L(25)]);
    edges.push([11, 10]);

    // Outer contour stitching
    edges.push([R(0), R(1)]); edges.push([L(0), L(1)]);
    edges.push([R(1), R(2)]); edges.push([L(1), L(2)]);
    edges.push([R(2), R(15)]); edges.push([L(2), L(15)]);
    edges.push([R(15), R(19)]); edges.push([L(15), L(19)]);
    edges.push([R(19), R(20)]); edges.push([L(19), L(20)]);
    edges.push([R(20), R(21)]); edges.push([L(20), L(21)]);
    edges.push([R(21), R(24)]); edges.push([L(21), L(24)]);
    edges.push([R(24), R(25)]); edges.push([L(24), L(25)]);
    edges.push([R(25), 10]); edges.push([L(25), 10]);

    // Ear connections
    edges.push([R(19), R(26)]); edges.push([L(19), L(26)]);
    edges.push([R(20), R(27)]); edges.push([L(20), L(27)]);
    edges.push([R(21), R(28)]); edges.push([L(21), L(28)]);

    // Tube and node groups
    const tubeRadius = 0.02; // ~2mm
    this.tubesGroup = this.connectIndices(vertices, edges, tubeRadius);
    this.nodesGroup = this.addNodes(vertices, tubeRadius * 0.9);

    this.scene.add(this.tubesGroup);
    this.scene.add(this.nodesGroup);
  }

  private init(): void {
    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0.2, 5.0);

    // Renderer
    const canvas = document.getElementById("threejs-canvas") as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0b0b10, 1); // off-black

    // Lighting to give depth cues
    const ambient = new THREE.AmbientLight(0x1b2a41, 0.6);
    const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(3, 5, 4);
    const fill = new THREE.DirectionalLight(0x4ea1ff, 0.6); fill.position.set(-4, 2, -3);
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

    // Resize
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    // Keep static and centered
    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  new PortfolioScene();
  console.log("3D triangular tube face with nodes initialized.");
});
