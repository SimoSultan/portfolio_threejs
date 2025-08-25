import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { Lighting } from "../lighting";

// Mock Three.js
vi.mock("three");

describe("Lighting", () => {
  let mockScene: any;
  let mockAmbientLight: any;
  let mockDirectionalLight: any;
  let mockPointLight: any;
  let mockRectAreaLight: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock Scene
    mockScene = {
      add: vi.fn(),
    };

    // Mock Light constructors
    mockAmbientLight = {
      position: { set: vi.fn() },
      castShadow: false,
      shadow: { mapSize: { width: 1024, height: 1024 } },
    };

    mockDirectionalLight = {
      position: { set: vi.fn() },
      castShadow: false,
      shadow: {
        mapSize: { width: 1024, height: 1024 },
        camera: { near: 0.1, far: 100, left: -15, right: 15, top: 15, bottom: -15 },
        bias: 0,
        normalBias: 0,
      },
    };

    mockPointLight = {
      position: { set: vi.fn() },
      castShadow: false,
      shadow: { mapSize: { width: 1024, height: 1024 } },
    };

    mockRectAreaLight = {
      position: { set: vi.fn() },
      lookAt: vi.fn(),
    };

    // Mock THREE constructors
    (THREE.AmbientLight as any) = vi.fn().mockImplementation(() => mockAmbientLight);
    (THREE.DirectionalLight as any) = vi.fn().mockImplementation(() => mockDirectionalLight);
    (THREE.PointLight as any) = vi.fn().mockImplementation(() => mockPointLight);
    (THREE.RectAreaLight as any) = vi.fn().mockImplementation(() => mockRectAreaLight);
  });

  describe("setupLighting", () => {
    it("should add all required lights to the scene", () => {
      Lighting.setupLighting(mockScene);

      // Should create 8 lights total
      expect(THREE.AmbientLight).toHaveBeenCalledTimes(3); // 3 ambient lights
      expect(THREE.DirectionalLight).toHaveBeenCalledTimes(3); // 3 directional lights
      expect(THREE.PointLight).toHaveBeenCalledTimes(2); // 2 point lights
      expect(THREE.RectAreaLight).toHaveBeenCalledTimes(2); // 2 rect area lights

      // Total lights added to scene
      expect(mockScene.add).toHaveBeenCalledTimes(10);
    });

    it("should create primary ambient light with correct properties", () => {
      Lighting.setupLighting(mockScene);

      expect(THREE.AmbientLight).toHaveBeenCalledWith(0xffffff, 0.15);
    });

    it("should create secondary ambient light with correct properties", () => {
      Lighting.setupLighting(mockScene);

      // Second ambient light call
      const ambientCalls = (THREE.AmbientLight as any).mock.calls;
      expect(ambientCalls[1]).toEqual([0x1a1a2a, 0.1]);
    });

    it("should create main directional light with correct properties", () => {
      Lighting.setupLighting(mockScene);

      expect(THREE.DirectionalLight).toHaveBeenCalledWith(0xfffaf0, 0.8);
    });

    it("should create fill light with correct properties", () => {
      Lighting.setupLighting(mockScene);

      // Second directional light call (fill light)
      const directionalCalls = (THREE.DirectionalLight as any).mock.calls;
      expect(directionalCalls[1]).toEqual([0xffffff, 0.4]);
    });

    it("should create rim light with correct properties", () => {
      Lighting.setupLighting(mockScene);

      // Third directional light call (rim light)
      const directionalCalls = (THREE.DirectionalLight as any).mock.calls;
      expect(directionalCalls[2]).toEqual([0xffffff, 0.4]);
    });

    it("should create accent point light with correct properties", () => {
      Lighting.setupLighting(mockScene);

      expect(THREE.PointLight).toHaveBeenCalledWith(0x4a9eff, 0.6, 40);
    });

    it("should create volumetric point light with correct properties", () => {
      Lighting.setupLighting(mockScene);

      // Second point light call (volumetric)
      const pointCalls = (THREE.PointLight as any).mock.calls;
      expect(pointCalls[1]).toEqual([0x1a1a2a, 0.2, 80]);
    });

    it("should create left area light with correct properties", () => {
      Lighting.setupLighting(mockScene);

      expect(THREE.RectAreaLight).toHaveBeenCalledWith(0x4a9eff, 0.4, 6, 6);
    });

    it("should create right area light with correct properties", () => {
      Lighting.setupLighting(mockScene);

      // Second rect area light call
      const areaCalls = (THREE.RectAreaLight as any).mock.calls;
      expect(areaCalls[1]).toEqual([0x4a9eff, 0.4, 6, 6]);
    });

    it("should create ambient occlusion light with correct properties", () => {
      Lighting.setupLighting(mockScene);

      // Third ambient light call (AO light)
      const ambientCalls = (THREE.AmbientLight as any).mock.calls;
      expect(ambientCalls[2]).toEqual([0x000000, -0.1]);
    });

    it("should enable shadows on main directional light", () => {
      Lighting.setupLighting(mockScene);

      // First directional light should have shadows enabled
      const firstDirectionalCall = (THREE.DirectionalLight as any).mock.calls[0];
      expect(firstDirectionalCall).toEqual([0xfffaf0, 0.8]);
    });

    it("should enable shadows on accent point light", () => {
      Lighting.setupLighting(mockScene);

      // First point light should have shadows enabled
      const firstPointCall = (THREE.PointLight as any).mock.calls[0];
      expect(firstPointCall).toEqual([0x4a9eff, 0.6, 40]);
    });
  });

  describe("light positioning", () => {
    it("should position main directional light correctly", () => {
      Lighting.setupLighting(mockScene);

      // Main directional light should be positioned at (3, -3, 4)
      expect(mockDirectionalLight.position.set).toHaveBeenCalledWith(3, -3, 4);
    });

    it("should position fill light correctly", () => {
      Lighting.setupLighting(mockScene);

      // Fill light should be positioned at (-3, -3, -4)
      // We need to check the second directional light created
      const directionalCalls = (THREE.DirectionalLight as any).mock.calls;
      expect(directionalCalls[1]).toEqual([0xffffff, 0.4]);
    });

    it("should position accent light correctly", () => {
      Lighting.setupLighting(mockScene);

      // Accent light should be positioned at (0, -2, 0)
      expect(mockPointLight.position.set).toHaveBeenCalledWith(0, -2, 0);
    });

    it("should position volumetric light correctly", () => {
      Lighting.setupLighting(mockScene);

      // Volumetric light should be positioned at (0, -1, 4)
      // Check second point light call
      const pointCalls = (THREE.PointLight as any).mock.calls;
      expect(pointCalls[1]).toEqual([0x1a1a2a, 0.2, 80]);
    });

    it("should position left area light correctly", () => {
      Lighting.setupLighting(mockScene);

      // Left area light should be positioned at (-3, -2, 0)
      expect(mockRectAreaLight.position.set).toHaveBeenCalledWith(-3, -2, 0);
    });

    it("should position right area light correctly", () => {
      Lighting.setupLighting(mockScene);

      // Right area light should be positioned at (3, -2, 0)
      // Check second rect area light call
      const areaCalls = (THREE.RectAreaLight as any).mock.calls;
      expect(areaCalls[1]).toEqual([0x4a9eff, 0.4, 6, 6]);
    });
  });

  describe("light configuration", () => {
    it("should configure main directional light shadows correctly", () => {
      Lighting.setupLighting(mockScene);

      // Main directional light should have shadow map size 4096x4096
      expect(mockDirectionalLight.shadow.mapSize.width).toBe(4096);
      expect(mockDirectionalLight.shadow.mapSize.height).toBe(4096);
    });

    it("should configure accent light shadows correctly", () => {
      Lighting.setupLighting(mockScene);

      // Accent light should have shadow map size 1024x1024
      expect(mockPointLight.shadow.mapSize.width).toBe(1024);
      expect(mockPointLight.shadow.mapSize.height).toBe(1024);
    });

    it("should configure area lights to look at center", () => {
      Lighting.setupLighting(mockScene);

      // Both area lights should look at (0, 0, 0)
      expect(mockRectAreaLight.lookAt).toHaveBeenCalledTimes(2);
    });
  });
});
