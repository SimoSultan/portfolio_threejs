import * as THREE from "three";

export type BackgroundMode = "none" | "wave";

/**
 * BackgroundManager renders subtle background effects that live behind
 * foreground content. The WebGL canvas remains transparent, so these
 * effects layer over the page gradient without a hard background.
 */
export class BackgroundManager {
  private scene: THREE.Scene;
  private mode: BackgroundMode = "none";
  private root: THREE.Group | null = null;
  private clock: THREE.Clock = new THREE.Clock();

  // Wave-specific data
  private wavePoints: THREE.Points | null = null;
  private waveBasePositions: Float32Array | null = null;
  private waveGeometry: THREE.BufferGeometry | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public setMode(mode: BackgroundMode): void {
    if (this.mode === mode) return;
    this.disposeCurrent();
    this.mode = mode;
    this.root = new THREE.Group();
    this.root.renderOrder = -10; // Ensure it renders behind other content
    this.scene.add(this.root);

    switch (mode) {
      case "wave":
        this.createWave();
        break;
      case "none":
      default:
        break;
    }
  }

  public update(): void {
    if (this.mode === "wave" && this.wavePoints && this.waveGeometry && this.waveBasePositions) {
      const t = this.clock.getElapsedTime();
      const positions = this.waveGeometry.attributes.position.array as Float32Array;

      // Parameters for the wave motion
      const amp = 0.15; // amplitude
      const freq = 0.7; // frequency
      const speed = 0.6; // speed

      for (let i = 0; i < positions.length; i += 3) {
        const x = this.waveBasePositions[i];
        const y0 = this.waveBasePositions[i + 1];
        const z = this.waveBasePositions[i + 2];

        const y =
          y0 +
          amp *
            (Math.sin(x * freq + t * speed) +
              Math.cos(z * freq * 1.3 + t * speed * 0.8)) *
            0.5;

        positions[i] = x;
        positions[i + 1] = y;
        positions[i + 2] = z;
      }

      this.waveGeometry.attributes.position.needsUpdate = true;
      if (this.root) {
        // Gentle drift for the whole effect
        this.root.rotation.z = Math.sin(t * 0.05) * 0.03;
      }
    }
  }

  public dispose(): void {
    this.disposeCurrent();
  }

  private disposeCurrent(): void {
    if (this.root) {
      this.scene.remove(this.root);
      this.root.traverse(obj => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        const mat = (obj as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose());
        } else if (mat) {
          mat.dispose();
        }
      });
      this.root.clear();
      this.root = null;
    }

    this.wavePoints = null;
    this.waveBasePositions = null;
    if (this.waveGeometry) {
      this.waveGeometry.dispose();
      this.waveGeometry = null;
    }
  }

  private createWave(): void {
    if (!this.root) return;

    // Grid of points spanning the viewport area, rendered behind content
    const cols = 120;
    const rows = 60;
    const spacing = 0.15;

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(cols * rows * 3);
    const colors = new Float32Array(cols * rows * 3);

    const halfW = (cols - 1) * spacing * 0.5;
    const halfH = (rows - 1) * spacing * 0.5;

    let ptr = 0;
    let cptr = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * spacing - halfW;
        const z = r * spacing - halfH;
        const y = 0;

        positions[ptr++] = x;
        positions[ptr++] = y;
        positions[ptr++] = z;

        // Soft bluish color gradient that works with dark gradient bg
        const base = 0.55 + (r / rows) * 0.35;
        colors[cptr++] = 0.35 * base; // R
        colors[cptr++] = 0.55 * base; // G
        colors[cptr++] = 1.0 * base; // B
      }
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.waveBasePositions = positions.slice(0); // keep copy of base positions
    this.waveGeometry = geo;

    const mat = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    points.position.set(0, -2.0, -6.0); // push it back and slightly down
    points.rotation.x = -0.35; // tilt for perspective

    this.root.add(points);
    this.wavePoints = points;
  }
}


