import { describe, it, expect, vi } from 'vitest';

// Mock Phaser (even if not used directly, importing TextureGenerator loads it)
vi.mock('phaser', () => {
  return {
    default: {
      Display: {
        Color: {
          HSLToColor: vi.fn().mockReturnValue({ color: 0xffffff }),
        },
      },
    },
  };
});

import TextureGenerator from './TextureGenerator.js';

describe('TextureGenerator Blocks', () => {
  it('should generate soft_block without crashing', () => {
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
      destroy: vi.fn(),
      clear: vi.fn(),
    };

    const mockScene = {
      textures: {
        exists: vi.fn().mockReturnValue(false),
      },
      make: {
        graphics: vi.fn().mockReturnValue(mockGraphics),
      },
    };

    TextureGenerator.createSoftBlock(mockScene);

    expect(mockGraphics.fillStyle).toHaveBeenCalledWith(0x8b4513); // Base Brown
    expect(mockGraphics.generateTexture).toHaveBeenCalledWith(
      'soft_block',
      32,
      32
    );
  });

  it('should generate hard_block without crashing', () => {
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
      destroy: vi.fn(),
      clear: vi.fn(),
    };

    const mockScene = {
      textures: {
        exists: vi.fn().mockReturnValue(false),
      },
      make: {
        graphics: vi.fn().mockReturnValue(mockGraphics),
      },
    };

    TextureGenerator.createHardBlock(mockScene);

    expect(mockGraphics.fillStyle).toHaveBeenCalledWith(0x444444); // Base Grey
    expect(mockGraphics.generateTexture).toHaveBeenCalledWith(
      'hard_block',
      32,
      32
    );
  });
});
