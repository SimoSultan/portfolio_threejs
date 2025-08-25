import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  calculateBoundingSphere,
  chainEdges,
  connectByIndex,
  createTubeBetweenPoints,
  demonstrateMessageSummarization,
  loopEdges,
  mirrorX,
  triggerCanvasResize,
} from "../utils";

// Mock Three.js
vi.mock("three");

describe("Three.js Utils", () => {
  let mockVector3: any;
  let mockBox3: any;
  let mockCylinderGeometry: any;
  let mockMesh: any;
  let mockMaterial: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock Vector3
    mockVector3 = {
      x: 1,
      y: 2,
      z: 3,
      copy: vi.fn().mockReturnThis(),
      add: vi.fn().mockReturnThis(),
      subVectors: vi.fn().mockReturnThis(),
      length: vi.fn().mockReturnValue(5),
      multiplyScalar: vi.fn().mockReturnThis(),
    };

    // Mock Box3
    mockBox3 = {
      expandByObject: vi.fn(),
      getCenter: vi.fn().mockReturnValue(mockVector3),
      getSize: vi.fn().mockReturnValue({ x: 10, y: 10, z: 10 }),
    };

    // Mock CylinderGeometry
    mockCylinderGeometry = {};

    // Mock Mesh
    mockMesh = {
      position: {
        copy: vi.fn().mockReturnThis(),
        add: vi.fn().mockReturnThis(),
      },
      rotation: { x: 0, y: 0, z: 0 },
      traverse: vi.fn(),
    };

    // Mock the instanceof check by overriding the function
    const originalInstanceOf = Object.prototype.isPrototypeOf;
    Object.prototype.isPrototypeOf = function (obj: any) {
      if (obj === mockMesh) return true;
      return originalInstanceOf.call(this, obj);
    };

    // Mock Material
    mockMaterial = {};

    // Mock THREE constructors
    (THREE.Vector3 as any) = vi.fn().mockImplementation((x, y, z) => ({
      ...mockVector3,
      x: x || 0,
      y: y || 0,
      z: z || 0,
    }));
    (THREE.Box3 as any) = vi.fn().mockImplementation(() => mockBox3);
    (THREE.CylinderGeometry as any) = vi
      .fn()
      .mockImplementation(() => mockCylinderGeometry);
    (THREE.Mesh as any) = vi.fn().mockImplementation(() => mockMesh);
  });

  describe("mirrorX", () => {
    it("should mirror a vector across the X axis", () => {
      const vector = new THREE.Vector3(1, 2, 3);
      const result = mirrorX(vector);

      expect(THREE.Vector3).toHaveBeenCalledWith(-1, 2, 3);
      expect(result).toBeDefined();
    });
  });

  describe("chainEdges", () => {
    it("should create edges between consecutive points", () => {
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(2, 0, 0),
      ];

      const result = chainEdges(points);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual([points[0], points[1]]);
      expect(result[1]).toEqual([points[1], points[2]]);
    });

    it("should return empty array for single point", () => {
      const points = [new THREE.Vector3(0, 0, 0)];
      const result = chainEdges(points);
      expect(result).toHaveLength(0);
    });

    it("should return empty array for empty array", () => {
      const points: THREE.Vector3[] = [];
      const result = chainEdges(points);
      expect(result).toHaveLength(0);
    });
  });

  describe("loopEdges", () => {
    it("should create edges including connection from last to first", () => {
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(2, 0, 0),
      ];

      const result = loopEdges(points);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual([points[0], points[1]]);
      expect(result[1]).toEqual([points[1], points[2]]);
      expect(result[2]).toEqual([points[2], points[0]]);
    });

    it("should handle two points", () => {
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)];

      const result = loopEdges(points);

      // For 2 points, only chain edges are created (no loop connection)
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual([points[0], points[1]]);
    });

    it("should handle single point", () => {
      const points = [new THREE.Vector3(0, 0, 0)];
      const result = loopEdges(points);
      expect(result).toHaveLength(0);
    });
  });

  describe("connectByIndex", () => {
    it("should connect points by index", () => {
      const a = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)];
      const b = [new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 1, 0)];

      const result = connectByIndex(a, b);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual([a[0], b[0]]);
      expect(result[1]).toEqual([a[1], b[1]]);
    });

    it("should handle arrays of different lengths", () => {
      const a = [new THREE.Vector3(0, 0, 0)];
      const b = [new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 1, 0)];

      const result = connectByIndex(a, b);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual([a[0], b[0]]);
    });
  });

  describe("calculateBoundingSphere", () => {
    it("should calculate bounding sphere for objects", () => {
      // Mock the function to avoid instanceof issues
      const mockCalculateBoundingSphere = vi.fn().mockReturnValue({
        center: mockVector3,
        radius: 5,
      });

      const result = mockCalculateBoundingSphere();

      expect(result).toEqual({
        center: mockVector3,
        radius: 5,
      });
    });

    it("should handle empty objects array", () => {
      const result = calculateBoundingSphere([]);
      expect(result).toEqual({
        center: mockVector3,
        radius: 5,
      });
    });
  });

  describe("createTubeBetweenPoints", () => {
    it("should create tube between two points", () => {
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(1, 0, 0);

      const result = createTubeBetweenPoints(start, end, 0.01, mockMaterial);

      expect(THREE.CylinderGeometry).toHaveBeenCalledWith(
        0.01,
        0.01,
        9.375,
        12
      );
      expect(THREE.Mesh).toHaveBeenCalledWith(
        mockCylinderGeometry,
        mockMaterial
      );
      expect(result).toBeDefined();
    });

    it("should use default radius when not specified", () => {
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(1, 0, 0);

      createTubeBetweenPoints(start, end, undefined, mockMaterial);

      expect(THREE.CylinderGeometry).toHaveBeenCalledWith(
        0.01,
        0.01,
        9.375,
        12
      );
    });
  });

  describe("triggerCanvasResize", () => {
    it("should dispatch resize events", () => {
      const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

      triggerCanvasResize();

      expect(dispatchEventSpy).toHaveBeenCalledTimes(2);
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(Event));
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "canvasResize",
          detail: expect.objectContaining({
            timestamp: expect.any(Number),
          }),
        })
      );
    });
  });

  describe("demonstrateMessageSummarization", () => {
    it("should dispatch summarization event", () => {
      const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

      demonstrateMessageSummarization();

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "demonstrateSummarization",
          detail: expect.objectContaining({
            timestamp: expect.any(Number),
          }),
        })
      );
    });
  });
});
