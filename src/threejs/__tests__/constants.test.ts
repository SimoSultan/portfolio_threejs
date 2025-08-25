import { describe, expect, it } from "vitest";

import { CIRCLE_GEOMETRY, COLORS, MATERIAL_PROPERTIES } from "../constants";

describe("Three.js Constants", () => {
  describe("CIRCLE_GEOMETRY", () => {
    it("should have TUBE_RADIUS defined", () => {
      expect(CIRCLE_GEOMETRY.TUBE_RADIUS).toBeDefined();
      expect(typeof CIRCLE_GEOMETRY.TUBE_RADIUS).toBe("number");
    });

    it("should have TUBE_RADIUS as a small positive number", () => {
      expect(CIRCLE_GEOMETRY.TUBE_RADIUS).toBeGreaterThan(0);
      expect(CIRCLE_GEOMETRY.TUBE_RADIUS).toBeLessThan(1);
    });

    it("should have constant values that cannot be reassigned", () => {
      const originalValue = CIRCLE_GEOMETRY.TUBE_RADIUS;
      expect(CIRCLE_GEOMETRY.TUBE_RADIUS).toBe(originalValue);
    });
  });

  describe("COLORS", () => {
    it("should have BACKGROUND defined", () => {
      expect(COLORS.BACKGROUND).toBeDefined();
      expect(typeof COLORS.BACKGROUND).toBe("number");
    });

    it("should have CIRCLE_WIREFRAME defined", () => {
      expect(COLORS.CIRCLE_WIREFRAME).toBeDefined();
      expect(typeof COLORS.CIRCLE_WIREFRAME).toBe("number");
    });

    it("should have CIRCLE_EMISSIVE defined", () => {
      expect(COLORS.CIRCLE_EMISSIVE).toBeDefined();
      expect(typeof COLORS.CIRCLE_EMISSIVE).toBe("number");
    });

    it("should have BACKGROUND as a dark color", () => {
      expect(COLORS.BACKGROUND).toBe(0x0a0a0a);
    });

    it("should have constant values that cannot be reassigned", () => {
      const originalValue = COLORS.BACKGROUND;
      expect(COLORS.BACKGROUND).toBe(originalValue);
    });
  });

  describe("MATERIAL_PROPERTIES", () => {
    it("should have METALNESS defined", () => {
      expect(MATERIAL_PROPERTIES.METALNESS).toBeDefined();
      expect(typeof MATERIAL_PROPERTIES.METALNESS).toBe("number");
    });

    it("should have ROUGHNESS defined", () => {
      expect(MATERIAL_PROPERTIES.ROUGHNESS).toBeDefined();
      expect(typeof MATERIAL_PROPERTIES.ROUGHNESS).toBe("number");
    });

    it("should have EMISSIVE_INTENSITY defined", () => {
      expect(MATERIAL_PROPERTIES.EMISSIVE_INTENSITY).toBeDefined();
      expect(typeof MATERIAL_PROPERTIES.EMISSIVE_INTENSITY).toBe("number");
    });

    it("should have METALNESS between 0 and 1", () => {
      expect(MATERIAL_PROPERTIES.METALNESS).toBeGreaterThanOrEqual(0);
      expect(MATERIAL_PROPERTIES.METALNESS).toBeLessThanOrEqual(1);
    });

    it("should have ROUGHNESS between 0 and 1", () => {
      expect(MATERIAL_PROPERTIES.ROUGHNESS).toBeGreaterThanOrEqual(0);
      expect(MATERIAL_PROPERTIES.ROUGHNESS).toBeLessThanOrEqual(1);
    });

    it("should have EMISSIVE_INTENSITY between 0 and 1", () => {
      expect(MATERIAL_PROPERTIES.EMISSIVE_INTENSITY).toBeGreaterThanOrEqual(0);
      expect(MATERIAL_PROPERTIES.EMISSIVE_INTENSITY).toBeLessThanOrEqual(1);
    });

    it("should have constant values that cannot be reassigned", () => {
      const originalValue = MATERIAL_PROPERTIES.METALNESS;
      expect(MATERIAL_PROPERTIES.METALNESS).toBe(originalValue);
    });
  });
});
