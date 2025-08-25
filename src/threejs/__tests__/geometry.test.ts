import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MATERIAL_PROPERTIES } from "../constants";
import { CircleGeometry } from "../geometry";

// Mock Three.js
vi.mock("three");
vi.mock("../constants", () => ({
  MATERIAL_PROPERTIES: {
    EMISSIVE_INTENSITY: 0.4,
    METALNESS: 0.9,
    ROUGHNESS: 0.1,
  },
}));

// Mock utils
vi.mock("../utils", () => ({
  createTubeBetweenPoints: vi.fn().mockReturnValue({
    castShadow: false,
    add: vi.fn(),
    remove: vi.fn(),
  }),
}));

describe("CircleGeometry", () => {
  let mockGroup: any;
  let mockVector3: any;
  let mockColor: any;
  let mockMaterial: any;
  let mockTube: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock Group
    mockGroup = {
      add: vi.fn(),
      remove: vi.fn(),
      children: [],
    };

    // Mock Vector3
    mockVector3 = {
      x: 0,
      y: 0,
      z: 0,
    };

    // Mock Color
    mockColor = {
      clone: vi.fn().mockReturnThis(),
      lerp: vi.fn().mockReturnThis(),
      multiplyScalar: vi.fn().mockReturnThis(),
    };

    // Mock Material
    mockMaterial = {};

    // Mock Tube
    mockTube = {
      castShadow: false,
      add: vi.fn(),
      remove: vi.fn(),
    };

    // Mock THREE constructors
    (THREE.Group as any) = vi.fn().mockImplementation(() => mockGroup);
    (THREE.Vector3 as any) = vi.fn().mockImplementation((x, y, z) => ({
      ...mockVector3,
      x: x || 0,
      y: y || 0,
      z: z || 0,
    }));
    (THREE.Color as any) = vi.fn().mockImplementation(() => mockColor);
    (THREE.MeshStandardMaterial as any) = vi
      .fn()
      .mockImplementation(() => mockMaterial);

    // Mock Math functions - avoid infinite recursion
    const originalCos = Math.cos;
    const originalSin = Math.sin;
    global.Math.cos = vi.fn(x => originalCos(x));
    global.Math.sin = vi.fn(x => originalSin(x));
  });

  describe("buildCircle", () => {
    it("should create a group", () => {
      const result = CircleGeometry.buildCircle();

      expect(THREE.Group).toHaveBeenCalled();
      expect(result).toBe(mockGroup);
    });

    it("should create the correct number of points", () => {
      CircleGeometry.buildCircle();

      // Should create 91 segments (SEGMENTS constant)
      expect(THREE.Vector3).toHaveBeenCalledTimes(91);
    });

    it("should create points with correct radius", () => {
      CircleGeometry.buildCircle();

      // Check that points are created with radius 1.425
      const calls = (THREE.Vector3 as any).mock.calls;
      expect(calls.length).toBe(91);

      // Check first point (theta = 0) - cos(0) = 1, sin(0) = 0
      expect(calls[0][0]).toBeCloseTo(1.425, 5); // x = radius * cos(0)
      expect(calls[0][1]).toBeCloseTo(0, 5); // y = radius * sin(0)
      expect(calls[0][2]).toBe(0); // z = 0

      // Check point at approximately 90 degrees
      const quarterIndex = Math.floor(91 / 4); // This gives us index 22
      const angle = (quarterIndex / 91) * 2 * Math.PI;
      const expectedX = 1.425 * Math.cos(angle);
      const expectedY = 1.425 * Math.sin(angle);

      // Test that the point is at the calculated position for this angle
      expect(calls[quarterIndex][0]).toBeCloseTo(expectedX, 5);
      expect(calls[quarterIndex][1]).toBeCloseTo(expectedY, 5);
      expect(calls[quarterIndex][2]).toBe(0); // z = 0

      // Verify the radius is correct for this point
      const actualRadius = Math.sqrt(
        calls[quarterIndex][0] ** 2 + calls[quarterIndex][1] ** 2
      );
      expect(actualRadius).toBeCloseTo(1.425, 5);
    });

    it("should create materials with correct properties", () => {
      CircleGeometry.buildCircle();

      // Should create 91 materials (one for each tube)
      expect(THREE.MeshStandardMaterial).toHaveBeenCalledTimes(91);

      // Check material properties
      const materialCalls = (THREE.MeshStandardMaterial as any).mock.calls;
      materialCalls.forEach((call: any) => {
        const [options] = call;
        expect(options.emissiveIntensity).toBe(
          MATERIAL_PROPERTIES.EMISSIVE_INTENSITY
        );
        expect(options.metalness).toBe(MATERIAL_PROPERTIES.METALNESS);
        expect(options.roughness).toBe(MATERIAL_PROPERTIES.ROUGHNESS);
        expect(options.color).toBeDefined();
        expect(options.emissive).toBeDefined();
      });
    });

    it("should create tubes between consecutive points", async () => {
      const { createTubeBetweenPoints } = await import("../utils");
      (createTubeBetweenPoints as any).mockReturnValue(mockTube);

      CircleGeometry.buildCircle();

      // Should create 91 tubes (one for each segment)
      expect(createTubeBetweenPoints).toHaveBeenCalledTimes(91);

      // Check that tubes are added to the group
      expect(mockGroup.add).toHaveBeenCalledTimes(91);
    });

    it("should enable shadows on tubes", async () => {
      const { createTubeBetweenPoints } = await import("../utils");
      const mockTubeWithShadow = { ...mockTube, castShadow: false };
      (createTubeBetweenPoints as any).mockReturnValue(mockTubeWithShadow);

      CircleGeometry.buildCircle();

      // Check that castShadow is set to true
      expect(mockTubeWithShadow.castShadow).toBe(true);
    });

    it("should create seamless color gradient", () => {
      CircleGeometry.buildCircle();

      // Should create colors for gradient
      expect(THREE.Color).toHaveBeenCalledWith(0x87ceeb); // Light blue
      expect(THREE.Color).toHaveBeenCalledWith(0x4a90e2); // Medium blue
      expect(THREE.Color).toHaveBeenCalledWith(0x1e3a8a); // Deep blue
    });
  });

  describe("constants", () => {
    it("should use correct segment count", () => {
      CircleGeometry.buildCircle();

      // Should create exactly 91 segments
      expect(THREE.Vector3).toHaveBeenCalledTimes(91);
    });

    it("should use correct radius", () => {
      CircleGeometry.buildCircle();

      const calls = (THREE.Vector3 as any).mock.calls;
      // Check that radius is 1.425
      expect(calls[0]).toEqual([1.425, 0, 0]);
    });

    it("should use correct tube radius", async () => {
      const { createTubeBetweenPoints } = await import("../utils");

      CircleGeometry.buildCircle();

      // Check that tubes are created with radius 0.03
      expect(createTubeBetweenPoints).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        0.03,
        expect.any(Object)
      );
    });
  });
});
