import { describe, expect, it } from "vitest";

import { AVAILABLE_MODELS, DEFAULT_MODEL, MODEL_METADATA } from "../models";

describe("Models", () => {
  describe("AVAILABLE_MODELS", () => {
    it("should contain model configurations", () => {
      expect(AVAILABLE_MODELS).toBeDefined();
      expect(typeof AVAILABLE_MODELS).toBe("object");
      expect(Object.keys(AVAILABLE_MODELS).length).toBeGreaterThan(0);
    });

    it("should have required model properties", () => {
      Object.entries(AVAILABLE_MODELS).forEach(([modelId, config]) => {
        expect(config).toHaveProperty("name");
        expect(config).toHaveProperty("modelId");
        expect(config).toHaveProperty("maxLength");
        expect(config).toHaveProperty("temperature");

        expect(typeof config.name).toBe("string");
        expect(typeof config.modelId).toBe("string");
        expect(typeof config.maxLength).toBe("number");
        expect(typeof config.temperature).toBe("number");

        expect(config.name.length).toBeGreaterThan(0);
        expect(config.modelId.length).toBeGreaterThan(0);
        expect(config.maxLength).toBeGreaterThan(0);
        expect(config.temperature).toBeGreaterThanOrEqual(0);
        expect(config.temperature).toBeLessThanOrEqual(2);
      });
    });

    it("should have consistent modelId values", () => {
      Object.entries(AVAILABLE_MODELS).forEach(([modelId, config]) => {
        expect(config.modelId).toBe(modelId);
      });
    });

    it("should have reasonable temperature values", () => {
      Object.values(AVAILABLE_MODELS).forEach(config => {
        expect(config.temperature).toBeGreaterThanOrEqual(0);
        expect(config.temperature).toBeLessThanOrEqual(2);
      });
    });

    it("should have reasonable maxLength values", () => {
      Object.values(AVAILABLE_MODELS).forEach(config => {
        expect(config.maxLength).toBeGreaterThan(0);
        expect(config.maxLength).toBeLessThanOrEqual(10000);
      });
    });
  });

  describe("DEFAULT_MODEL", () => {
    it("should be defined", () => {
      expect(DEFAULT_MODEL).toBeDefined();
      expect(typeof DEFAULT_MODEL).toBe("string");
      expect(DEFAULT_MODEL.length).toBeGreaterThan(0);
    });

    it("should exist in AVAILABLE_MODELS", () => {
      expect(AVAILABLE_MODELS).toHaveProperty(DEFAULT_MODEL);
    });

    it("should be a valid model ID", () => {
      const defaultModelConfig = AVAILABLE_MODELS[DEFAULT_MODEL];
      expect(defaultModelConfig).toBeDefined();
      expect(defaultModelConfig.modelId).toBe(DEFAULT_MODEL);
    });
  });

  describe("MODEL_METADATA", () => {
    it("should contain metadata for all models", () => {
      expect(MODEL_METADATA).toBeDefined();
      expect(typeof MODEL_METADATA).toBe("object");

      // All available models should have metadata
      Object.keys(AVAILABLE_MODELS).forEach(modelId => {
        expect(MODEL_METADATA).toHaveProperty(modelId);
      });
    });

    it("should have required metadata properties", () => {
      Object.values(MODEL_METADATA).forEach(metadata => {
        expect(metadata).toHaveProperty("name");
        expect(metadata).toHaveProperty("size");

        expect(typeof metadata.name).toBe("string");
        expect(typeof metadata.size).toBe("string");

        expect(metadata.name.length).toBeGreaterThan(0);
        expect(metadata.size.length).toBeGreaterThan(0);
      });
    });

    it("should have consistent names with AVAILABLE_MODELS", () => {
      Object.entries(MODEL_METADATA).forEach(([modelId, metadata]) => {
        if (AVAILABLE_MODELS[modelId]) {
          expect(metadata.name).toBe(AVAILABLE_MODELS[modelId].name);
        }
      });
    });

    it("should have valid size formats", () => {
      Object.values(MODEL_METADATA).forEach(metadata => {
        // Size should be in format like "3B", "7B", "13B", "~1GB", etc.
        expect(metadata.size).toMatch(/^[~]?\d+[BKMGT]?B?$/);
      });
    });
  });

  describe("Model consistency", () => {
    it("should have same model IDs across all exports", () => {
      const availableModelIds = Object.keys(AVAILABLE_MODELS);
      const metadataModelIds = Object.keys(MODEL_METADATA);

      expect(availableModelIds).toEqual(metadataModelIds);
    });

    it("should have consistent naming across all exports", () => {
      Object.entries(AVAILABLE_MODELS).forEach(([modelId, config]) => {
        if (MODEL_METADATA[modelId]) {
          expect(config.name).toBe(MODEL_METADATA[modelId].name);
        }
      });
    });

    it("should have valid model configurations", () => {
      Object.entries(AVAILABLE_MODELS).forEach(([modelId, config]) => {
        // Model ID should be valid (allowing colons, dots, and other valid characters)
        expect(modelId).toMatch(/^[a-zA-Z0-9\-_:.]+$/);

        // Name should be valid (allowing parentheses, spaces, and dots)
        expect(config.name).toMatch(/^[a-zA-Z0-9\s\-_().]+$/);

        // Model ID should match
        expect(config.modelId).toBe(modelId);

        // Numeric values should be reasonable
        expect(config.maxLength).toBeGreaterThan(0);
        expect(config.maxLength).toBeLessThanOrEqual(10000);
        expect(config.temperature).toBeGreaterThanOrEqual(0);
        expect(config.temperature).toBeLessThanOrEqual(2);
      });
    });
  });

  describe("Specific model tests", () => {
    it("should have local model if present", () => {
      if (AVAILABLE_MODELS.local) {
        expect(AVAILABLE_MODELS.local.modelId).toBe("local");
        expect(AVAILABLE_MODELS.local.maxLength).toBeGreaterThan(0);
        expect(AVAILABLE_MODELS.local.temperature).toBeGreaterThanOrEqual(0);
      }
    });

    it("should have reasonable default model settings", () => {
      const defaultModel = AVAILABLE_MODELS[DEFAULT_MODEL];

      // Default model should have reasonable settings
      expect(defaultModel.maxLength).toBeGreaterThan(0);
      expect(defaultModel.maxLength).toBeLessThanOrEqual(10000);
      expect(defaultModel.temperature).toBeGreaterThanOrEqual(0);
      expect(defaultModel.temperature).toBeLessThanOrEqual(2);
    });

    it("should have unique model names", () => {
      const names = Object.values(AVAILABLE_MODELS).map(config => config.name);
      const uniqueNames = new Set(names);

      expect(names.length).toBe(uniqueNames.size);
    });

    it("should have unique model IDs", () => {
      const modelIds = Object.keys(AVAILABLE_MODELS);
      const uniqueModelIds = new Set(modelIds);

      expect(modelIds.length).toBe(uniqueModelIds.size);
    });
  });

  describe("Model validation", () => {
    it("should not have empty or invalid model IDs", () => {
      Object.keys(AVAILABLE_MODELS).forEach(modelId => {
        expect(modelId).toBeTruthy();
        expect(modelId.trim().length).toBeGreaterThan(0);
        expect(modelId).not.toContain(" ");
      });
    });

    it("should not have empty or invalid model names", () => {
      Object.values(AVAILABLE_MODELS).forEach(config => {
        expect(config.name).toBeTruthy();
        expect(config.name.trim().length).toBeGreaterThan(0);
        expect(config.name).not.toBe(" ");
      });
    });

    it("should have valid numeric ranges", () => {
      Object.values(AVAILABLE_MODELS).forEach(config => {
        expect(Number.isFinite(config.maxLength)).toBe(true);
        expect(Number.isFinite(config.temperature)).toBe(true);

        expect(config.maxLength).not.toBe(NaN);
        expect(config.temperature).not.toBe(NaN);

        expect(config.maxLength).not.toBe(Infinity);
        expect(config.temperature).not.toBe(Infinity);
        expect(config.maxLength).not.toBe(-Infinity);
        expect(config.temperature).not.toBe(-Infinity);
      });
    });
  });
});
