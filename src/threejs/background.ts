import * as THREE from "three";

export type BackgroundMode = "none" | "wave" | "particles";

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

  // Particles-specific data
  private particlePoints: THREE.Points | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleVelocities: Float32Array | null = null;

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
      case "particles":
        this.createParticles();
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

    if (
      this.mode === "particles" &&
      this.particlePoints &&
      this.particleGeometry &&
      this.particleVelocities
    ) {
      const dt = Math.min(this.clock.getDelta(), 0.033); // clamp delta
      const positions = this.particleGeometry.attributes.position.array as Float32Array;
      const velocities = this.particleVelocities;

      // Bounds for lifecycle (expanded horizontally, shallow depth, close to camera)
      const rangeX = 10; // fill full width
      const rangeY = 6;  // fill full height
      const rangeZ = 3;  // shallow field so particles stay near camera
      const spawnRadius = 0.12; // spawn near screen center

      for (let i = 0; i < positions.length; i += 3) {
        // Integrate
        positions[i] += velocities[i] * dt;
        positions[i + 1] += velocities[i + 1] * dt;
        positions[i + 2] += velocities[i + 2] * dt;

        // Keep XY velocity pointing away from center (never cross center)
        const dirLen = Math.hypot(positions[i], positions[i + 1]);
        const vxy = Math.hypot(velocities[i], velocities[i + 1]) || 0.001;
        if (dirLen > 1e-4) {
          const dx = positions[i] / dirLen;
          const dy = positions[i + 1] / dirLen;
          velocities[i] = dx * vxy;
          velocities[i + 1] = dy * vxy;
        }

        // Despawn if outside bounds and respawn near center with outward velocity
        if (
          Math.abs(positions[i]) > rangeX ||
          Math.abs(positions[i + 1]) > rangeY ||
          positions[i + 2] > 0 ||
          positions[i + 2] < -rangeZ
        ) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * spawnRadius;
          const dx = Math.cos(angle);
          const dy = Math.sin(angle);

          positions[i] = dx * radius;
          positions[i + 1] = dy * radius;
          positions[i + 2] = -Math.random() * rangeZ; // slightly behind camera

          const speedXY = 0.25 + Math.random() * 0.35;
          velocities[i] = dx * speedXY;
          velocities[i + 1] = dy * speedXY;
          velocities[i + 2] = 0.2 + Math.random() * 0.4; // forward drift
        }
      }

      this.particleGeometry.attributes.position.needsUpdate = true;
      if (this.root) {
        const t = this.clock.elapsedTime;
        this.root.rotation.z = Math.sin(t * 0.03) * 0.02;
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

    if (this.particleGeometry) {
      this.particleGeometry.dispose();
      this.particleGeometry = null;
    }
    this.particlePoints = null;
    this.particleVelocities = null;
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

  private createParticles(): void {
    if (!this.root) return;

    const count = 2000; // reduced density by ~50% for clarity
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    // Bounds for initialization
    const rangeX = 10;
    const rangeY = 6;
    const rangeZ = 3;

    let p = 0;
    let c = 0;
    for (let i = 0; i < count; i++) {
      const x = (Math.random() * 2 - 1) * rangeX;
      const y = (Math.random() * 2 - 1) * rangeY;
      const z = -Math.random() * rangeZ; // bias back

      positions[p++] = x;
      positions[p++] = y;
      positions[p++] = z;

      // Cool bluish-white palette
      const tint = 0.7 + Math.random() * 0.3;
      colors[c++] = 0.75 * tint; // R
      colors[c++] = 0.85 * tint; // G
      colors[c++] = 1.0 * tint; // B

      // Small drift velocities
      // Small drift velocities with forward bias
      const speed = 0.25 + Math.random() * 0.35;
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.2,
        0.2 + Math.random() * 0.4
      )
        .normalize()
        .multiplyScalar(speed);

      const vi = (i * 3) as number;
      velocities[vi] = dir.x;
      velocities[vi + 1] = dir.y;
      velocities[vi + 2] = dir.z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.022,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    points.position.set(0, 0, -1.2); // bring the particle field near the camera

    this.root.add(points);
    this.particlePoints = points;
    this.particleGeometry = geo;
    this.particleVelocities = velocities;
  }
}


