import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SoundManager from './sound.js';

// Mocking Phaser's global object for an isolated test environment
global.Phaser = {
  Math: {
    Clamp: (value, min, max) => Math.min(Math.max(value, min), max),
  },
};

// Mock AudioContext
global.AudioContext = class {
  createOscillator() {
    return {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      type: '',
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    };
  }
  createGain() {
    return {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    };
  }
  get currentTime() {
    return 0;
  }
  get destination() {
    return {};
  }
};

describe('SoundManager Playback & Safety', () => {
  let mockScene;
  let consoleWarnSpy;

  beforeEach(() => {
    SoundManager.initialized = false;
    SoundManager.music.clear();

    // Spy on console.warn to verify we silenced it
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockScene = {
      cache: {
        audio: {
          exists: vi.fn(),
        },
      },
      sound: {
        add: vi.fn(),
        volume: 1,
        context: new AudioContext(),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('play() should fallback to synthetic sound SILENTLY if key is missing', () => {
    mockScene.cache.audio.exists.mockReturnValue(false);

    SoundManager.play(mockScene, 'missing_sound');

    // Check that we checked the cache
    expect(mockScene.cache.audio.exists).toHaveBeenCalledWith('missing_sound');

    // Check that we did NOT call scene.sound.add
    expect(mockScene.sound.add).not.toHaveBeenCalled();

    // Check that console.warn was NOT called (silenced as requested)
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('play() should guard against scene.sound.add returning null', () => {
    mockScene.cache.audio.exists.mockReturnValue(true);
    // Simulate scene.sound.add returning null despite key existing (rare Phaser edge case)
    mockScene.sound.add.mockReturnValue(null);

    // Should not throw
    expect(() => SoundManager.play(mockScene, 'existing_sound')).not.toThrow();

    expect(mockScene.sound.add).toHaveBeenCalledWith(
      'existing_sound',
      expect.any(Object)
    );
  });

  it('play() should play sound normally if exists and add succeeds', () => {
    const mockSound = {
      play: vi.fn(),
      isDecoded: true,
    };
    mockScene.cache.audio.exists.mockReturnValue(true);
    mockScene.sound.add.mockReturnValue(mockSound);

    SoundManager.play(mockScene, 'valid_sound');

    expect(mockSound.play).toHaveBeenCalled();
  });
});
