// Circle Geometry Constants
export const CIRCLE_GEOMETRY = {
  TUBE_RADIUS: 0.01,
} as const;

// Legacy face geometry constants (unused - we now use a simple circle)
// All face-related geometry has been removed since we're using a basic circle

// Colors and Materials
export const COLORS = {
  BACKGROUND: 0x0a0a0a, // Much darker background that matches the new gradient
  CIRCLE_WIREFRAME: 0x4a9eff,
  CIRCLE_EMISSIVE: 0x1e3a8a,
} as const;

export const MATERIAL_PROPERTIES = {
  METALNESS: 0.9,
  ROUGHNESS: 0.1,
  EMISSIVE_INTENSITY: 0.4,
} as const;
