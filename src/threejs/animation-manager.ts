import * as THREE from "three";

export class AnimationManager {
  private isAnimating: boolean = false;
  private currentAnimationId?: number;
  private originalPositions: THREE.Vector3[] | undefined;
  private originalScales: THREE.Vector3[] | undefined;

  constructor(_scene: THREE.Scene) {
    // Scene parameter kept for future use (e.g., adding particles, effects)
    // Currently not used but will be useful for scene-wide animations
  }

  /**
   * Trigger a spin animation (unused for now)
   * @param tubesGroup - The group containing the circle tubes
   * @param duration - Animation duration in milliseconds (default: 2000ms)
   */
  public triggerSpinAnimation(
    tubesGroup: THREE.Group,
    duration: number = 2000
  ): void {
    if (this.isAnimating) {
      console.log("⚠️ Animation already in progress, skipping...");
      return;
    }

    console.log("🌀 Starting spin animation...");
    this.isAnimating = true;

    // Store original rotation
    const originalRotation = tubesGroup.rotation.clone();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      // Update rotation - exactly 2π (360°) for seamless loop
      tubesGroup.rotation.z = originalRotation.z + Math.PI * 2 * easedProgress;

      if (progress < 1) {
        this.currentAnimationId = requestAnimationFrame(animate);
      } else {
        // Animation complete - ensure exact reset to original rotation
        tubesGroup.rotation.copy(originalRotation);
        this.isAnimating = false;
        this.currentAnimationId = undefined;
        console.log("✅ Spin animation complete");
      }
    };

