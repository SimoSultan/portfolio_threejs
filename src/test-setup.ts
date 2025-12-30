// Test setup for Vitest
import { afterEach, beforeEach, vi } from "vitest";

// Suppress console errors during tests to avoid noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Suppress expected errors during tests
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterEach(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

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

// Improved requestAnimationFrame mock with better cleanup
const originalRequestAnimationFrame = global.requestAnimationFrame;
const originalCancelAnimationFrame = global.cancelAnimationFrame;

let animationFrameId = 0;
const activeAnimationFrames = new Set<number>();

global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  animationFrameId++;
  activeAnimationFrames.add(animationFrameId);

  // Use setTimeout to simulate async behavior
  setTimeout(() => {
    if (activeAnimationFrames.has(animationFrameId)) {
      callback(performance.now());
      activeAnimationFrames.delete(animationFrameId);
    }
  }, 0);

  return animationFrameId;
});

global.cancelAnimationFrame = vi.fn((handle: number) => {
  activeAnimationFrames.delete(handle);
});

// Cleanup function for tests
export const cleanupAnimationFrames = () => {
  activeAnimationFrames.clear();
  animationFrameId = 0;
};
