import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";

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
): Promise<THREE.Group> {
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

  // Use unlit material for maximum legibility and render above tubes
  const frontMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(opts.color),
    transparent: true,
    opacity: 0.98,
    depthTest: false,
  });

  const frontMesh = new THREE.Mesh(geometry, frontMaterial);
  frontMesh.castShadow = false;
  frontMesh.receiveShadow = false;
  frontMesh.renderOrder = 999;

  // Create a subtle outline by cloning geometry slightly scaled and darker color behind
  const outlineGeometry = geometry.clone();
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#0b1220"),
    transparent: true,
    opacity: 0.85,
    depthTest: false,
  });
  const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
  outlineMesh.scale.multiplyScalar(1.015);
  outlineMesh.position.z = -0.01; // sit just behind
  outlineMesh.renderOrder = 998;

  const group = new THREE.Group();
  group.add(outlineMesh);
  group.add(frontMesh);
  return group;
}
