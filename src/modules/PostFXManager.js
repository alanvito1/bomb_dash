export default class PostFXManager {
  static getEnabled() {
    const stored = localStorage.getItem('retro_filter');
    return stored !== 'false'; // Default to true if not set
  }

  static setEnabled(enabled) {
    localStorage.setItem('retro_filter', enabled);
  }

  /**
   * Toggles the Retro Filter state and applies/removes effects immediately.
   * @param {Phaser.Scene} scene - The scene to apply/remove effects on.
   * @returns {boolean} The new enabled state.
   */
  static toggle(scene) {
    const newState = !this.getEnabled();
    this.setEnabled(newState);

    if (newState) {
      this.apply(scene);
    } else {
      this.remove(scene);
    }
    return newState;
  }

  /**
   * Initializes the effect on a scene based on stored preference.
   * call this in scene.create()
   * @param {Phaser.Scene} scene
   */
  static init(scene) {
    if (this.getEnabled()) {
      this.apply(scene);
    }
  }

  static apply(scene) {
    if (!scene || !scene.cameras || !scene.cameras.main) return;

    // Ensure we don't double apply
    this.remove(scene);

    // [HOTFIX] Production Bug Bash
    // Disable native PostFX due to "addScanlines is not a function" crash on some devices/versions.
    // Forcing Graphics Fallback for stability.
    /*
    if (scene.cameras.main.postFX) {
      try {
        // Scanlines (Black lines)
        scene.scanlinesEffect = scene.cameras.main.postFX.addScanlines();
        scene.scanlinesEffect.intensity = 0.5;

        // Vignette (Dark corners)
        scene.vignetteEffect = scene.cameras.main.postFX.addVignette(
          0.5,
          0.5,
          0.9,
          0.4
        );
      } catch (e) {
        console.warn('PostFX not supported or failed:', e);
        this.applyFallback(scene);
      }
    } else {
      this.applyFallback(scene);
    }
    */

    // Force Fallback
    this.applyFallback(scene);
  }

  static remove(scene) {
    if (!scene) return;

    // Remove PostFX
    if (scene.cameras?.main?.postFX) {
      if (scene.scanlinesEffect) {
        try {
            scene.cameras.main.postFX.remove(scene.scanlinesEffect);
        } catch (e) { /* ignore */ }
        scene.scanlinesEffect = null;
      }
      if (scene.vignetteEffect) {
        try {
            scene.cameras.main.postFX.remove(scene.vignetteEffect);
        } catch (e) { /* ignore */ }
        scene.vignetteEffect = null;
      }
    }

    // Remove Fallback Overlay
    if (scene.crtOverlay) {
      scene.crtOverlay.destroy();
      scene.crtOverlay = null;
    }
  }

  static applyFallback(scene) {
    if (scene.crtOverlay) return; // Already applied

    // Create a persistent Graphics object fixed to camera
    const overlay = scene.add.graphics();
    overlay.setScrollFactor(0);
    overlay.setDepth(9999); // Top most

    const width = scene.scale.width;
    const height = scene.scale.height;

    // Scanlines
    overlay.fillStyle(0x000000, 0.15);
    for (let y = 0; y < height; y += 4) {
      overlay.fillRect(0, y, width, 2);
    }

    // Vignette (Simulated with dark borders)
    overlay.fillStyle(0x000000, 0.3);
    const borderSize = 50;
    overlay.fillRect(0, 0, width, borderSize); // Top
    overlay.fillRect(0, height - borderSize, width, borderSize); // Bottom
    overlay.fillRect(0, 0, borderSize, height); // Left
    overlay.fillRect(width - borderSize, 0, borderSize, height); // Right

    scene.crtOverlay = overlay;
  }
}
