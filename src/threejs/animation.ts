import * as THREE from "three";

export class AnimationManager {
  private isAnimating: boolean = false;
  private currentAnimationId?: number;
  private originalPositions: THREE.Vector3[] | undefined;
  private originalScales: THREE.Vector3[] | undefined;
  private basePositions: THREE.Vector3[] | undefined; // stable baseline circle positions
  private shouldResumeInfiniteAnimation: boolean = false; // Flag to resume infinite animation after others finish
  private infiniteAnimationSpeed: number = 1.0; // Speed multiplier for infinite animation
  private originalInfiniteAnimationSpeed: number = 1.0; // Store original speed
  private isInfiniteAnimationRunning: boolean = false; // Track if infinite animation is running

  constructor(_scene: THREE.Scene) {
    // Scene parameter kept for future use (e.g., adding particles, effects)
    // Currently not used but will be useful for scene-wide animations
    // Prefixed with underscore to indicate intentional non-use
  }

  /**
   * Compute and cache the baseline circle positions (one-time) so wave animations
   * always return to a consistent radius even if interrupted.
   */
  private getOrComputeBasePositions(tubesGroup: THREE.Group): THREE.Vector3[] {
    if (
      this.basePositions &&
      this.basePositions.length === tubesGroup.children.length
    ) {
      return this.basePositions;
    }
    const tubes = tubesGroup.children as THREE.Mesh[];
    this.basePositions = tubes.map(t => (t.position as THREE.Vector3).clone());
    return this.basePositions;
  }

  /**
   * Speed up the infinite animation when user submits a prompt
   * @param speedMultiplier - Speed multiplier (default: 3.0 for 3x speed)
   */
  public speedUpInfiniteAnimation(speedMultiplier: number = 3.0): void {
    // Check if infinite animation is active (either running or should resume)
    if (this.isInfiniteAnimationActive()) {
      this.infiniteAnimationSpeed = speedMultiplier;
    }
  }

  /**
   * Resume infinite animation at original speed when chatbot responds
   */
  public resumeInfiniteAnimationSpeed(): void {
    this.infiniteAnimationSpeed = this.originalInfiniteAnimationSpeed;
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
      this.stopAnimation();
    }

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

