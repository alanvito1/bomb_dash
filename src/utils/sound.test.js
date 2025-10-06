import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SoundManager from './sound.js';

// Mocking Phaser's global object for an isolated test environment
global.Phaser = {
  Math: {
    Clamp: (value, min, max) => Math.min(Math.max(value, min), max),
  },
};

// Create a fully controlled mock of localStorage
const mockLocalStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = value.toString();
  },
  clear() {
    this.store = {};
  },
};

describe('SoundManager', () => {
  let mockScene;
  let setItemSpy;

  beforeEach(() => {
    // Reset SoundManager's internal state
    SoundManager.initialized = false;
    SoundManager.music.clear();

    // Replace the global localStorage with our mock for the duration of the test
    vi.stubGlobal('localStorage', mockLocalStorage);

    // Clear the mock store before each test
    mockLocalStorage.clear();

    // Spy on our mock object's setItem method
    setItemSpy = vi.spyOn(mockLocalStorage, 'setItem');

    // Create a mock scene object
    mockScene = {
      sound: {
        volume: 1,
      },
    };
  });

  afterEach(() => {
    // Restore all mocks and globals
    vi.restoreAllMocks();
  });

  it('init() should initialize with default values', () => {
    SoundManager.init(mockScene);
    expect(SoundManager.masterVolume).toBe(1.0);
    expect(SoundManager.musicVolume).toBe(1.0);
    expect(SoundManager.sfxVolume).toBe(1.0);
  });

  it('init() should load existing values from the mocked localStorage', () => {
    mockLocalStorage.setItem('masterVolume', '0.5');
    mockLocalStorage.setItem('musicVolume', '0.75');
    mockLocalStorage.setItem('sfxVolume', '0.25');

    SoundManager.init(mockScene);

    expect(SoundManager.masterVolume).toBe(0.5);
    expect(SoundManager.musicVolume).toBe(0.75);
    expect(SoundManager.sfxVolume).toBe(0.25);
  });

  it('setMasterVolume() should update value and save to localStorage', () => {
    SoundManager.init(mockScene);
    SoundManager.setMasterVolume(mockScene, 0.8);

    expect(SoundManager.masterVolume).toBe(0.8);
    expect(mockLocalStorage.store.masterVolume).toBe('0.8');
    expect(setItemSpy).toHaveBeenCalledWith('masterVolume', 0.8);
  });

  it('setMusicVolume() should update value and save to localStorage', () => {
    SoundManager.init(mockScene);
    SoundManager.setMusicVolume(0.6);

    expect(SoundManager.musicVolume).toBe(0.6);
    expect(setItemSpy).toHaveBeenCalledWith('musicVolume', 0.6);
  });

  it('setSfxVolume() should update value and save to localStorage', () => {
    SoundManager.init(mockScene);
    SoundManager.setSfxVolume(0.4);

    expect(SoundManager.sfxVolume).toBe(0.4);
    expect(setItemSpy).toHaveBeenCalledWith('sfxVolume', 0.4);
  });

  it('should clamp volume values between 0 and 1', () => {
    SoundManager.init(mockScene);

    SoundManager.setMasterVolume(mockScene, 1.5);
    expect(SoundManager.masterVolume).toBe(1);
    expect(setItemSpy).toHaveBeenCalledWith('masterVolume', 1);

    SoundManager.setMusicVolume(-0.5);
    expect(SoundManager.musicVolume).toBe(0);
    expect(setItemSpy).toHaveBeenCalledWith('musicVolume', 0);
  });
});