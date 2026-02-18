import { describe, it, expect, vi } from 'vitest';
import TextureGenerator from './TextureGenerator.js';

describe('TextureGenerator', () => {
  it('should generate all textures without crashing', () => {
    // Mock Graphics object with all used methods
    const mockGraphics = {
      fillStyle: vi.fn(),
      fillRect: vi.fn(),
      generateTexture: vi.fn(),
      lineStyle: vi.fn(),
      strokeRect: vi.fn(),
      fillCircle: vi.fn(),
      strokeCircle: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      strokePath: vi.fn(),
      strokeRoundedRect: vi.fn(),
      fill: vi.fn(),
      fillRoundedRect: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      fillGradientStyle: vi.fn(),
      fillEllipse: vi.fn(), // Added this
      // quadraticBezierTo is deliberately missing
    };

    const mockScene = {
      textures: {
        exists: vi.fn().mockReturnValue(false),
      },
      make: {
        graphics: vi.fn().mockReturnValue(mockGraphics),
      },
    };

    // Execute
    TextureGenerator.generate(mockScene);

    // Verifications
    // 1. Check if lineTo was called (used in createIronKatana fix)
    // We can't know for sure which call is which without more specific spies,
    // but at least we know it didn't crash.
    expect(mockGraphics.lineTo).toHaveBeenCalled();

    // 2. Ensure createIronKatana generated its texture
    expect(mockGraphics.generateTexture).toHaveBeenCalledWith('item_iron_katana', 32, 32);

    // 3. Ensure we reached the end (createShadow)
    expect(mockGraphics.generateTexture).toHaveBeenCalledWith('shadow', 32, 16);
  });

  it('should catch errors and not crash', () => {
    const mockGraphics = {
        fillStyle: vi.fn(),
        // Missing everything else, will throw
    };
    const mockScene = {
        textures: { exists: vi.fn().mockReturnValue(false) },
        make: { graphics: vi.fn().mockReturnValue(mockGraphics) },
    };

    // Spy on console.warn
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Should not throw
    expect(() => TextureGenerator.generate(mockScene)).not.toThrow();

    // Should have logged a warning
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('TextureGenerator: Failed'), expect.any(Error));

    consoleSpy.mockRestore();
  });
});
