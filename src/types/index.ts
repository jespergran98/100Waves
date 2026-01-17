// src/types/index.ts

// Re-export all types for centralized imports
export type { 
  TileType, 
  Difficulty, 
  WorldData, 
  Tile, 
  WorldConfig, 
  DifficultySettings,
  Chunk,
  ChunkKey,
  Block,
  BiomeRarity
} from './world.types';

export { 
  DIFFICULTY_SETTINGS, 
  DEFAULT_WORLD_CONFIG,
  BIOME_RARITY
} from './world.types';

// Rendering types
export type {
  Camera,
  ViewportBounds,
  ChunkTexture,
  RenderStats
} from './rendering.types';

// Additional types for better type safety
export interface GameState {
  type: 'menu' | 'worldCreationMenu' | 'playing' | 'settings';
}

export interface AudioContextRef {
  current: AudioContext | null;
}

export interface MousePosition {
  x: number;
  y: number;
}

export interface CameraOffset {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  size: number;
}