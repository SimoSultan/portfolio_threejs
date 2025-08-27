import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

export type TitleTextOptions = {
  size?: number; // font size
  height?: number; // extrusion depth
  color?: string; // material color
  emissive?: string; // emissive color
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
};

const DEFAULTS: Required<TitleTextOptions> = {
  size: 0.35,
  height: 0.05,
  color: "#e5e7eb", // tailwind gray-200
  emissive: "#111827", // tailwind gray-900
  bevelEnabled: true,
  bevelThickness: 0.01,
  bevelSize: 0.006,
  bevelSegments: 2,
};

/**
 * Create a centered 3D text mesh for the title. Returns a Promise that resolves with the mesh.
 * The mesh's geometry is centered so its origin is at its visual center.
 */
export async function createTitleText(
  text: string,
  options: TitleTextOptions = {}
): Promise<THREE.Mesh> {
  const opts = { ...DEFAULTS, ...options };

  const loader = new FontLoader();
  // Load a standard font from the Three.js CDN (keeps repo light). Consider bundling locally later.
  const font = await new Promise<THREE.Font>((resolve, reject) => {
    loader.load(
      "https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_regular.typeface.json",
      f => resolve(f),
      undefined,
      err => reject(err)
    );
  });

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

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(opts.color),
    emissive: new THREE.Color(opts.emissive),
    metalness: 0.2,
    roughness: 0.6,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 1; // ensure it renders above the background
  return mesh;
}


