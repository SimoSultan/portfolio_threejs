import * as THREE from "three";
// Import the font JSON locally to avoid network/CORS issues
// Vite supports JSON imports and tsconfig has resolveJsonModule enabled
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - no type defs for this JSON
import helvetiker from "three/examples/fonts/helvetiker_regular.typeface.json";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";

export type TitleTextOptions = {
  size?: number; // font size
  height?: number; // extrusion depth
  color?: string; // material color
  emissive?: string; // emissive color
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
  targetWidth?: number; // desired world-space width of the full text
};

const DEFAULTS: Required<TitleTextOptions> = {
  size: 0.2,
  height: 0.01,
  color: "#e5e7eb", // tailwind gray-200
  emissive: "#111827", // tailwind gray-900
  bevelEnabled: false,
  bevelThickness: 0.005,
  bevelSize: 0.003,
  bevelSegments: 1,
};

/**
 * Create a centered 3D text mesh for the title. Returns a Promise that resolves with the mesh.
 * The mesh's geometry is centered so its origin is at its visual center.
 */
export async function createTitleText(
  text: string,
  options: TitleTextOptions = {}
): Promise<THREE.Group> {
  const opts = { ...DEFAULTS, ...options };

  // Construct font from local JSON
  const font = new Font(helvetiker as any);

  const geometry = new TextGeometry(text, {
    font,
    size: opts.size,
    height: opts.height,
    curveSegments: 8,
    bevelEnabled: opts.bevelEnabled,
    bevelThickness: opts.bevelThickness,
    bevelSize: opts.bevelSize,
    bevelSegments: opts.bevelSegments,
  });

  // Center the geometry so it rotates around its own center
  geometry.computeBoundingBox();
  geometry.center();

  // Use unlit material for maximum legibility and render above tubes
  const frontMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(opts.color),
    transparent: true,
    opacity: 1.0,
    depthTest: false,
    side: THREE.DoubleSide,
  });

  const frontMesh = new THREE.Mesh(geometry, frontMaterial);
  frontMesh.castShadow = false;
  frontMesh.receiveShadow = false;
  frontMesh.renderOrder = 999;

  // Enforce a specific world-space width using Box3 so transforms are respected
  if (typeof opts.targetWidth === "number") {
    const box3 = new THREE.Box3().setFromObject(frontMesh);
    const size = new THREE.Vector3();
    box3.getSize(size);
    const currentWidth = Math.max(1e-6, size.x);
    const desiredWidth = Math.max(1e-6, opts.targetWidth);
    const uniformScale = desiredWidth / currentWidth;
    frontMesh.scale.set(uniformScale, uniformScale, 1);
  }

  const group = new THREE.Group();
  group.add(frontMesh);
  return group;
}

export class TitleManager {
  private static titleGroup: THREE.Group | null = null;

  static async attach(
    scene: THREE.Scene,
    circleGroup: THREE.Group,
    opts?: { text?: string; margin?: number }
  ): Promise<THREE.Group> {
    const text = opts?.text ?? "Simon Curran";
    const margin = opts?.margin ?? 0.9; // fraction of circle width

    // Compute the circle's world-space width using its bounding box
    const circleBox = new THREE.Box3().setFromObject(circleGroup);
    const circleSize = new THREE.Vector3();
    const circleCenter = new THREE.Vector3();
    circleBox.getSize(circleSize);
    circleBox.getCenter(circleCenter);

    const targetWidth = Math.max(1e-6, circleSize.x * margin);

    const group = await createTitleText(text, {
      targetWidth,
      size: 0.2,
      height: 0.01,
      color: "#ffffff",
      emissive: "#0b1220",
      bevelEnabled: false,
    });

    // Place near the circle center and slightly forward on Z to avoid depth fighting
    group.position.set(circleCenter.x, circleCenter.y, 0.02);
    scene.add(group);
    this.titleGroup = group;
    return group;
  }

  static remove(scene: THREE.Scene): void {
    if (this.titleGroup) {
      scene.remove(this.titleGroup);
      this.titleGroup = null;
    }
  }
}
