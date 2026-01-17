// World generation and tile types

export type TileType = 'land' | 'water' | 'stone' | 'sand';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface WorldData {
  name: string;
  seed: string;
  difficulty: Difficulty;
}

export interface Tile {
  type: TileType;
  x: number;
  y: number;
}

export interface WorldConfig {
  chunkSize: number;
  tileSize: number;
  viewDistance: number;
}

export interface Chunk {
  x: number;
  y: number;
  tiles: Tile[][];
}

export interface ChunkKey {
  x: number;
  y: number;
}

// Difficulty now only affects gameplay mechanics (resources, enemy behavior, etc.)
// Map generation is identical across all difficulties
export interface DifficultySettings {
  resourceMultiplier: number;    // How many resources spawn
  enemySpawnRate: number;         // How frequently enemies spawn
  enemyHealthMultiplier: number;  // Enemy health scaling
  playerDamageMultiplier: number; // Player damage output
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: {
    resourceMultiplier: 1.5,
    enemySpawnRate: 0.7,
    enemyHealthMultiplier: 0.8,
    playerDamageMultiplier: 1.2
  },
  medium: {
    resourceMultiplier: 1.0,
    enemySpawnRate: 1.0,
    enemyHealthMultiplier: 1.0,
    playerDamageMultiplier: 1.0
  },
  hard: {
    resourceMultiplier: 0.6,
    enemySpawnRate: 1.4,
    enemyHealthMultiplier: 1.3,
    playerDamageMultiplier: 0.9
  }
};

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  chunkSize: 32,        // 32x32 tiles per chunk
  tileSize: 24,         // Tile size in pixels
  viewDistance: 2       // Load chunks 2 chunks away from camera
};