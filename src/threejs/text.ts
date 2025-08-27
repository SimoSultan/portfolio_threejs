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

  // Create a subtle outline by cloning geometry slightly scaled and darker color behind
  const outlineGeometry = geometry.clone();
  const group = new THREE.Group();
  group.add(frontMesh);
  return group;
}
