// Test setup for Vitest
import { vi } from "vitest";

// Mock Three.js for testing
vi.mock("three", () => {
  const THREE = {
    Scene: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      background: null,
      children: [],
    })),
    PerspectiveCamera: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      lookAt: vi.fn(),
      aspect: 1,
      fov: 75,
      near: 0.1,
      far: 1000,
    })),
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      shadowMap: { enabled: false, type: null },
      toneMapping: null,
      toneMappingExposure: 1,
      outputColorSpace: null,
      domElement: document.createElement("canvas"),
    })),
    Color: vi.fn().mockImplementation(color => ({ color })),
    Group: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      children: [],
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    })),
    CylinderGeometry: vi.fn().mockImplementation(() => ({
      attributes: { position: { count: 0 } },
      dispose: vi.fn(),
    })),
    MeshBasicMaterial: vi.fn().mockImplementation(() => ({
      dispose: vi.fn(),
    })),
    Mesh: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      rotation: { set: vi.fn(), x: 0, y: 0, z: 0 },
      scale: { set: vi.fn(), x: 1, y: 1, z: 1 },
      add: vi.fn(),
      remove: vi.fn(),
    })),
    DirectionalLight: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn() },
      castShadow: false,
      shadow: { mapSize: { width: 1024, height: 1024 } },
    })),
    AmbientLight: vi.fn().mockImplementation(() => ({})),
    PCFSoftShadowMap: "PCFSoftShadowMap",
    ACESFilmicToneMapping: "ACESFilmicToneMapping",
    SRGBColorSpace: "SRGBColorSpace",
  };

  return THREE;
});

// Mock DOM elements
Object.defineProperty(window, "getComputedStyle", {
  value: () => ({
    getPropertyValue: () => "",
  }),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = vi.fn();