        // Resume infinite animation if needed
        this.resumeInfiniteAnimation(tubesGroup);
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
    duration: number = 1000,
    continuous: boolean = false
  ): void {
    if (this.isAnimating) {
      this.stopAnimation();
    }

    this.isAnimating = true;

    const startTime = Date.now();
    const tubes = tubesGroup.children as THREE.Mesh[];
    const basePositions = this.getOrComputeBasePositions(tubesGroup);
    const originalScales: THREE.Vector3[] = [];

    // Store original positions and scales
    tubes.forEach(tube => {
      originalScales.push(tube.scale.clone());
    });

    // Store original positions and scales in the instance for reset
    this.originalPositions = basePositions;
    this.originalScales = originalScales;

    const animate = () => {
      if (!this.isAnimating) {
        return;
      }

      const elapsed = Date.now() - startTime;

      let progress: number;
      if (continuous) {
        // For continuous mode, loop the animation
        progress = (elapsed % duration) / duration;
      } else {
        // For single cycle, progress from 0 to 1
        progress = Math.min(elapsed / duration, 1);
      }

      // In the final phase of a single-cycle animation, gently settle tubes back to original radius
      const settleStart = 0.85; // begin settle at 85%
      let settleFactor = 1; // 1 = full wave displacement; 0 = fully settled
      if (!continuous && progress > settleStart) {
        const t = (progress - settleStart) / (1 - settleStart);
        const easeOut = 1 - Math.pow(1 - t, 3);
        settleFactor = 1 - easeOut; // decreases to 0 near the end
      }

      // In the initial phase, gently ramp up displacement from 0 to full
      const rampEnd = 0.15; // ramp up during first 15%
      let rampFactor = 1; // 0 = no displacement; 1 = full displacement
      if (!continuous && progress < rampEnd) {
        const t = progress / rampEnd;
        const easeIn = t * t; // simple ease-in
        rampFactor = easeIn;
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
          // During start/end, smoothly adjust outward displacement
          const effectiveFactor = rampFactor * settleFactor;
          const radiusMultiplier =
            1 + Math.max(0, waveIntensity) * effectiveFactor;

          // Move tube outward from center based on wave
          const direction = basePositions[index].clone().normalize();
          const newRadius =
            basePositions[index].distanceTo(new THREE.Vector3(0, 0, 0)) *
            radiusMultiplier;
          tube.position.copy(direction.multiplyScalar(newRadius));
        } else {
          // Keep tubes at original position when not affected by wave
          tube.position.copy(basePositions[index]);
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
          tube.position.copy(basePositions[index]);
          tube.scale.copy(originalScales[index]);
        });
        this.isAnimating = false;
        this.currentAnimationId = undefined;
        // Resume infinite animation if needed
        this.resumeInfiniteAnimation(tubesGroup);
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
      this.stopAnimation();
    }

    this.isAnimating = true;

    const startTime = Date.now();
    const tubes = tubesGroup.children as THREE.Mesh[];
    const originalPositions: THREE.Vector3[] = [];
    const centerPosition = new THREE.Vector3(0, 0, 0); // Circle center

    // Store original positions
    tubes.forEach(tube => {
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
        // Resume infinite animation if needed
        this.resumeInfiniteAnimation(tubesGroup);
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
      this.stopAnimation();
    }

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

      // Backflip: use negative rotation direction for this project’s semantics
      tubesGroup.rotation.x = originalRotation.x - Math.PI * 2 * easedProgress;

      // Slight backward movement during flip for symmetry
      const backwardMovement = -Math.sin(progress * Math.PI) * 0.3;
      tubesGroup.position.z = originalPosition.z + backwardMovement;

      if (progress < 1) {
        this.currentAnimationId = requestAnimationFrame(animate);
      } else {
        // Animation complete - ensure exact reset to original position and rotation
        tubesGroup.rotation.copy(originalRotation);
        tubesGroup.position.copy(originalPosition);
        this.isAnimating = false;
        this.currentAnimationId = undefined;
        // Resume infinite animation if needed
        this.resumeInfiniteAnimation(tubesGroup);
      }
    };

    animate();
  }

  /**
   * Trigger a frontflip animation - reverse of backflip
   * @param tubesGroup - The group containing the circle tubes
   * @param duration - Animation duration in milliseconds (default: 2500ms)
   */
  public triggerFrontflipAnimation(
    tubesGroup: THREE.Group,
    duration: number = 2500
  ): void {
    if (this.isAnimating) {
      this.stopAnimation();
    }

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

      // Frontflip: use positive rotation direction
      tubesGroup.rotation.x = originalRotation.x + Math.PI * 2 * easedProgress;

      // Slight forward movement during flip
      const forwardMovement = Math.sin(progress * Math.PI) * 0.3;
      tubesGroup.position.z = originalPosition.z + forwardMovement;

      if (progress < 1) {
        this.currentAnimationId = requestAnimationFrame(animate);
      } else {
        // Reset to original transform
        tubesGroup.rotation.copy(originalRotation);
        tubesGroup.position.copy(originalPosition);
        this.isAnimating = false;
        this.currentAnimationId = undefined;
        // Resume infinite animation if needed
        this.resumeInfiniteAnimation(tubesGroup);
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
      this.stopAnimation();
    }

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
        // Resume infinite animation if needed
        this.resumeInfiniteAnimation(tubesGroup);
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
    duration: number = 9000, // Further slowed down by 50% from 6000ms
    continuous: boolean = true // Changed to true for infinite loop
  ): void {
    if (this.isAnimating) {
      this.stopAnimation();
    }

    this.isAnimating = true;
    this.isInfiniteAnimationRunning = continuous;

    // If this is the initial infinite animation, set the original speed
    if (continuous && this.infiniteAnimationSpeed === 1.0) {
      this.originalInfiniteAnimationSpeed = 1.0;
    }

    const startTime = Date.now();
    const tubes = tubesGroup.children as THREE.Mesh[];
    const originalRotations: THREE.Euler[] = [];
    const originalPositions: THREE.Vector3[] = [];

    // Store original rotations and positions
    tubes.forEach(tube => {
      originalRotations.push(tube.rotation.clone());
      originalPositions.push(tube.position.clone());
    });

    // Store original positions and scales in the instance for reset
    this.originalPositions = originalPositions;
    this.originalScales = originalRotations.map(
      () => new THREE.Vector3(1, 1, 1)
    ); // Default scales

    const animate = () => {
      if (!this.isAnimating) {
        return;
      }

      const elapsed = Date.now() - startTime;

      // Add very slow spin to the entire circle
      if (continuous) {
        const slowSpinSpeed = 0.0001; // Very slow rotation (adjust this value to control speed)
        tubesGroup.rotation.z += slowSpinSpeed * this.infiniteAnimationSpeed;
      }

      tubes.forEach((tube, index) => {
        if (continuous) {
          // For continuous mode, use elapsed time directly for smooth continuous rotation
          const individualDelay = (index / tubes.length) * duration * 0.3; // Stagger the animation
          const adjustedElapsed = elapsed + individualDelay;

          // Calculate continuous rotation based on elapsed time with speed control
          const rotationCycles =
            (adjustedElapsed / duration) * this.infiniteAnimationSpeed;
          const continuousRotation = rotationCycles * Math.PI * 2;

          // Apply continuous rotation
          tube.rotation.x = originalRotations[index].x + continuousRotation;

          // Add slight wobble for more dynamic effect using continuous time with speed control
          tube.rotation.z =
            originalRotations[index].z +
            Math.sin(adjustedElapsed * 0.004 * this.infiniteAnimationSpeed) *
              0.1;

          // Add subtle bouncing effect to the infinite animation
          const bounceTime = adjustedElapsed * 0.002; // Slower bounce frequency
          const radiusBounce = Math.sin(bounceTime) * 0.08; // Gentle 8% radius change
          const radiusMultiplier = 1 + radiusBounce;

          // Apply radius bounce - expand/contract from center
          const centerPosition = new THREE.Vector3(0, 0, 0);
          const direction = originalPositions[index].clone().sub(centerPosition).normalize();
          const originalRadius = originalPositions[index].distanceTo(centerPosition);
          const newRadius = originalRadius * radiusMultiplier;
          
          tube.position.copy(centerPosition).add(direction.multiplyScalar(newRadius));
        } else {
          // For single cycle, use the original progress-based approach
          const progress = Math.min(elapsed / duration, 1);
          const individualDelay = (index / tubes.length) * 0.3;
          const adjustedProgress = Math.max(
            0,
            Math.min(1, (progress - individualDelay) / (1 - individualDelay))
          );

          if (adjustedProgress > 0) {
            const easedIndividualProgress =
              adjustedProgress < 0.5
                ? 2 * adjustedProgress * adjustedProgress
                : 1 - Math.pow(-2 * adjustedProgress + 2, 2) / 2;

            tube.rotation.x =
              originalRotations[index].x +
              Math.PI * 2 * easedIndividualProgress;
            tube.rotation.z =
              originalRotations[index].z +
              Math.sin(adjustedProgress * Math.PI * 4) * 0.1;
          }
        }
      });

      if (continuous) {
        // For continuous mode, keep running until stopped
        this.currentAnimationId = requestAnimationFrame(animate);
      } else if (elapsed < duration) {
        // For single cycle, continue until complete
        this.currentAnimationId = requestAnimationFrame(animate);
      } else {
        // Animation complete - reset to original rotations
        tubes.forEach((tube, index) => {
          tube.rotation.copy(originalRotations[index]);
        });
        this.isAnimating = false;
        this.currentAnimationId = undefined;
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

      // Don't reset infinite animation state - let the resume logic handle it
      // This ensures that speedUpInfiniteAnimation can work on subsequent calls

      // Reset all tubes to their original positions and scales
      // We rely on each animation's completion to restore positions smoothly
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
        if (
          this.originalPositions &&
          this.originalScales &&
          index < this.originalPositions.length &&
          index < this.originalScales.length
        ) {
          tube.position.copy(this.originalPositions[index]);
          tube.scale.copy(this.originalScales[index]);
        }
      });
      // Tubes reset to original positions and scales
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
      // Tubes reset to default circle positions
    }
  }

  /**
   * Check if an animation is currently running
   */
  public isAnimationRunning(): boolean {
    return this.isAnimating;
  }

  /**
   * Set flag to resume infinite animation after current animation completes
   */
  public setShouldResumeInfiniteAnimation(shouldResume: boolean): void {
    this.shouldResumeInfiniteAnimation = shouldResume;
  }

  /**
   * Check if infinite animation should be resumed
   */
  public getShouldResumeInfiniteAnimation(): boolean {
    return this.shouldResumeInfiniteAnimation;
  }

  /**
   * Check if infinite animation is currently active (either running or should resume)
   */
  public isInfiniteAnimationActive(): boolean {
    return (
      this.isInfiniteAnimationRunning || this.shouldResumeInfiniteAnimation
    );
  }

  /**
   * Log current animation state for debugging
   */
  public logAnimationState(): void {
    // Animation state logging removed
  }

  /**
   * Resume infinite individual tube backflip animation
   */
  public resumeInfiniteAnimation(tubesGroup: THREE.Group): void {
    if (this.shouldResumeInfiniteAnimation) {
      this.triggerIndividualTubeBackflipAnimation(tubesGroup);
      this.shouldResumeInfiniteAnimation = false;
      this.isInfiniteAnimationRunning = true;
      // Keep the current speed setting when resuming
    }
  }

  /**
   * Force restart the infinite animation (useful for ensuring it's running)
   */
  public forceRestartInfiniteAnimation(tubesGroup: THREE.Group): void {
    this.stopAnimation(); // Stop any current animation
    this.isInfiniteAnimationRunning = true;
    this.shouldResumeInfiniteAnimation = false;
    this.triggerIndividualTubeBackflipAnimation(tubesGroup);
  }

  /**
   * Initial page load animation - zoom in and spin the circle
   * @param tubesGroup - The group containing the circle tubes
   * @param duration - Animation duration in milliseconds (default: 3000ms)
   */
  public triggerInitialPageLoadAnimation(
    tubesGroup: THREE.Group,
    duration: number = 3000
  ): void {
    if (this.isAnimating) {
      this.stopAnimation();
    }

    this.isAnimating = true;

    const startTime = Date.now();
    const startScale = 0.1; // Start very small
    const endScale = 1.0; // End at normal size
    const startRotation = 0;
    const endRotation = Math.PI * 4; // 2 full rotations (720 degrees)

    // Set initial state
    tubesGroup.scale.setScalar(startScale);
    tubesGroup.rotation.z = startRotation;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      // Scale up from small to normal size
      const currentScale = startScale + (endScale - startScale) * easedProgress;
      tubesGroup.scale.setScalar(currentScale);

      // Rotate while scaling
      const currentRotation =
        startRotation + (endRotation - startRotation) * easedProgress;
      tubesGroup.rotation.z = currentRotation;

      if (progress < 1) {
        this.currentAnimationId = requestAnimationFrame(animate);
      } else {
        // Animation complete - ensure exact final state
        tubesGroup.scale.setScalar(endScale);
        tubesGroup.rotation.z = endRotation;
        this.isAnimating = false;
        this.currentAnimationId = undefined;

        // Start the infinite animation after the entrance animation
        this.triggerIndividualTubeBackflipAnimation(tubesGroup);
        this.setShouldResumeInfiniteAnimation(true);
      }
    };

    animate();
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stopAnimation();
  }
}