    animate();
  }

  /**
   * Trigger a Mexican wave animation - tubes extend outward and increase radius
   * @param tubesGroup - The group containing the circle tubes
   * @param duration - Animation duration in milliseconds (default: 2000ms)
   * @param continuous - Whether to run continuously until stopped (default: false)
   */
  public triggerMexicanWaveAnimation(
    tubesGroup: THREE.Group,
    duration: number = 2000,
    continuous: boolean = false
  ): void {
    if (this.isAnimating) {
      console.log("⚠️ Animation already in progress, stopping current animation...");
      this.stopAnimation();
    }

    console.log(`🌊 Starting Mexican wave animation (${continuous ? 'continuous' : 'single cycle'})...`);
    this.isAnimating = true;

    const startTime = Date.now();
    const tubes = tubesGroup.children as THREE.Mesh[];
    const originalPositions: THREE.Vector3[] = [];
    const originalScales: THREE.Vector3[] = [];

    // Store original positions and scales
    tubes.forEach((tube) => {
      originalPositions.push(tube.position.clone());
      originalScales.push(tube.scale.clone());
    });

    // Store original positions and scales in the instance for reset
    this.originalPositions = originalPositions;
    this.originalScales = originalScales;

    const animate = () => {
      if (!this.isAnimating) return;

      const elapsed = Date.now() - startTime;
      
      let progress: number;
      if (continuous) {
        // For continuous mode, loop the animation
        progress = (elapsed % duration) / duration;
      } else {
        // For single cycle, progress from 0 to 1
        progress = Math.min(elapsed / duration, 1);
      }

      tubes.forEach((tube, index) => {
        // Create a continuous wave that moves around the circle
        // The wave affects exactly 5 tubes at a time as it travels
        const wavePosition = progress * tubes.length; // Wave position around the circle
        let distanceFromWave = index - wavePosition; // Reversed for opposite direction
        
        // Handle wrapping around the circle for clockwise movement
        if (distanceFromWave < 0) {
          distanceFromWave += tubes.length;
        }
        
        // Wave affects exactly 7 tubes (0 to 6 distance)
        const waveWidth = 6; // 7 tubes: 0, 1, 2, 3, 4, 5, 6
        if (distanceFromWave <= waveWidth && distanceFromWave >= 0) {
          // Create proper wave effect: intensity increases from edges to center
          // Use a parabolic function to create a wave shape
          const normalizedDistance = distanceFromWave / waveWidth; // 0 to 1
          
          // Create a wave shape: edges get lowest, center gets highest
          // Use a flatter bell curve that peaks in the middle
          // Power of 4 creates a flatter, more rounded bell curve
          const waveShape = 1 - Math.pow(2 * normalizedDistance - 1, 4);
          
          // Apply the wave shape with proper scaling
          const waveIntensity = 0.08 * waveShape;
          
          // Ensure radius only increases (never decreases)
          const radiusMultiplier = 1 + Math.max(0, waveIntensity);
          
          // Move tube outward from center based on wave
          const direction = originalPositions[index].clone().normalize();
          const newRadius = originalPositions[index].distanceTo(new THREE.Vector3(0, 0, 0)) * radiusMultiplier;
          tube.position.copy(direction.multiplyScalar(newRadius));
        } else {
          // Keep tubes at original position when not affected by wave
          tube.position.copy(originalPositions[index]);
        }
        
        // Keep original scale - no individual tube scaling
        tube.scale.copy(originalScales[index]);
      });

      if (continuous) {
        // For continuous mode, keep running until stopped
        this.currentAnimationId = requestAnimationFrame(animate);
      } else if (progress < 1) {
        // For single cycle, continue until complete
        this.currentAnimationId = requestAnimationFrame(animate);
      } else {
        // Animation complete - reset to original positions and scales
        tubes.forEach((tube, index) => {
          tube.position.copy(originalPositions[index]);
          tube.scale.copy(originalScales[index]);
        });
        this.isAnimating = false;
        this.currentAnimationId = undefined;
        console.log("✅ Mexican wave animation complete");
      }
    };

    animate();
  }

  /**
   * Trigger a bounce animation - circle radius increases and decreases
   * @param tubesGroup - The group containing the circle tubes
   * @param duration - Animation duration in milliseconds (default: 2000ms)
   */
  public triggerBounceAnimation(
    tubesGroup: THREE.Group,
    duration: number = 2000
  ): void {
    if (this.isAnimating) {
      console.log("⚠️ Animation already in progress, skipping...");
      return;
    }

    console.log("🦘 Starting bounce animation...");
    this.isAnimating = true;

    const startTime = Date.now();
    const tubes = tubesGroup.children as THREE.Mesh[];
    const originalPositions: THREE.Vector3[] = [];
    const centerPosition = new THREE.Vector3(0, 0, 0); // Circle center

    // Store original positions
    tubes.forEach((tube) => {
      originalPositions.push(tube.position.clone());
    });

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Create bouncing radius effect - complete cycles that end at original radius
      const bounceFrequency = 1.5; // 1.5 complete bounce cycles
      const radiusBounce =
        Math.sin(progress * Math.PI * 2 * bounceFrequency) * 0.15; // Reduced magnitude
      const radiusMultiplier = 1 + radiusBounce;

      tubes.forEach((tube, index) => {
        // Calculate direction from center to original position
        const direction = originalPositions[index]
          .clone()
          .sub(centerPosition)
          .normalize();
        const originalRadius =
          originalPositions[index].distanceTo(centerPosition);

        // Apply radius bounce - expand/contract from center
        const newRadius = originalRadius * radiusMultiplier;
        tube.position
          .copy(centerPosition)
          .add(direction.multiplyScalar(newRadius));
      });

      if (progress < 1) {
        this.currentAnimationId = requestAnimationFrame(animate);
      } else {
        // Animation complete - ensure exact reset to original positions
        tubes.forEach((tube, index) => {
          tube.position.copy(originalPositions[index]);
        });
        this.isAnimating = false;
        this.currentAnimationId = undefined;
        console.log("✅ Bounce animation complete");
      }
    };

    animate();
  }

  /**
   * Trigger a backflip animation - circle does a backflip while staying centered
   * @param tubesGroup - The group containing the circle tubes
   * @param duration - Animation duration in milliseconds (default: 2500ms)
   */
  public triggerBackflipAnimation(
    tubesGroup: THREE.Group,
    duration: number = 2500
  ): void {
    if (this.isAnimating) {
      console.log("⚠️ Animation already in progress, skipping...");
      return;
    }

    console.log("🤸 Starting backflip animation...");
    this.isAnimating = true;

    const startTime = Date.now();
    const originalRotation = tubesGroup.rotation.clone();
    const originalPosition = tubesGroup.position.clone();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-in-out function
      const easedProgress =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Backflip rotation (X-axis rotation) - exactly 2π for complete flip
      tubesGroup.rotation.x = originalRotation.x + Math.PI * 2 * easedProgress;

      // Slight forward movement during flip for realistic effect - complete cycle returns to start
      const forwardMovement = Math.sin(progress * Math.PI) * 0.3;
      tubesGroup.position.z = originalPosition.z + forwardMovement;

      if (progress < 1) {
        this.currentAnimationId = requestAnimationFrame(animate);
      } else {
        // Animation complete - ensure exact reset to original position and rotation
        tubesGroup.rotation.copy(originalRotation);
        tubesGroup.position.copy(originalPosition);
        this.isAnimating = false;
        this.currentAnimationId = undefined;
        console.log("✅ Backflip animation complete");
      }
    };

    animate();
  }

  /**
   * Trigger a multi-axis spin animation - spins on all axes while staying centered
   * @param tubesGroup - The group containing the circle tubes
   * @param duration - Animation duration in milliseconds (default: 3000ms)
   */
  public triggerMultiAxisSpinAnimation(
    tubesGroup: THREE.Group,
    duration: number = 3000
  ): void {
    if (this.isAnimating) {
      console.log("⚠️ Animation already in progress, skipping...");
      return;
    }

    console.log("🎡 Starting multi-axis spin animation...");
    this.isAnimating = true;

    const startTime = Date.now();
    const originalRotation = tubesGroup.rotation.clone();
    // Position stays constant during multi-axis spin

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing function
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      // Spin on all axes with different complete rotations
      tubesGroup.rotation.x = originalRotation.x + Math.PI * 2 * easedProgress; // 1 full rotation
      tubesGroup.rotation.y = originalRotation.y + Math.PI * 4 * easedProgress; // 2 full rotations
      tubesGroup.rotation.z = originalRotation.z + Math.PI * 6 * easedProgress; // 3 full rotations

      if (progress < 1) {
        this.currentAnimationId = requestAnimationFrame(animate);
      } else {
        // Animation complete - reset to original rotation
        tubesGroup.rotation.copy(originalRotation);
        this.isAnimating = false;
        this.currentAnimationId = undefined;
        console.log("✅ Multi-axis spin animation complete");
      }
    };

    animate();
  }

  /**
   * Trigger individual tube backflip animation - each tube spins on its own axis
   * @param tubesGroup - The group containing the circle tubes
   * @param duration - Animation duration in milliseconds (default: 3000ms)
   * @param continuous - Whether to run continuously until stopped (default: false)
   */
  public triggerIndividualTubeBackflipAnimation(
    tubesGroup: THREE.Group,
    duration: number = 3000,
    continuous: boolean = false
  ): void {
    if (this.isAnimating) {
      console.log("⚠️ Animation already in progress, stopping current animation...");
      this.stopAnimation();
    }

    console.log(`🤸 Starting individual tube backflip animation (${continuous ? 'continuous' : 'single cycle'})...`);
    this.isAnimating = true;

    const startTime = Date.now();
    const tubes = tubesGroup.children as THREE.Mesh[];
    const originalRotations: THREE.Euler[] = [];
    const originalPositions: THREE.Vector3[] = [];

    // Store original rotations and positions
    tubes.forEach((tube) => {
      originalRotations.push(tube.rotation.clone());
      originalPositions.push(tube.position.clone());
    });

    // Store original positions and scales in the instance for reset
    this.originalPositions = originalPositions;
    this.originalScales = originalRotations.map(() => new THREE.Vector3(1, 1, 1)); // Default scales

    const animate = () => {
      if (!this.isAnimating) return;

      const elapsed = Date.now() - startTime;
      
      let progress: number;
      if (continuous) {
        // For continuous mode, loop the animation
        progress = (elapsed % duration) / duration;
      } else {
        // For single cycle, progress from 0 to 1
        progress = Math.min(elapsed / duration, 1);
      }

      tubes.forEach((tube, index) => {
        // Each tube rotates on its own axis (X-axis for backflip effect)
        // Add some variation to make it more interesting
        const individualDelay = (index / tubes.length) * 0.3; // Stagger the animation
        const adjustedProgress = Math.max(0, Math.min(1, (progress - individualDelay) / (1 - individualDelay)));
        
        if (adjustedProgress > 0) {
          const easedIndividualProgress =
            adjustedProgress < 0.5
              ? 2 * adjustedProgress * adjustedProgress
              : 1 - Math.pow(-2 * adjustedProgress + 2, 2) / 2;

          // Rotate each tube on its own axis for backflip effect
          tube.rotation.x = originalRotations[index].x + Math.PI * 2 * easedIndividualProgress;
          
          // Add slight wobble for more dynamic effect
          tube.rotation.z = originalRotations[index].z + Math.sin(adjustedProgress * Math.PI * 4) * 0.1;
        }
      });

      if (continuous) {
        // For continuous mode, keep running until stopped
        this.currentAnimationId = requestAnimationFrame(animate);
      } else if (progress < 1) {
        // For single cycle, continue until complete
        this.currentAnimationId = requestAnimationFrame(animate);
      } else {
        // Animation complete - reset to original rotations
        tubes.forEach((tube, index) => {
          tube.rotation.copy(originalRotations[index]);
        });
        this.isAnimating = false;
        this.currentAnimationId = undefined;
        console.log("✅ Individual tube backflip animation complete");
      }
    };

    animate();
  }

  /**
   * Stop any currently running animation
   */
  public stopAnimation(): void {
    if (this.currentAnimationId) {
      cancelAnimationFrame(this.currentAnimationId);
      this.currentAnimationId = undefined;
      this.isAnimating = false;
      
      // Reset all tubes to their original positions and scales
      if (this.originalPositions && this.originalScales) {
        console.log("⏹️ Animation stopped - tubes will be reset on next animation");
      }
      
      console.log("⏹️ Animation stopped");
    }
  }

  /**
   * Reset tubes to their original positions and scales
   * @param tubesGroup - The group containing the circle tubes
   */
  public resetTubesToOriginal(tubesGroup: THREE.Group): void {
    if (this.originalPositions && this.originalScales) {
      const tubes = tubesGroup.children as THREE.Mesh[];
      tubes.forEach((tube, index) => {
        if (this.originalPositions && this.originalScales && 
            index < this.originalPositions.length && 
            index < this.originalScales.length) {
          tube.position.copy(this.originalPositions[index]);
          tube.scale.copy(this.originalScales[index]);
        }
      });
      console.log("🔄 Tubes reset to original positions and scales");
    } else {
      // Fallback: reset to default circle positions
      const tubes = tubesGroup.children as THREE.Mesh[];
      const SEGMENTS = 96;
      const RADIUS = 1.5;
      
      tubes.forEach((tube, index) => {
        const theta = (index / SEGMENTS) * Math.PI * 2;
        const x = Math.cos(theta) * RADIUS;
        const y = Math.sin(theta) * RADIUS;
        tube.position.set(x, y, 0);
        tube.scale.setScalar(1);
      });
      console.log("🔄 Tubes reset to default circle positions");
    }
  }

  /**
   * Check if an animation is currently running
   */
  public isAnimationRunning(): boolean {
    return this.isAnimating;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stopAnimation();
  }
}
