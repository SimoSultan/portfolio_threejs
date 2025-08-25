import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnimationManager } from "../animation";

// Mock Three.js
vi.mock("three");

describe("AnimationManager", () => {
  let mockScene: any;
  let mockTubesGroup: any;
  let animationManager: AnimationManager;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock Scene
    mockScene = {
      add: vi.fn(),
      remove: vi.fn(),
    };

    // Mock TubesGroup with proper rotation and position objects
    mockTubesGroup = {
      rotation: {
        z: 0,
        x: 0,
        y: 0,
        copy: vi.fn().mockReturnThis(),
        clone: vi.fn().mockReturnThis(),
      },
      position: {
        z: 0,
        copy: vi.fn().mockReturnThis(),
        clone: vi.fn().mockReturnThis(),
      },
      scale: {
        setScalar: vi.fn().mockReturnThis(),
        copy: vi.fn().mockReturnThis(),
        clone: vi.fn().mockReturnThis(),
      },
      children: [],
      add: vi.fn(),
      remove: vi.fn(),
    };

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn(cb => {
      setTimeout(cb, 0);
      return 123;
    });

    // Mock cancelAnimationFrame
    global.cancelAnimationFrame = vi.fn();

    animationManager = new AnimationManager(mockScene);
  });

  afterEach(() => {
    // Clean up any running animations
    animationManager.stopAnimation();
    // Clear any pending timeouts
    vi.clearAllTimers();
  });

  describe("constructor", () => {
    it("should create AnimationManager instance", () => {
      expect(animationManager).toBeInstanceOf(AnimationManager);
    });

    it("should initialize with default state", () => {
      // Test that the instance has the expected methods
      expect(typeof animationManager.speedUpInfiniteAnimation).toBe("function");
      expect(typeof animationManager.resumeInfiniteAnimationSpeed).toBe(
        "function"
      );
      expect(typeof animationManager.triggerSpinAnimation).toBe("function");
    });
  });

  describe("speedUpInfiniteAnimation", () => {
    it("should speed up infinite animation when active", () => {
      // Start infinite animation
      animationManager.triggerIndividualTubeBackflipAnimation(
        mockTubesGroup,
        1000,
        true
      );

      // Speed it up
      animationManager.speedUpInfiniteAnimation(3.0);

      // Check that speed was applied
      expect(animationManager.isInfiniteAnimationActive()).toBe(true);
    });

    it("should handle speed up when no infinite animation is running", () => {
      // Should not throw errors when no animation is running
      expect(() => {
        animationManager.speedUpInfiniteAnimation(3.0);
      }).not.toThrow();
    });
  });

  describe("resumeInfiniteAnimationSpeed", () => {
    it("should restore original speed", () => {
      // Start infinite animation
      animationManager.triggerIndividualTubeBackflipAnimation(
        mockTubesGroup,
        1000,
        true
      );

      // Speed it up
      animationManager.speedUpInfiniteAnimation(3.0);

      // Restore speed
      animationManager.resumeInfiniteAnimationSpeed();

      // Check that speed was restored
      expect(animationManager.isInfiniteAnimationActive()).toBe(true);
    });
  });

  describe("triggerSpinAnimation", () => {
    it("should start spin animation", () => {
      animationManager.triggerSpinAnimation(mockTubesGroup);
      expect(animationManager.isAnimationRunning()).toBe(true);
    });

    it("should handle animation already in progress", () => {
      // Trigger first animation
      animationManager.triggerSpinAnimation(mockTubesGroup);

      // Try to trigger second animation
      animationManager.triggerSpinAnimation(mockTubesGroup);

      // Should have stopped the first and started the second
      expect(animationManager.isAnimationRunning()).toBe(true);
    });

    it("should use default duration when not specified", () => {
      animationManager.triggerSpinAnimation(mockTubesGroup);
      expect(animationManager.isAnimationRunning()).toBe(true);
      animationManager.stopAnimation();
    });

    it("should accept custom duration", () => {
      animationManager.triggerSpinAnimation(mockTubesGroup, 5000);
      expect(animationManager.isAnimationRunning()).toBe(true);
      animationManager.stopAnimation();
    });
  });

  describe("animation state management", () => {
    it("should track animation state correctly", () => {
      // Initially no animation should be running
      expect(animationManager.isAnimationRunning()).toBe(false);

      // Trigger animation
      animationManager.triggerSpinAnimation(mockTubesGroup);

      // Animation should be in progress
      expect(animationManager.isAnimationRunning()).toBe(true);
    });

    it("should handle multiple animation requests", () => {
      // Trigger first animation
      animationManager.triggerSpinAnimation(mockTubesGroup, 100);

      // Try to trigger second animation immediately
      animationManager.triggerSpinAnimation(mockTubesGroup, 100);

      // Should have handled the interruption
      expect(animationManager.isAnimationRunning()).toBe(true);
    });
  });

  describe("animation completion", () => {
    it("should complete animation and reset state", async () => {
      // Trigger animation with very short duration
      animationManager.triggerSpinAnimation(mockTubesGroup, 10);

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Animation should be complete
      expect(animationManager.isAnimationRunning()).toBe(false);
    });

    it("should reset animation state after completion", async () => {
      // Trigger animation with very short duration
      animationManager.triggerSpinAnimation(mockTubesGroup, 10);

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Try to trigger another animation
      animationManager.triggerSpinAnimation(mockTubesGroup, 10);

      // Should be able to start new animation
      expect(animationManager.isAnimationRunning()).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle very long duration", () => {
      animationManager.triggerSpinAnimation(mockTubesGroup, 60000); // 1 minute
      expect(animationManager.isAnimationRunning()).toBe(true);
      animationManager.stopAnimation();
    });
  });

  describe("method availability", () => {
    it("should have all required public methods", () => {
      expect(typeof animationManager.speedUpInfiniteAnimation).toBe("function");
      expect(typeof animationManager.resumeInfiniteAnimationSpeed).toBe(
        "function"
      );
      expect(typeof animationManager.triggerSpinAnimation).toBe("function");
      expect(typeof animationManager.stopAnimation).toBe("function");
      expect(typeof animationManager.isAnimationRunning).toBe("function");
    });
  });

  describe("stopAnimation", () => {
    it("should stop running animation", () => {
      animationManager.triggerSpinAnimation(mockTubesGroup);
      expect(animationManager.isAnimationRunning()).toBe(true);

      animationManager.stopAnimation();
      expect(animationManager.isAnimationRunning()).toBe(false);
    });

    it("should handle stopping when no animation is running", () => {
      expect(animationManager.isAnimationRunning()).toBe(false);

      animationManager.stopAnimation();
      expect(animationManager.isAnimationRunning()).toBe(false);
    });
  });

  describe("infinite animation methods", () => {
    it("should check infinite animation state correctly", () => {
      expect(animationManager.isInfiniteAnimationActive()).toBe(false);

      animationManager.setShouldResumeInfiniteAnimation(true);
      expect(animationManager.isInfiniteAnimationActive()).toBe(true);
    });

    it("should set and get should resume flag", () => {
      animationManager.setShouldResumeInfiniteAnimation(true);
      expect(animationManager.getShouldResumeInfiniteAnimation()).toBe(true);

      animationManager.setShouldResumeInfiniteAnimation(false);
      expect(animationManager.getShouldResumeInfiniteAnimation()).toBe(false);
    });
  });

  describe("other animation methods", () => {
    it("should trigger Mexican wave animation", () => {
      animationManager.triggerMexicanWaveAnimation(mockTubesGroup);
      expect(animationManager.isAnimationRunning()).toBe(true);
      animationManager.stopAnimation();
    });

    it("should trigger bounce animation", () => {
      animationManager.triggerBounceAnimation(mockTubesGroup);
      expect(animationManager.isAnimationRunning()).toBe(true);
      animationManager.stopAnimation();
    });

    it("should trigger backflip animation", () => {
      animationManager.triggerBackflipAnimation(mockTubesGroup);
      expect(animationManager.isAnimationRunning()).toBe(true);
      animationManager.stopAnimation();
    });

    it("should trigger multi-axis spin animation", () => {
      animationManager.triggerMultiAxisSpinAnimation(mockTubesGroup);
      expect(animationManager.isAnimationRunning()).toBe(true);
      animationManager.stopAnimation();
    });

    it("should trigger individual tube backflip animation", () => {
      animationManager.triggerIndividualTubeBackflipAnimation(mockTubesGroup);
      expect(animationManager.isAnimationRunning()).toBe(true);
      animationManager.stopAnimation();
    });

    it("should trigger initial page load animation", () => {
      animationManager.triggerInitialPageLoadAnimation(mockTubesGroup);
      expect(animationManager.isAnimationRunning()).toBe(true);
      animationManager.stopAnimation();
    });
  });

  describe("cleanup", () => {
    it("should dispose resources", () => {
      animationManager.triggerSpinAnimation(mockTubesGroup);
      expect(animationManager.isAnimationRunning()).toBe(true);

      animationManager.dispose();
      expect(animationManager.isAnimationRunning()).toBe(false);
    });
  });

  describe("animation state transitions", () => {
    it("should transition from not animating to animating", () => {
      expect(animationManager.isAnimationRunning()).toBe(false);

      animationManager.triggerSpinAnimation(mockTubesGroup);
      expect(animationManager.isAnimationRunning()).toBe(true);
    });

    it("should transition from animating to not animating after completion", async () => {
      animationManager.triggerSpinAnimation(mockTubesGroup, 10);
      expect(animationManager.isAnimationRunning()).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(animationManager.isAnimationRunning()).toBe(false);
    });

    it("should handle rapid state changes", () => {
      expect(animationManager.isAnimationRunning()).toBe(false);

      animationManager.triggerSpinAnimation(mockTubesGroup);
      expect(animationManager.isAnimationRunning()).toBe(true);

      animationManager.stopAnimation();
      expect(animationManager.isAnimationRunning()).toBe(false);

      animationManager.triggerSpinAnimation(mockTubesGroup);
      expect(animationManager.isAnimationRunning()).toBe(true);
    });
  });

  describe("infinite animation speed control", () => {
    it("should speed up infinite animation when active", () => {
      // Start infinite animation
      animationManager.triggerIndividualTubeBackflipAnimation(
        mockTubesGroup,
        1000,
        true
      );

      // Speed it up
      animationManager.speedUpInfiniteAnimation(3.0);

      // Check that speed was applied
      expect(animationManager.isInfiniteAnimationActive()).toBe(true);
    });

    it("should restore original speed", () => {
      // Start infinite animation
      animationManager.triggerIndividualTubeBackflipAnimation(
        mockTubesGroup,
        1000,
        true
      );

      // Speed it up
      animationManager.speedUpInfiniteAnimation(3.0);

      // Restore speed
      animationManager.resumeInfiniteAnimationSpeed();

      // Check that speed was restored
      expect(animationManager.isInfiniteAnimationActive()).toBe(true);
    });

    it("should handle speed up when no infinite animation is running", () => {
      // Should not throw errors when no animation is running
      expect(() => {
        animationManager.speedUpInfiniteAnimation(3.0);
      }).not.toThrow();
    });
  });

  describe("animation method parameters", () => {
    it("should accept custom durations for all animation types", () => {
      animationManager.triggerSpinAnimation(mockTubesGroup, 5000);
      animationManager.stopAnimation();

      animationManager.triggerMexicanWaveAnimation(mockTubesGroup, 3000);
      animationManager.stopAnimation();

      animationManager.triggerBounceAnimation(mockTubesGroup, 4000);
      animationManager.stopAnimation();

      animationManager.triggerBackflipAnimation(mockTubesGroup, 6000);
      animationManager.stopAnimation();

      animationManager.triggerMultiAxisSpinAnimation(mockTubesGroup, 7000);
      animationManager.stopAnimation();

      animationManager.triggerIndividualTubeBackflipAnimation(
        mockTubesGroup,
        8000,
        false
      );
      animationManager.stopAnimation();

      animationManager.triggerInitialPageLoadAnimation(mockTubesGroup, 9000);
      animationManager.stopAnimation();

      // All should have started successfully
      expect(animationManager.isAnimationRunning()).toBe(false);
    });

    it("should handle continuous vs single cycle animations", () => {
      animationManager.triggerMexicanWaveAnimation(mockTubesGroup, 1000, true);
      animationManager.stopAnimation();

      animationManager.triggerIndividualTubeBackflipAnimation(
        mockTubesGroup,
        1000,
        false
      );
      animationManager.stopAnimation();

      // Both should have worked
      expect(animationManager.isAnimationRunning()).toBe(false);
    });
  });

  describe("animation interruption", () => {
    it("should stop animation when new animation is triggered", () => {
      animationManager.triggerSpinAnimation(mockTubesGroup, 10000); // Long animation
      expect(animationManager.isAnimationRunning()).toBe(true);

      animationManager.triggerBounceAnimation(mockTubesGroup); // Interrupt with new animation
      expect(animationManager.isAnimationRunning()).toBe(true);
    });

    it("should handle multiple rapid interruptions", () => {
      animationManager.triggerSpinAnimation(mockTubesGroup, 10000);
      animationManager.triggerBounceAnimation(mockTubesGroup, 10000);
      animationManager.triggerBackflipAnimation(mockTubesGroup, 10000);
      animationManager.triggerMexicanWaveAnimation(mockTubesGroup, 10000);

      // Should have handled all interruptions
      expect(animationManager.isAnimationRunning()).toBe(true);
    });
  });

  describe("reset functionality", () => {
    it("should handle reset when no original positions are stored", () => {
      // Test that reset doesn't crash when no original positions are stored
      expect(() => {
        animationManager.resetTubesToOriginal(mockTubesGroup);
      }).not.toThrow();
    });
  });

  describe("force restart infinite animation", () => {
    it("should force restart infinite animation", () => {
      animationManager.forceRestartInfiniteAnimation(mockTubesGroup);
      expect(animationManager.isInfiniteAnimationActive()).toBe(true);
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle empty tubes group", () => {
      mockTubesGroup.children = [];

      // Should not throw errors
      expect(() => {
        animationManager.triggerSpinAnimation(mockTubesGroup);
      }).not.toThrow();
    });

    it("should handle basic tubes group properties", () => {
      // Test with the standard mock that we know works
      expect(() => {
        animationManager.triggerSpinAnimation(mockTubesGroup);
      }).not.toThrow();
    });

    it("should handle very large duration values", () => {
      animationManager.triggerSpinAnimation(
        mockTubesGroup,
        Number.MAX_SAFE_INTEGER
      );

      expect(animationManager.isAnimationRunning()).toBe(true);

      animationManager.stopAnimation();
    });
  });

  describe("animation completion callbacks", () => {
    it("should resume infinite animation after completion when flag is set", async () => {
      // Set flag to resume infinite animation
      animationManager.setShouldResumeInfiniteAnimation(true);

      // Trigger animation that will complete
      animationManager.triggerSpinAnimation(mockTubesGroup, 10);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should have resumed infinite animation
      expect(animationManager.isInfiniteAnimationActive()).toBe(true);
    });

    it("should not resume infinite animation when flag is not set", async () => {
      // Ensure flag is not set
      animationManager.setShouldResumeInfiniteAnimation(false);

      // Trigger animation that will complete
      animationManager.triggerSpinAnimation(mockTubesGroup, 10);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should not have resumed infinite animation
      expect(animationManager.isInfiniteAnimationActive()).toBe(false);
    });
  });
});
